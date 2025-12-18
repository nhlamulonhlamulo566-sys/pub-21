
'use server';

import { initializeFirebaseAdmin } from '@/firebase/server';

interface CreateUserPayload {
  email: string;
  password?: string;
  displayName?: string;
}

export async function createUserAction(
  payload: CreateUserPayload
): Promise<{ success: boolean; uid?: string; error?: string }> {
  try {
    const { auth: adminAuth } = initializeFirebaseAdmin();
    const { ...userToCreate } = payload;

    const userRecord = await adminAuth.createUser(userToCreate);
    return { success: true, uid: userRecord.uid };
  } catch (error: any) {
    console.error('Failed to create user:', error);
    let errorMessage = 'An unexpected error occurred during user creation.';
    if (error.code === 'auth/email-already-exists') {
      errorMessage = 'A user with this email address already exists.';
    } else if (error.code === 'auth/invalid-password') {
      errorMessage =
        'The password must be a string with at least six characters.';
    } else if (error.code === 'auth/invalid-phone-number') {
        errorMessage = 'The phone number must be a valid E.164 standard compliant identifier (e.g., +11234567890).';
    } else if (error.message) {
        errorMessage = error.message;
    }
    return {
      success: false,
      error: errorMessage,
    };
  }
}

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


interface UpdateUserPayload {
  userId: string;
  name: string;
  surname: string;
  role: 'administrator' | 'sales';
}

export async function updateUserAction(
  payload: UpdateUserPayload
): Promise<{ success: boolean; error?: string }> {
  const { userId, name, surname, role } = payload;

  try {
    const { auth: adminAuth, firestore: adminFirestore } = initializeFirebaseAdmin();
    
    const userDocRef = adminFirestore.collection('users').doc(userId);
    const adminRoleDocRef = adminFirestore.collection('roles_admin').doc(userId);

    // Update display name in Firebase Auth
    await adminAuth.updateUser(userId, {
      displayName: `${name} ${surname}`,
    });

    // Update user profile in Firestore
    await userDocRef.update({
      name,
      surname,
      role,
    });

    // Manage admin role in the roles_admin collection
    if (role === 'administrator') {
      // Add user to admin roles if not already there
      await adminRoleDocRef.set({});
    } else {
      // Remove user from admin roles if they exist
      await adminRoleDocRef.delete();
    }

    return { success: true };
  } catch (error: any) {
    console.error('Failed to update user:', error);
    return {
      success: false,
      error: error.message || 'An unexpected error occurred during user update.',
    };
  }
}
