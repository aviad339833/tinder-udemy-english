import * as admin from 'firebase-admin';

// Import the JSON file directly
import serviceAccount from './firebaseserverAcount.json';

// Conditional Firebase Initialization
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
  });
}

const firestore = admin.firestore();

export const deleteFakeUsers: () => Promise<void> = async () => {
  for (let i = 1; i <= 10; i++) {
    const email = `user${i}@gmail.com`;

    try {
      const userRecord = await admin.auth().getUserByEmail(email);

      // Delete the user from Firebase Authentication
      await admin.auth().deleteUser(userRecord.uid);

      // Delete the user document from Firestore
      await firestore.collection('users').doc(userRecord.uid).delete();

      console.log(`User ${i} deleted with ID: ${userRecord.uid}`);
    } catch (error) {
      console.error('Error deleting user:', error);
    }
  }
};

export const deleteSpecificUsers: () => Promise<void> = async () => {
  const userIds = [
    '7PtDdgz0zGXrdCazAN6BophZuk43',
    'ZcCNLReDFiT0xGPtFlXbYjpUq3r2',
    'KlZEOtZVgdSHKbUQh5S7qT5oGki1',
    'LNjGvMIDYGNivfK3sSCWO119uCy2',
    'aGuEGZqrkvXWJPz4W28VfevdQmr1',
    'PKpfYlvpwyO04VugLoYx9Ukpdiy2',
    'jZQeuJZJ5PQMl4wvELyelDcS4fz2',
    'HCRpJj33zKc5U0S4Vt1DtTQQdF73',
    'o23kFAhPayTO4U5EJV3QK0MJubN2',
    'u8wXgdinCSgVj88J85SS8vUfHOo1',
  ];

  for (let i = 0; i < userIds.length; i++) {
    const uid = userIds[i];

    try {
      // Delete the user from Firebase Authentication
      await admin.auth().deleteUser(uid);

      console.log(`User with ID: ${uid} deleted.`);
    } catch (error) {
      console.error(`Error deleting user with ID: ${uid}`, error);
    }
  }
};

deleteSpecificUsers();
deleteFakeUsers();
