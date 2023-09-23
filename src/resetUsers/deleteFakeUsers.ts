import * as admin from 'firebase-admin';

// Import the JSON file directly
import serviceAccount from './firebaseserverAcount.json';

// Conditional Firebase Initialization
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
  });
}

const firestore = admin.firestore();

export const deleteAllUsersExceptOne: () => Promise<void> = async () => {
  const EXCLUDE_UID = 'u8wXgdinCSgVj88J85SS8vUfHOo1';

  try {
    const usersSnapshot = await firestore.collection('users').get();

    // Fetch all users except the one with EXCLUDE_UID
    const usersToDelete = usersSnapshot.docs.filter(
      (doc) => doc.id !== EXCLUDE_UID
    );

    for (const user of usersToDelete) {
      const uid = user.id;

      try {
        // Delete the user from Firebase Authentication
        await admin.auth().deleteUser(uid);
        console.log(`User with ID: ${uid} deleted from Firebase Auth.`);
      } catch (error) {
        const authError = error as { code?: string }; // Type assertion
        if (authError.code === 'auth/user-not-found') {
          console.warn(`User with ID: ${uid} not found in Firebase Auth.`);
        } else {
          console.error(
            `Error deleting user with ID: ${uid} from Firebase Auth:`,
            authError
          );
        }
      }

      // Delete the user document from Firestore
      await firestore.collection('users').doc(uid).delete();
      console.log(`User with ID: ${uid} deleted from Firestore.`);
    }
  } catch (error) {
    console.error('Error deleting users:', error);
  }
};

deleteAllUsersExceptOne();
