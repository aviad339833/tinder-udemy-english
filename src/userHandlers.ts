import * as admin from 'firebase-admin';

const firestore = admin.firestore();

export const fetchAllUsers = async (
  excludeUserId: string,
  lastUserId?: string
): Promise<admin.firestore.DocumentData[]> => {
  // Step 2.1: If no lastUserId is provided, fetch it from the special document
  if (!lastUserId) {
    const lastUserSetting = await firestore
      .doc('settings/lastFetchedUser')
      .get();
    lastUserId = lastUserSetting.data()?.lastUserId;
  }

  console.log(`Fetching batch for user with ID: ${excludeUserId}`);
  console.log(`lastUserId: ${lastUserId}`);

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

  const currentTimestamp = new Date();

  const batchSize = 20;
  let userQuery = firestore
    .collection('users')
    .where('gender', '==', userInterestInGender)
    .where('created_time', '>', currentTimestamp)
    .orderBy('created_time')
    .limit(batchSize);

  if (lastUserId) {
    const lastUserSnapshot = await firestore
      .collection('users')
      .doc(lastUserId)
      .get();
    userQuery = userQuery.startAfter(lastUserSnapshot);
  }

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

  // Step 2.2: Update the lastUserId in the special document
  if (users.length > 0) {
    await firestore.doc('settings/lastFetchedUser').set({
      lastUserId: users[users.length - 1].id,
    });
  }

  return users;
};
