import express from 'express';
import { initializeApp } from 'firebase-admin/app';

initializeApp();

import * as functions from 'firebase-functions';
import { fetchAllUsers } from './userHandlers';
import {
  handlePersonThatIDontLike,
  handlePersonThatILike,
} from './userInteractions';
import { resetAllUsers } from './reseteDb';

const app = express(); // Create an instance of the Express application

interface IRequest {
  type: string;
  myId: string;
  ThePersonThatILiked?: string;
  thePersonThatIDontLiked?: string;
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
        // Use the fetchAllUsers function without passing lastUserId
        const users = await fetchAllUsers(query.userId);
        response.send(users);
      } catch (error) {
        console.error('Error fetching users:', error);
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
  console.log('body.type start', body.type);
  console.log('body', body);

  switch (body.type) {
    case 'personThatILike':
      if (!body.myId || !body.ThePersonThatILiked) {
        const errorMessage = 'Required parameters are missing.';
        console.error(errorMessage);
        return response.status(400).send(errorMessage);
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
        console.error('Error processing interaction:', error);
        response.status(500).send(`Error processing interaction: ${error}`);
      }
      break;

    case 'personThatIDontLike':
      if (!body.myId || !body.thePersonThatIDontLiked) {
        const errorMessage = 'Required parameters are missing for not liking.';
        console.error(errorMessage);
        return response.status(400).send(errorMessage);
      }

      try {
        // Call the function to handle the interaction for not liking
        const notLikeResult = await handlePersonThatIDontLike(
          body.myId,
          body.thePersonThatIDontLiked
        );

        // Send back the result from the handlePersonThatIDontLike function
        response.send(notLikeResult);
      } catch (error) {
        console.error('Error processing not liking interaction:', error);
        response
          .status(500)
          .send(`Error processing not liking interaction: ${error}`);
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
    console.error('Error resetting all users:', error);
    response.status(500).send(`Error resetting all users: ${error}`);
  }
});

export const api = functions.https.onRequest(app);
