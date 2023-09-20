import express from 'express';
import { initializeApp } from 'firebase-admin/app';

initializeApp();

import * as functions from 'firebase-functions';
import { fetchAllUsers } from './userHandlers';
import { handlePersonThatILike } from './userInteractions';
import { resetAllUsers } from './reseteDb';

const app = express(); // Create an instance of the Express application

interface IRequest {
  type: string;
  myId: string;
  ThePersonThatILiked?: string;
  ThePersonThatIDontLiked?: string;
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
        // Use the fetchAllUsers function
        const users = await fetchAllUsers(query.userId); // Pass the userId as an argument
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
});

app.post('/', async (request: express.Request, response: express.Response) => {
  const body: IRequest = request.body;

  switch (body.type) {
    case 'personThatILike':
      if (!body.myId || !body.ThePersonThatILiked) {
        return response.status(400).send('Required parameters are missing.');
      }

      try {
        // Call the function to handle the like interaction and get its result
        const matchResult = await handlePersonThatILike(
          body.myId,
          body.ThePersonThatILiked
        );

        // Send back the result from the handlePersonThatILike function
        response.send(matchResult);
      } catch (error) {
        response.status(500).send(`Error processing interaction: ${error}`);
      }
      break;
    // ... add more cases as needed
    default:
      response.send('Unknown POST action');
      break;
  }
});

app.delete('/reset-all-users', async (request, response) => {
  try {
    await resetAllUsers();
    response.status(200).send('All users have been reset.');
  } catch (error) {
    response.status(500).send(`Error resetting all users: ${error}`);
  }
});

export const api = functions.https.onRequest(app);
