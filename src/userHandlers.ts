import * as admin from 'firebase-admin';

const firestore = admin.firestore();

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
