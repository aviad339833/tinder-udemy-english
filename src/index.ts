import express from 'express';
import { initializeApp } from 'firebase-admin/app';

initializeApp();

import * as functions from 'firebase-functions';
import admin from 'firebase-admin';

const firestore = admin.firestore();

const app = express(); // Create an instance of the Express application

interface IRequest {
  type: string;
  myId?: string;
  ThePersonThatILiked?: string;
  // Add any other properties as needed
}

interface IQuery {
  type: string;
  userId: string;
}

app.get('/', async (request: express.Request, response: express.Response) => {
  const query = request.query as unknown as IQuery;
  switch (query.type) {
    case 'getAllMatchedUsers':
      try {
        // Use Firestore for fetching users
        const users = await firestore.collection('users').get();
        const userData = users.docs.map((doc) => doc.data());
        response.send(userData);
      } catch (error) {
        response.status(500).send('Error fetching users: ' + error);
      }
      break;
    // ... add more cases as needed
    default:
      response.send('Unknown GET action');
      break;
  }
});

app.post('/', async (request: express.Request, response: express.Response) => {
  const body: IRequest = request.body;

  switch (body.type) {
    case 'personThatILike':
      if (!body.myId || !body.ThePersonThatILiked) {
        return response.status(400).send('Required parameters are missing.');
      }

      try {
        // Use Firestore for handling interactions
        // For example, you can add data to Firestore here
        const result = await firestore.collection('interactions').add({
          myId: body.myId,
          ThePersonThatILiked: body.ThePersonThatILiked,
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
        });

        response.send(`Interaction added with ID: ${result.id}`);
      } catch (error) {
        response.status(500).send(error);
      }
      break;
    // ... add more cases as needed
    default:
      response.send('Unknown POST action');
      break;
  }
});

export const api = functions.https.onRequest(app);
