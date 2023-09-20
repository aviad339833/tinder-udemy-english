// userInteractions.ts

import * as admin from 'firebase-admin';

const firestore = admin.firestore();

export const handlePersonThatILike = async (
  myId: string,
  thePersonThatILiked: string
): Promise<string> => {
  try {
    // Adding the liked person to the current user's 'usersThatILike' sub-collection
    await firestore
      .collection('users')
      .doc(myId)
      .collection('usersThatILike')
      .doc(thePersonThatILiked)
      .set({});

    return `User with ID: ${myId} liked user with ID: ${thePersonThatILiked}`;
  } catch (error) {
    throw new Error(`Error in liking user: ${error}`);
  }
};
