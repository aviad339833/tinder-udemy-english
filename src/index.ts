import { initializeApp } from 'firebase-admin/app';

initializeApp();

import * as functions from 'firebase-functions';
import { fetchAllUsers } from './userHandlers';

export const getRequestHandler = functions.https.onRequest(
  async (request, response) => {
    const type: string = request.query.type as string;
    const userId: string = request.query.userId as string;

    switch (type) {
      case 'getAllMatchedUsers':
        try {
          const users = await fetchAllUsers(userId);
          response.send(users);
        } catch (error) {
          response.status(500).send('Error fetching users: ' + error);
        }
        break;
      // ... add more cases as needed

      default:
        response.send('Unknown GET action');
        break;
    }
  }
);

export const postRequestHandler = functions.https.onRequest(
  async (request, response) => {
    const body = request.body;
    const type: string = body.type;

    switch (type) {
      case 'action1':
        // Handle action1 for POST request
        // ...
        response.send('Handled action1 for POST');
        break;

      default:
        response.send('Unknown POST action');
        break;
    }
  }
);
