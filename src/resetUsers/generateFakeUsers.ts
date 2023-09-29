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

const woman: string[] = [
  'https://i.pinimg.com/originals/f7/fe/41/f7fe418d1987aae11f0701b266f753ed.jpg',
  'https://nypost.com/wp-content/uploads/sites/2/2020/12/yael-most-beautiful-video.jpg?quality=75&strip=all&w=1024',
];
const man: string[] = [
  'https://i.pinimg.com/564x/f2/09/bb/f209bbb7c607431acd4683ed0acc2a61.jpg',
  'https://im.indiatimes.in/content/2023/Jun/india_649d635c6fde2.jpg',
];

type Gender = 'male' | 'female';
const createUser = async (gender: Gender, imageUrl: string, index: number) => {
  const oppositeGender: Gender = gender === 'male' ? 'female' : 'male';

  const prefix: string = gender === 'male' ? 'm' : 'f';
  const email = `${prefix}${index + 1}@gmail.com`; // Since array indices are 0-based, we add 1 for the email
  const password = '123456';

  const displayName = faker.person.firstName(gender);
  const cities = [
    'New York',
    'Los Angeles',
    'Chicago',
    'Houston',
    'Phoenix',
    'Beersheba',
  ];

  try {
    // Create user in Firebase Authentication
    const userRecord = await admin.auth().createUser({
      email: email,
      password: password,
    });

    const user: User = {
      aditional_photos: [imageUrl],
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
    console.log(
      `User created with ID: ${user.uid}, email: ${email}, and image: ${imageUrl}`
    );
  } catch (error) {
    console.error('Error creating user:', error);
  }
};

export const createFakeUsers = async (): Promise<void> => {
  // Loop through women's images
  for (let i = 0; i < woman.length; i++) {
    await createUser('female', woman[i], i);
  }

  // Loop through men's images
  for (let i = 0; i < man.length; i++) {
    await createUser('male', man[i], i);
  }
};

createFakeUsers();
