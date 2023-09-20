// userHandlers.ts

import * as admin from 'firebase-admin';

const firestore = admin.firestore();

export const fetchAllUsers = async (
  excludeUserId: string
): Promise<admin.firestore.DocumentData[]> => {
  const usersCollection = firestore.collection('users');
  const snapshot = await usersCollection.get();

  const users: admin.firestore.DocumentData[] = [];
  snapshot.forEach((doc) => {
    if (doc.id !== excludeUserId) {
      users.push({ id: doc.id, ...doc.data() });
    }
  });

  return users;
};
