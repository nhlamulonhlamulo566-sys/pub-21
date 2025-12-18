
'use server';

// Delay importing firebase-admin and the admin initializer until runtime
// inside the server action to avoid Next bundling server-only modules
// into client-side code during build.

interface VoidSalePayload {
  saleId: string;
  idToken: string;
}

export async function voidSaleAction(
  payload: VoidSalePayload
): Promise<{ success: boolean; error?: string }> {
  const { saleId, idToken } = payload;

  // Dynamically import the admin initializer and firestore helpers at runtime
  // so they are not resolved during client-side bundling.
  const { initializeFirebaseAdmin } = await import('@/firebase/server');
  const { Timestamp } = await import('firebase-admin/firestore');
  const { firestore: adminFirestore, auth: adminAuth } = initializeFirebaseAdmin();
  
  try {
    if (!idToken) {
      return { success: false, error: 'Authentication token is missing.' };
    }

    const decodedToken = await adminAuth.verifyIdToken(idToken);
    
    // In a real app, you'd check for an admin role via custom claims here.
    // e.g., if (decodedToken.role !== 'administrator') { throw new Error('Permission denied'); }

    const saleRef = adminFirestore.collection('sales').doc(saleId);
    const itemsRef = saleRef.collection('items');

    await adminFirestore.runTransaction(async (transaction) => {
      // --- READ PHASE ---
      // 1. Read the sale document.
      const saleDoc = await transaction.get(saleRef);
      if (!saleDoc.exists) {
        throw new Error('Sale not found.');
      }
      if (saleDoc.data()?.status === 'voided') {
        throw new Error('Sale has already been voided.');
      }

      // 2. Read the sale items.
      const itemsSnapshot = await transaction.get(itemsRef);
      const saleItems = itemsSnapshot.docs.map(doc => doc.data());

      // 3. Read all product documents that need to be restocked.
      // Create a map to hold references and snapshots to avoid re-fetching.
      const productReads = new Map<string, { ref: any; doc: any }>();
      for (const item of saleItems) {
        if (item.productId && !productReads.has(item.productId)) {
          const productRef = adminFirestore.collection('products').doc(item.productId);
          const productDoc = await transaction.get(productRef);
          productReads.set(item.productId, { ref: productRef, doc: productDoc });
        }
      }

      // Build a map of base SKU -> units to return (in base units)
      const baseUnitsToReturn: Record<string, number> = {};
      const baseSkus = new Set<string>();
      for (const item of saleItems) {
        const info = productReads.get(item.productId);
        if (!info || !info.doc.exists) continue;
        const productData = info.doc.data()!;
        const baseSku = productData.baseProductSku || productData.sku;
        const units = (productData.containedUnits || 1) * (item.quantity || 0);
        baseUnitsToReturn[baseSku] = (baseUnitsToReturn[baseSku] || 0) + units;
        baseSkus.add(baseSku);
      }

      // For each base SKU, read the base product doc and all linked package products.
      const baseProductRefs: Record<string, any> = {};
      const baseProductSnaps: Record<string, any> = {};
      const linkedProductsByBase: Record<string, Array<{ ref: any; data: any; id: string }>> = {};

      for (const baseSku of Array.from(baseSkus)) {
        // Read base product (where sku == baseSku)
        const baseQuery = adminFirestore.collection('products').where('sku', '==', baseSku).limit(1);
        const baseQuerySnap = await transaction.get(baseQuery);
        const baseDoc = baseQuerySnap.docs[0];
        if (!baseDoc) {
          throw new Error(`Critical error: Base product for SKU ${baseSku} not found.`);
        }
        baseProductRefs[baseSku] = adminFirestore.collection('products').doc(baseDoc.id);
        baseProductSnaps[baseSku] = baseDoc;

        // Read linked products (packaging variants) that reference this base SKU
        const linkedQuery = adminFirestore.collection('products').where('baseProductSku', '==', baseSku);
        const linkedSnap = await transaction.get(linkedQuery);
        linkedProductsByBase[baseSku] = linkedSnap.docs.map(d => ({ ref: adminFirestore.collection('products').doc(d.id), data: d.data(), id: d.id }));

        // Ensure base product (itself) is included in linked products for updating package stock
        if (!linkedProductsByBase[baseSku].some(p => p.id === baseDoc.id)) {
          linkedProductsByBase[baseSku].push({ ref: baseProductRefs[baseSku], data: baseDoc.data(), id: baseDoc.id });
        }
      }

      // --- WRITE PHASE ---
      // 4. Mark the sale as voided.
      transaction.update(saleRef, {
        status: 'voided',
        voidedAt: Timestamp.now(),
        voidedBy: { uid: decodedToken.uid, name: decodedToken.name || decodedToken.email },
      });

      // 5. Update base product stocks and their linked SKUs
      for (const baseSku of Object.keys(baseUnitsToReturn)) {
        const unitsToReturn = baseUnitsToReturn[baseSku] || 0;
        const baseSnap = baseProductSnaps[baseSku];
        const baseRef = baseProductRefs[baseSku];
        const currentBaseStock = baseSnap.data()?.stock ?? 0;
        const newBaseStock = currentBaseStock + unitsToReturn;

        // Update base product stock and status
        const baseThreshold = baseSnap.data()?.threshold || 0;
        const baseStatus = newBaseStock > baseThreshold ? 'In Stock' : newBaseStock > 0 ? 'Low Stock' : 'Out of Stock';
        transaction.update(baseRef, { stock: newBaseStock, status: baseStatus });

        // Update each linked product's stock based on the new base stock
        const linked = linkedProductsByBase[baseSku] || [];
        for (const lp of linked) {
          const contained = (lp.data?.containedUnits as number) || 1;
          const newStockForProduct = Math.floor(newBaseStock / contained);
          const threshold = lp.data?.threshold || 0;
          const status = newStockForProduct > threshold ? 'In Stock' : newStockForProduct > 0 ? 'Low Stock' : 'Out of Stock';
          transaction.update(lp.ref, { stock: newStockForProduct, status });
        }
      }
    });

    // 6. If the transaction completes successfully, return success.
    return { success: true };

  } catch (error: any) {
    console.error('Failed to void sale:', error);
    return {
      success: false,
      error: error.message || 'An unexpected error occurred while voiding the sale.',
    };
  }
}
