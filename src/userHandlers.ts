import * as admin from 'firebase-admin';

const firestore = admin.firestore();
const PAGE_SIZE = 20;

export const fetchAllUsers = async (
  excludeUserId: string
): Promise<admin.firestore.DocumentData[]> => {
  console.log(`Fetching batch for user with ID: ${excludeUserId}`);

  const interactionsCollection = firestore.collection('interactions');

  const likedAndDislikedUsers = await interactionsCollection
    .where('userId', '==', excludeUserId)
    .get();

  const excludedUserIds = likedAndDislikedUsers.docs.map((doc) =>
    doc.get('otherUserId')
  );

  excludedUserIds.push(excludeUserId); // Add the user themselves to the exclude list

  const currentUserDoc = await firestore
    .collection('users')
    .doc(excludeUserId)
    .get();
  const currentUserData = currentUserDoc.data();

  if (!currentUserData) {
    throw new Error('User not found');
  }

  const userInterestInGender = currentUserData.userInterestInGender;
  const batchSize = 20;

  const userQuery = firestore
    .collection('users')
    .where('gender', '==', userInterestInGender)
    .orderBy('created_time')
    .limit(batchSize);

  const usersSnapshot = await userQuery.get();

  const users: admin.firestore.DocumentData[] = [];
  usersSnapshot.forEach((doc) => {
    if (!excludedUserIds.includes(doc.id)) {
      users.push({ id: doc.id, ...doc.data() });
    }
  });

  console.log(
    `Fetched ${users.length} users excluding user with ID: ${excludeUserId} and other excluded users.`
  );

  return users;
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
      .limit(PAGE_SIZE);

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
