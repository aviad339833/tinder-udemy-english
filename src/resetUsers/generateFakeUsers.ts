import * as admin from 'firebase-admin';
import { faker } from '@faker-js/faker';
import serviceAccount from './firebaseserverAcount.json';

// Conditional Firebase Initialization
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
  });
}

const firestore = admin.firestore();

interface User {
  aditional_photos: string[];
  city: string;
  created_time: admin.firestore.Timestamp;
  description: string;
  display_name: string;
  email: string;
  gender: string;
  uid: string;
  userInterestInGender: string;
  year_of_birth: number;
}

// eslint-disable-next-line require-jsdoc
export function capitalizeFirstLetter(string: string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

export const createFakeUsers = async (): Promise<void> => {
  const cities = [
    'New York',
    'Los Angeles',
    'Chicago',
    'Houston',
    'Phoenix',
    'Beersheba',
  ];

  const totalUsers = 2;
  const halfUsers = totalUsers / 2;

  for (let i = 1; i < totalUsers + 1; i++) {
    // Alternating gender assignment
    const gender = i < halfUsers ? 'male' : 'female';
    const oppositeGender = gender === 'male' ? 'female' : 'male';

    const email = `user${i}@gmail.com`;
    const password = '123456';
    const displayName = faker.person.firstName(gender);

    try {
      // Create user in Firebase Authentication
      const userRecord = await admin.auth().createUser({
        email: email,
        password: password,
      });

      const user: User = {
        aditional_photos: [faker.image.url()],
        city: cities[Math.floor(Math.random() * cities.length)],
        created_time: admin.firestore.Timestamp.now(),
        description: faker.lorem.sentence(),
        display_name: displayName,
        email: email,
        gender: capitalizeFirstLetter(gender),
        uid: userRecord.uid,
        userInterestInGender: capitalizeFirstLetter(oppositeGender),
        year_of_birth: faker.date
          .between({ from: '1960-01-01', to: '2000-01-01' })
          .getFullYear(),
      };

      // Save the user data to Firestore
      await firestore.collection('users').doc(user.uid).set(user);
      console.log(`User ${i + 1} created with ID: ${user.uid}`);
    } catch (error) {
      console.error('Error creating user:', error);
    }
  }
};

createFakeUsers();
