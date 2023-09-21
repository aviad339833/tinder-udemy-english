import * as admin from 'firebase-admin';

const firestore = admin.firestore();

export const handlePersonThatILike = async (
  myId: string,
  thePersonThatILiked: string
): Promise<string> => {
  try {
    console.log(
      `Handling like request from user with ID: ${myId} to user with ID: ${thePersonThatILiked}`
    );

    const interactionsCollection = firestore.collection('interactions');
    const myRef = firestore.collection('users').doc(myId); // Reference to the current user's document
    const theirRef = firestore.collection('users').doc(thePersonThatILiked); // Reference to the other user's document

    // Check if a "like" interaction already exists using references
    const existingInteraction = await interactionsCollection
      .where('userRef', '==', myRef)
      .where('otherUserRef', '==', theirRef)
      .limit(1)
      .get();

    if (!existingInteraction.empty) {
      const interactionDoc = existingInteraction.docs[0];
      if (interactionDoc.get('interactionType') === 'like') {
        return `User with ID: ${myId} already liked user with ID: ${thePersonThatILiked}`;
      }
      await interactionDoc.ref.update({ interactionType: 'like' });
    } else {
      await interactionsCollection.add({
        userRef: myRef, // Storing user references instead of IDs
        otherUserRef: theirRef,
        interactionType: 'like',
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
      });
    }

    // Check mutual like using references
    const checkMutualLike = await interactionsCollection
      .where('userRef', '==', theirRef)
      .where('otherUserRef', '==', myRef)
      .where('interactionType', '==', 'like')
      .limit(1)
      .get();

    if (!checkMutualLike.empty) {
      // Both users have liked each other, initiate a match
      console.log(`Match detected between ${myId} and ${thePersonThatILiked}`);

      // Create a chat with a unique ID for both users
      const chatRef = await firestore.collection('chats').add({
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        users: [myId, thePersonThatILiked],
      });

      // Update the user's documents to include the chat ID in their list of chats
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

      console.log(
        `Chat created with ID ${chatRef.id} for ${myId} and ${thePersonThatILiked}`
      );
      return `Match and chat initiated between user with ID: ${myId} and user with ID: ${thePersonThatILiked}`;
    } else {
      console.log(
        `User with ID: ${myId} liked user with ID: ${thePersonThatILiked}, but no match yet.`
      );
      return `User with ID: ${myId} liked user with ID: ${thePersonThatILiked}, but no match yet.`;
    }
  } catch (error) {
    console.error(`Error in liking user: ${error}`);
    throw new Error(`Error in liking user: ${error}`);
  }
};

export const handlePersonThatIDontLike = async (
  myId: string,
  thePersonThatIDontLiked: string
): Promise<string> => {
  try {
    const interactionsCollection = firestore.collection('interactions');

    console.log('Fetching existing interaction...'); // Debugging

    // Check if there's an existing interaction
    const existingInteraction = await interactionsCollection
      .where('userId', '==', myId)
      .where('otherUserId', '==', thePersonThatIDontLiked)
      .limit(1)
      .get();

    if (!existingInteraction.empty) {
      console.log('Interaction found.'); // Debugging

      // If an interaction already exists, update or check its type
      const interactionDoc = existingInteraction.docs[0];
      if (interactionDoc.get('interactionType') === 'dislike') {
        console.log('User has already disliked.'); // Debugging
        return `User with ID: ${myId} already disliked user with ID: ${thePersonThatIDontLiked}`;
      }

      console.log('Updating interaction to dislike'); // Debugging
      await interactionDoc.ref.update({ interactionType: 'dislike' });

      console.log('Checking for existing chat between users...'); // Debugging

      // Handle chat implications based on the "unmatch" or "dislike" action
      const chatsCollection = firestore.collection('chats');
      const chat = await chatsCollection
        .where('users', 'array-contains', myId)
        .where('users', 'array-contains', thePersonThatIDontLiked)
        .limit(1)
        .get();

      if (!chat.empty) {
        console.log('Chat found. Deleting...'); // Debugging
        await chat.docs[0].ref.delete();

        console.log('Removing chat ID from users profiles...'); // Debugging

        await firestore
          .collection('users')
          .doc(myId)
          .update({
            chats: admin.firestore.FieldValue.arrayRemove(chat.docs[0].id),
          });
        await firestore
          .collection('users')
          .doc(thePersonThatIDontLiked)
          .update({
            chats: admin.firestore.FieldValue.arrayRemove(chat.docs[0].id),
          });
      } else {
        console.log('No chat found between users.'); // Debugging
      }
    } else {
      console.log('No existing interaction, creating a new one'); // Debugging

      const newDocRef = await interactionsCollection.add({
        userId: myId,
        otherUserId: thePersonThatIDontLiked,
        interactionType: 'dislike',
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
      });

      console.log('New interaction added with doc ID:', newDocRef.id); // Debugging
    }

    return `User with ID: ${myId} doesn't like user with ID: ${thePersonThatIDontLiked} anymore.`;
  } catch (error) {
    console.error(`Error in unmatching/disliking user: ${error}`);
    throw new Error(`Error in unmatching/disliking user: ${error}`);
  }
};
