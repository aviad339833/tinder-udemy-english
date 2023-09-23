import axios from 'axios';

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

export const makeEveryoneLike: (userId: string) => Promise<void> = async (
  userId
) => {
  try {
    // Fetch all users from the Firestore collection
    const usersSnapshot = await firestore.collection('users').get();

    // Filter out the specified user
    const otherUsers = usersSnapshot.docs.filter((doc) => doc.id !== userId);

    for (const user of otherUsers) {
      // Send a POST request for each user to "like" the specified user
      await axios.post(
        'https://us-central1-tinder-app-af33b.cloudfunctions.net/api',
        {
          type: 'personThatILike',
          id: user.id,
          ThePersonThatILiked: userId,
        }
      );
      console.log(`User ${user.id} now likes User ${userId}`);
    }
  } catch (error) {
    console.error('Error liking the user:', error);
  }
};

makeEveryoneLike('Xs0JDlTvBIgsx8XUmX4RgmmdlHh2');
