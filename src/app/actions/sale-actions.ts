
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
      const productReads = new Map<string, { ref: any, doc: any }>();
      for (const item of saleItems) {
        if (item.productId && !productReads.has(item.productId)) {
           const productRef = adminFirestore.collection('products').doc(item.productId);
           const productDoc = await transaction.get(productRef);
           productReads.set(item.productId, { ref: productRef, doc: productDoc });
        }
      }

      // --- WRITE PHASE ---
      // 4. Mark the sale as voided.
      transaction.update(saleRef, { 
        status: 'voided', 
        voidedAt: Timestamp.now(), 
        voidedBy: { uid: decodedToken.uid, name: decodedToken.name || decodedToken.email } 
      });
      
      // 5. Update stock for each product.
      for (const item of saleItems) {
        const productInfo = productReads.get(item.productId);
        if (item.productId && item.quantity && productInfo && productInfo.doc.exists) {
          const productData = productInfo.doc.data()!;
          const newStock = (productData.stock || 0) + item.quantity;
          const threshold = productData.threshold || 0;
          
          const newStatus =
            newStock > threshold
              ? 'In Stock'
              : newStock > 0
              ? 'Low Stock'
              : 'Out of Stock';

          transaction.update(productInfo.ref, {
            stock: newStock,
            status: newStatus,
          });
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
