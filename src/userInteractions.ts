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

    // Check if a "like" interaction already exists
    const existingInteraction = await interactionsCollection
      .where('userId', '==', myId)
      .where('otherUserId', '==', thePersonThatILiked)
      .limit(1)
      .get();

    if (!existingInteraction.empty) {
      // If an interaction already exists, update or check its type
      const interactionDoc = existingInteraction.docs[0];
      if (interactionDoc.get('interactionType') === 'like') {
        return `User with ID: ${myId} already liked user with ID: ${thePersonThatILiked}`;
      }
      await interactionDoc.ref.update({ interactionType: 'like' });
    } else {
      // Create a new "like" interaction
      await interactionsCollection.add({
        userId: myId,
        otherUserId: thePersonThatILiked,
        interactionType: 'like',
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
      });
    }

    // Check mutual like
    const checkMutualLike = await interactionsCollection
      .where('userId', '==', thePersonThatILiked)
      .where('otherUserId', '==', myId)
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
        // Optionally, you can include other initial chat data (e.g., an initial system message, etc.)
      });

      // Update the user's documents to include the chat ID in their list of chats
      await firestore
        .collection('users')
        .doc(myId)
        .update({
          chats: admin.firestore.FieldValue.arrayUnion(chatRef.id),
          // Optionally, you can update other user fields if needed
        });

      await firestore
        .collection('users')
        .doc(thePersonThatILiked)
        .update({
          chats: admin.firestore.FieldValue.arrayUnion(chatRef.id),
          // Optionally, you can update other user fields if needed
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
