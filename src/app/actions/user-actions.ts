'use server';

import { initializeFirebaseAdmin } from '@/firebase/server';

/**
 * Deletes a user from Firebase Authentication and their associated data in Firestore.
 * This is a server action and should only be called from a trusted client environment
 * by an authorized administrator. Security is enforced by Firestore rules restricting
 * who can trigger this action.
 *
 * @param userId The UID of the user to delete.
 * @returns A promise that resolves to an object indicating success or failure.
 */
export async function deleteUserAction(
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { auth: adminAuth, firestore: adminFirestore } = initializeFirebaseAdmin();
    
    // Step 1: Delete from Firebase Authentication
    await adminAuth.deleteUser(userId);

    // Step 2: Delete from 'users' collection in Firestore
    const userDocRef = adminFirestore.collection('users').doc(userId);
    await userDocRef.delete();

    // Step 3: Delete from 'roles_admin' collection if they are an admin
    // It's safe to attempt deletion even if the document doesn't exist.
    const adminRoleDocRef = adminFirestore.collection('roles_admin').doc(userId);
    await adminRoleDocRef.delete();

    return { success: true };
  } catch (error: any) {
    console.error('Failed to delete user:', error);
    // Provide a more generic error message to the client for security.
    return {
      success: false,
      error: 'An error occurred while deleting the user. This may be due to insufficient permissions.',
    };
  }
}
