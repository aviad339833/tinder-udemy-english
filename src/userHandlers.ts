// userHandlers.ts

import * as admin from 'firebase-admin';

const firestore = admin.firestore();

export const fetchAllUsers = async (
  excludeUserId: string
): Promise<admin.firestore.DocumentData[]> => {
  console.log(
    `Entered getAllMatchedUsers function. Excluding user with ID: ${excludeUserId}`
  );

  // Fetch users that the current user likes and doesn't like
  const usersThatILikeSnapshot = await firestore
    .collection('users')
    .doc(excludeUserId)
    .collection('usersThatILike')
    .get();

  const usersThatIDontLikeSnapshot = await firestore
    .collection('users')
    .doc(excludeUserId)
    .collection('usersThatIDontLike')
    .get();

  const usersILike: string[] = [];
  usersThatILikeSnapshot.forEach((doc) => {
    usersILike.push(doc.id);
  });

  const usersIDontLike: string[] = [];
  usersThatIDontLikeSnapshot.forEach((doc) => {
    usersIDontLike.push(doc.id);
  });

  // Combine the two lists and remove duplicates
  const excludedUsers = [
    ...new Set([...usersILike, ...usersIDontLike, excludeUserId]),
  ];

  const usersCollection = firestore.collection('users');
  const snapshot = await usersCollection.get();

  const users: admin.firestore.DocumentData[] = [];
  snapshot.forEach((doc) => {
    if (!excludedUsers.includes(doc.id)) {
      users.push({ id: doc.id, ...doc.data() });
    } else {
      console.log(`Found and excluded user with ID: ${doc.id}`);
    }
  });

  console.log(
    `Fetched ${users.length} users excluding user with ID: ${excludeUserId} and other excluded users.`
  );

  return users;
};
