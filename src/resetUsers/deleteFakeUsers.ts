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

export const deleteAllUsersAndChats: () => Promise<void> = async () => {
  // Define the UID to exclude
  const excludedUid = 'u8wXgdinCSgVj88J85SS8vUfHOo1';

  // Delete all users
  const usersSnapshot = await firestore.collection('users').get();

  for (const userDoc of usersSnapshot.docs) {
    try {
      const uid = userDoc.id;

      // Delete subcollections associated with the user
      await deleteSubcollection(userDoc.ref, 'interactions');
      await deleteSubcollection(userDoc.ref, 'matches');
      await deleteSubcollection(userDoc.ref, 'usersWhoLikedMe');
      await deleteSubcollection(userDoc.ref, 'notifications');

      // Delete the user document from Firestore
      await userDoc.ref.delete();
      console.log(`User with UID: ${uid} deleted from Firestore.`);

      // Only delete from Firebase Authentication if it's not the excluded UID
      if (uid !== excludedUid) {
        await admin.auth().deleteUser(uid);
        console.log(
          `User with UID: ${uid} deleted from Firebase Authentication.`
        );
      }
    } catch (error) {
      console.error(`Error processing user with UID  ${error}`);
    }
  }

  // Delete all chats and their subcollections
  const chatsSnapshot = await firestore.collection('chats').get();

  for (const chatDoc of chatsSnapshot.docs) {
    try {
      // Delete messages subcollection from the chat
      await deleteSubcollection(chatDoc.ref, 'messages');

      // Delete the chat document from Firestore
      await chatDoc.ref.delete();
      console.log(`Chat with ID: ${chatDoc.id} deleted from Firestore.`);
    } catch (error) {
      console.error(`Error processing chat with ID ${chatDoc.id}: ${error}`);
    }
  }
};

// Execute the function to delete all users and chats
deleteAllUsersAndChats();
