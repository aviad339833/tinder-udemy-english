import * as admin from 'firebase-admin';

const firestore = admin.firestore();

export const handlePersonThatILike = async (
  myId: string,
  thePersonThatILiked: string
): Promise<string> => {
  try {
    // Check if the person you liked also liked you back
    const checkMutualLike = await firestore
      .collection('users')
      .doc(thePersonThatILiked)
      .collection('usersThatILike')
      .doc(myId)
      .get();

    if (checkMutualLike.exists) {
      // Both users liked each other
      // Create a 'matches' sub-collection for both users
      await firestore
        .collection('users')
        .doc(myId)
        .collection('matches')
        .doc(thePersonThatILiked)
        .set({
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
          userId: thePersonThatILiked,
          userRef: `/users/${thePersonThatILiked}`,
        });

      await firestore
        .collection('users')
        .doc(thePersonThatILiked)
        .collection('matches')
        .doc(myId)
        .set({
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
          userId: myId,
          userRef: `/users/${myId}`,
        });

      // Create a chat with a unique ID for both users
      const chatRef = await firestore.collection('chats').add({
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        users: [myId, thePersonThatILiked],
      });

      // Update the user's document to include the chat ID
      await firestore
        .collection('users')
        .doc(myId)
        .update({
          chats: admin.firestore.FieldValue.arrayUnion(chatRef.id),
        });

      await firestore
        .collection('users')
        .doc(thePersonThatILiked)
        .update({
          chats: admin.firestore.FieldValue.arrayUnion(chatRef.id),
        });

      return `Match and chat initiated between user with ID: ${myId} and user with ID: ${thePersonThatILiked}`;
    } else {
      // The person you liked hasn't liked you back yet
      // Add the liked person to the current user's 'usersThatILike' sub-collection
      await firestore
        .collection('users')
        .doc(myId)
        .collection('usersThatILike')
        .doc(thePersonThatILiked)
        .set({
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
          userId: thePersonThatILiked,
          userRef: `/users/${thePersonThatILiked}`,
        });

      return `User with ID: ${myId} liked user with ID: ${thePersonThatILiked}`;
    }
  } catch (error) {
    throw new Error(`Error in liking user: ${error}`);
  }
};
