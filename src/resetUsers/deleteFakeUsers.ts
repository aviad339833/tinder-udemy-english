import * as admin from 'firebase-admin';
import serviceAccount from './firebaseserverAcount.json';

// Conditional Firebase Initialization
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
  });
}

const firestore = admin.firestore();

// eslint-disable-next-line require-jsdoc
export async function deleteSubcollection(
  docRef: admin.firestore.DocumentReference,
  subcollectionName: string
) {
  const snapshot = await docRef.collection(subcollectionName).get();
  const batch = firestore.batch();
  snapshot.docs.forEach((doc) => {
    batch.delete(doc.ref);
  });
  await batch.commit();
}

export const deleteSpecificUsers: () => Promise<void> = async () => {
  // Define the list of emails of users to be deleted
  const emailsToDelete = [
    'f1@gmail.com',
    'f2@gmail.com',
    'f3@gmail.com',
    'm1@gmail.com',
    'm2@gmail.com',
    'm3@gmail.com',
  ];

  for (const email of emailsToDelete) {
    try {
      // Fetch the user by email
      const userRecord = await admin.auth().getUserByEmail(email);
      const uid = userRecord.uid;

      // Delete subcollections associated with the user
      const userDocRef = firestore.collection('users').doc(uid);
      await deleteSubcollection(userDocRef, 'interactions');
      await deleteSubcollection(userDocRef, 'matches');
      await deleteSubcollection(userDocRef, 'usersWhoLikedMe');

      // Delete the user document from Firestore
      await userDocRef.delete();
      console.log(`User with email: ${email} deleted from Firestore.`);

      // Delete chats and their subcollections
      const chatDocRef = firestore.collection('chats').doc(uid);
      await deleteSubcollection(chatDocRef, 'messages'); // Assuming a 'messages' subcollection for chats
      await chatDocRef.delete();
      console.log(
        `Chat associated with email: ${email} deleted from Firestore.`
      );

      // Delete user from Firebase Authentication
      await admin.auth().deleteUser(uid);
      console.log(
        `User with email: ${email} deleted from Firebase Authentication.`
      );
    } catch (error) {
      console.error(`Error processing user with email ${email}: ${error}`);
    }
  }
};

// Execute the function to delete specific users
deleteSpecificUsers();
