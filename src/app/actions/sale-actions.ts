'use server';

import { initializeFirebaseAdmin } from '@/firebase/server';
import { getAuth } from 'firebase-admin/auth';
import { FieldValue } from 'firebase-admin/firestore';

interface VoidSalePayload {
  saleId: string;
  adminEmail: string;
}

export async function verifyAdminAction(
    email: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { auth: adminAuth, firestore: adminFirestore } = initializeFirebaseAdmin();
  
      const adminUser = await adminAuth.getUserByEmail(email);
      const adminRoleDoc = await adminFirestore.collection('roles_admin').doc(adminUser.uid).get();
  
      if (!adminRoleDoc.exists) {
        return { success: false, error: 'User does not have administrator privileges.' };
      }

      // For the purpose of this request (cancelling a cart), verifying the role is the key step.
      return { success: true };
  
    } catch (error: any) {
      console.error('Failed to verify admin:', error);
      let errorMessage = 'An unexpected error occurred.';
      if (error.code === 'auth/user-not-found') {
          errorMessage = 'Invalid administrator email.';
      } else if (error.message) {
          errorMessage = error.message;
      }
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

export async function voidSaleAction(
  payload: VoidSalePayload
): Promise<{ success: boolean; error?: string }> {
  const { saleId, adminEmail } = payload;
  
  try {
    // Use only the Admin SDK for server-side operations
    const { auth: adminAuth, firestore: adminFirestore } = initializeFirebaseAdmin();

    // Verify the user by email and check for admin role.
    const adminUser = await adminAuth.getUserByEmail(adminEmail);
    const adminRoleDoc = await adminFirestore.collection('roles_admin').doc(adminUser.uid).get();

    if (!adminRoleDoc.exists) {
        throw new Error('User does not have administrator privileges.');
    }

    // Now, proceed with the voiding logic inside a transaction
    await adminFirestore.runTransaction(async (transaction) => {
      const saleRef = adminFirestore.collection('sales').doc(saleId);
      const saleDoc = await transaction.get(saleRef);

      if (!saleDoc.exists) {
        throw new Error('Sale not found.');
      }
      
      const saleData = saleDoc.data();
      if (saleData?.status === 'voided') {
        throw new Error('Sale has already been voided.');
      }

      // Get all items from the sale
      const itemsRef = saleRef.collection('items');
      const itemsSnapshot = await transaction.get(itemsRef);
      const saleItems = itemsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // Update product stock levels
      for (const item of saleItems) {
        if (item.productId && item.quantity) {
          const productRef = adminFirestore.collection('products').doc(item.productId);
          const productDoc = await transaction.get(productRef);

          if (!productDoc.exists()) {
            // If product doesn't exist, we can't restock it. Skip or throw error.
            console.warn(`Product with ID ${item.productId} not found. Cannot restock.`);
            continue;
          }

          const productData = productDoc.data();
          if (!productData) continue;

          const currentStock = productData.stock || 0;
          const threshold = productData.threshold || 0;

          const newStock = currentStock + item.quantity;
          const newStatus =
            newStock > threshold
              ? 'In Stock'
              : newStock > 0
              ? 'Low Stock'
              : 'Out of Stock';

          transaction.update(productRef, {
            stock: newStock,
            status: newStatus,
          });
        }
      }

      // Mark the sale as voided
      transaction.update(saleRef, { status: 'voided' });
    });

    return { success: true };
  } catch (error: any) {
    console.error('Failed to void sale:', error);
    let errorMessage = 'An unexpected error occurred.';
    if (error.code === 'auth/user-not-found') {
        errorMessage = 'Invalid administrator credentials.';
    } else if (error.message) {
        errorMessage = error.message;
    }
    return {
      success: false,
      error: errorMessage,
    };
  }
}
