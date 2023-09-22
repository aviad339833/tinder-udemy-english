import * as admin from 'firebase-admin';

const firestore = admin.firestore();

export const resetUser = async (userId: string): Promise<void> => {
  try {
    // Reference to the user's document
    const userDocRef = firestore.collection('users').doc(userId);

    // Define the sub-collections to delete
    const subcollections = [
      'usersThatILike',
      'matches',
      'usersThatLikedMe',
      'usersThatIDontLike',
    ];

    for (const subcollection of subcollections) {
      const subCollectionRef = userDocRef.collection(subcollection);
      const subCollectionSnapshots = await subCollectionRef.get();
      for (const subCollectionDoc of subCollectionSnapshots.docs) {
        await subCollectionDoc.ref.delete();
      }
    }

    // Delete the chat field (array) from the user's document
    await userDocRef.update({
      chats: admin.firestore.FieldValue.delete(),
    });
  } catch (error) {
    console.error(`Error resetting user data: ${error}`);
    throw error;
  }
};

export const resetAllUsers = async (): Promise<void> => {
  try {
    // If there's a chat collection, delete the whole chat collection
    const chatCollectionRef = firestore.collection('chats');
    const chatSnapshots = await chatCollectionRef.get();
    for (const chatDoc of chatSnapshots.docs) {
      await chatDoc.ref.delete();
    }

    // If there's a chat collection, delete the whole chat collection
    const interactionsCollectionRef = firestore.collection('interactions');
    const interactionsSnapshots = await interactionsCollectionRef.get();
    for (const interactionDoc of interactionsSnapshots.docs) {
      await interactionDoc.ref.delete();
    }

    // Retrieve all user documents
    const usersSnapshots = await firestore.collection('users').get();

    // For each user, reset their data
    for (const userDoc of usersSnapshots.docs) {
      const userId = userDoc.id;
      await resetUser(userId);
    }

    console.log('All users have been reset.');
  } catch (error) {
    console.error(`Error resetting all users: ${error}`);
    throw error;
  }
};
