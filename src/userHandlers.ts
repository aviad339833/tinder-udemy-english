import * as admin from 'firebase-admin';

const firestore = admin.firestore();

export const fetchPotentialMatches = async (
  userId: string
): Promise<admin.firestore.DocumentData[]> => {
  console.log(`Fetching potential matches for user with ID: ${userId}`);

  const TARGET_SIZE = 20; // Desired number of potential matches
  const BATCH_SIZE = 100; // Fetch size for each query

  const interactionsCollection = firestore
    .collection('users')
    .doc(userId)
    .collection('interactions');
  const likedAndDislikedUsers = await interactionsCollection.get();
  const excludedUserIds = likedAndDislikedUsers.docs.map((doc) => doc.id);
  excludedUserIds.push(userId); // Exclude the user themself

  const currentUserDoc = await firestore.collection('users').doc(userId).get();
  const currentUserData = currentUserDoc.data();
  if (!currentUserData) throw new Error('User not found');

  const userInterestInGender = currentUserData.userInterestInGender;

  let lastDoc; // To keep track of where to start in the next batch
  let potentialMatches: admin.firestore.DocumentData[] = [];

  while (potentialMatches.length < TARGET_SIZE) {
    let usersQuery = firestore
      .collection('users')
      .where('gender', '==', userInterestInGender)
      .orderBy('created_time')
      .limit(BATCH_SIZE);

    if (lastDoc) {
      usersQuery = usersQuery.startAfter(lastDoc);
    }

    const usersSnapshot = await usersQuery.get();
    if (usersSnapshot.empty) break; // Exit if no more users to fetch

    lastDoc = usersSnapshot.docs[usersSnapshot.docs.length - 1];

    const filteredUsers = usersSnapshot.docs
      .filter((doc) => !excludedUserIds.includes(doc.id))
      .map((doc) => ({ id: doc.id, ...doc.data() }));

    potentialMatches.push(...filteredUsers);
  }

  // If there are more than the target size due to the last batch, slice it
  if (potentialMatches.length > TARGET_SIZE) {
    potentialMatches = potentialMatches.slice(0, TARGET_SIZE);
  }

  console.log(
    `Fetched ${potentialMatches.length} potential matches for user with ID: ${userId}.`
  );
  return potentialMatches;
};

export const dislikeUser = async (
  currentUserId: string,
  targetUserId: string
) => {
  console.log(
    `User with ID ${currentUserId} dislikes user with ID ${targetUserId}`
  );

  // 1. Recording the Dislike
  const currentUserInteractions = firestore
    .collection('users')
    .doc(currentUserId)
    .collection('interactions');

  const dislikeData = {
    targetUserId: targetUserId,
    interactionType: 'dislike',
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
  };

  // eslint-disable-next-line max-len
  await currentUserInteractions.doc(targetUserId).set(dislikeData); // Here the document ID is set as the targetUserId to prevent duplication

  // 2. Optionally Notify the Disliked User
  // eslint-disable-next-line max-len
  // (This step can be a push notification or an update in some sort of "views" count, without specifying it was a dislike)

  // 3. Update Metrics (if applicable)
  // (This can involve updating some metrics in the users' collection or another analytics system)

  console.log(
    `Dislike recorded for user with ID ${targetUserId} by user with ID ${currentUserId}`
  );
};

export const likeUser = async (currentUserId: string, targetUserId: string) => {
  console.log(
    `User with ID ${currentUserId} likes user with ID ${targetUserId}`
  );

  // Record the Like for the current user
  const currentUserInteractions = firestore
    .collection('users')
    .doc(currentUserId)
    .collection('interactions');

  const likeData = {
    targetUserId: targetUserId,
    interactionType: 'like',
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
  };

  await currentUserInteractions.doc(targetUserId).set(likeData);

  console.log(
    `Like recorded for user with ID ${targetUserId} by user with ID ${currentUserId}`
  );
};

export const checkForMatchAndCreateChat = async (
  currentUserId: string,
  targetUserId: string
) => {
  console.log(
    `Checking for match between ${currentUserId} and ${targetUserId}`
  );

  const targetUserInteractions = firestore
    .collection('users')
    .doc(targetUserId)
    .collection('interactions');

  const interactionDoc = await targetUserInteractions.doc(currentUserId).get();

  if (
    interactionDoc.exists &&
    interactionDoc.get('interactionType') === 'like'
  ) {
    // eslint-disable-next-line quotes
    console.log("It's a match!");

    // Record the match for both users
    const currentUserMatches = firestore
      .collection('users')
      .doc(currentUserId)
      .collection('matches');
    const targetUserMatches = firestore
      .collection('users')
      .doc(targetUserId)
      .collection('matches');

    const matchData = {
      matchedUserId: targetUserId,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    };

    await currentUserMatches.doc(targetUserId).set(matchData);

    matchData.matchedUserId = currentUserId;
    await targetUserMatches.doc(currentUserId).set(matchData);

    // Create a new chat for the matched users
    const chatData = {
      user1Id: currentUserId,
      user2Id: targetUserId,
      lastMessageTimestamp: admin.firestore.FieldValue.serverTimestamp(),
    };

    const chatRef = await firestore.collection('chats').add(chatData);

    // Optionally notify both users about the match

    console.log(
      `Matched and chat created for ${currentUserId} and ${targetUserId}`
    );
    return chatRef.id; // return the chat ID if you want to redirect users to the chat immediately
  }

  console.log(`No match found between ${currentUserId} and ${targetUserId}`);
  return null;
};

export const fetchUsersILike = async (
  userId: string,
  limit: number
): Promise<string[]> => {
  console.log(
    `[fetchUsersILike] Fetching liked users for user with ID: ${userId} with limit: ${limit}`
  ); // Logging the start of the function

  const interactionsCollection = firestore.collection('interactions');
  const likedUsers: string[] = [];

  try {
    console.log(
      `[fetchUsersILike] Fetching liked users for userId: ${userId} up to limit: ${limit}`
    ); // Logging before fetching liked users

    // Fetch all users that the given user has "liked" up to the specified limit.
    const likesSnapshot = await interactionsCollection
      .where('userId', '==', userId)
      .where('interactionType', '==', 'like')
      .limit(limit)
      .get();

    likesSnapshot.forEach((doc) => {
      likedUsers.push(doc.data().otherUserId);
    });

    console.log(
      `[fetchUsersILike] User ${userId} has liked the following users:`,
      likedUsers
    ); // Logging liked users

    return likedUsers;
  } catch (error) {
    console.error(
      `[fetchUsersILike] Error fetching liked users for user ${userId}: ${error}`
    );
    throw new Error(`Error fetching liked users for user: ${error}`);
  }
};

export const fetchAllMatchesForUser = async (
  userId: string,
  lastUserTimestamp?: FirebaseFirestore.Timestamp
): Promise<{
  matches: string[];
  lastTimestamp?: FirebaseFirestore.Timestamp;
}> => {
  console.log(
    `[fetchAllMatchesForUser] Fetching matches for user with ID: ${userId}`
  );

  const interactionsCollection = firestore.collection('interactions');
  const likedUsers: string[] = [];
  const matches: string[] = [];

  const myRef = firestore.collection('users').doc(userId); // Reference to the current user's document

  try {
    let query = interactionsCollection
      .where('userRef', '==', myRef)
      .where('interactionType', '==', 'like')
      .orderBy('timestamp', 'desc')
      .limit(10);

    if (lastUserTimestamp) {
      query = query.startAfter(lastUserTimestamp);
    }

    const likesSnapshot = await query.get();

    if (likesSnapshot.empty) {
      return { matches: [] };
    }

    likesSnapshot.forEach((doc) => {
      const otherUserRef = doc.data().otherUserRef;
      likedUsers.push(otherUserRef.id);
    });

    for (const otherUserId of likedUsers) {
      const otherUserRef = firestore.collection('users').doc(otherUserId);

      const mutualLikeSnapshot = await interactionsCollection
        .where('userRef', '==', otherUserRef)
        .where('otherUserRef', '==', myRef)
        .where('interactionType', '==', 'like')
        .limit(1)
        .get();

      if (!mutualLikeSnapshot.empty) {
        matches.push(`${otherUserId}`);
      }
    }

    const lastTimestamp =
      likesSnapshot.docs[likesSnapshot.docs.length - 1].data().timestamp;

    return { matches, lastTimestamp };
  } catch (error) {
    console.error(
      `[fetchAllMatchesForUser] Error fetching matches for user ${userId}: ${error}`
    );
    throw new Error(`Error fetching matches for user: ${error}`);
  }
};
