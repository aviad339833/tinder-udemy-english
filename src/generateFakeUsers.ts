import * as admin from 'firebase-admin';
import { faker } from '@faker-js/faker';

// Import the JSON file directly
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

/**
 * Asynchronously creates and populates random data for 40 fake users in Firestore.
 *
 * @return{Promise<void>} A promise that resolves when all users have been created.
 */
async function createFakeUsers(): Promise<void> {
  const cities = [
    'New York',
    'Los Angeles',
    'Chicago',
    'Houston',
    'Phoenix',
    'Beersheva',
  ];

  for (let i = 0; i < 3; i++) {
    const genders: ('male' | 'female')[] = ['male', 'female'];
    const gender = genders[Math.floor(Math.random() * genders.length)];

    const email = faker.internet.email();
    const password = faker.internet.password();
    const displayName = faker.person.firstName(gender);

    try {
      // Create user in Firebase Authentication
      const userRecord = await admin.auth().createUser({
        email: email,
        password: password,
      });

      const user: User = {
        aditional_photos: [faker.image.imageUrl()],
        city: cities[Math.floor(Math.random() * cities.length)],

        created_time: admin.firestore.Timestamp.now(),
        description: faker.lorem.sentence(),
        display_name: displayName,
        email: email,
        gender: gender,
        uid: userRecord.uid,
        userInterestInGender: gender === 'male' ? 'female' : 'male',
        year_of_birth: faker.date
          .between('1960-01-01', '2000-01-01')
          .getFullYear(),
      };

      // Save the user data to Firestore
      await firestore.collection('users').doc(user.uid).set(user);
      console.log(`User ${i + 1} created with ID: ${user.uid}`);
    } catch (error) {
      // eslint-disable-next-line max-len
      console.error('Error creating user:', error); // Updated to log only the message, not the full error object
    }
  }
}

createFakeUsers();
