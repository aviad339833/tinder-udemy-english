import express from 'express';
import { initializeApp } from 'firebase-admin/app';

initializeApp();

import * as functions from 'firebase-functions';
import {
  checkForMatchAndCreateChat,
  dislikeUser,
  fetchAllMatchesForUser,
  fetchPotentialMatches,
  fetchUsersILike,
  likeUser,
} from './userHandlers';
import { resetAllUsers } from './reseteDb';

const app = express();

interface IRequest {
  type: string;
  myId: string;
  ThePersonThatILiked?: string;
  thePersonThatIDontLiked?: string;
}

interface IQuery {
  limit: number;
  type: string;
  userId: string;
}

app.get('/', async (request: express.Request, response: express.Response) => {
  const query = request.query as unknown as IQuery;
  console.log('started query', query);
  switch (query.type) {
    case 'fetchPotentialMatches': {
      const users = await fetchPotentialMatches(query.userId);
      response.send(users);
      break;
    }
    case 'fetchAllMatches': {
      const matches = await fetchAllMatchesForUser(query.userId);
      response.send(matches);
      break;
    }
    case 'fetchUsersILike': {
      const likedUsers = await fetchUsersILike(query.userId, query.limit || 20);
      response.send({ likedUsers });
      break;
    }
    default:
      response.send('Unknown GET action');
      break;
  }
});

app.post('/', async (request: express.Request, response: express.Response) => {
  const body: IRequest = request.body;
  console.log('body', body);
  switch (body.type) {
    case 'personThatILike': {
      if (!body.ThePersonThatILiked) {
        return response
          .status(400)
          .send('ThePersonThatILiked parameter is missing.');
      }

      // Register the "like" action for the current user
      await likeUser(body.myId, body.ThePersonThatILiked);

      // Now, check for a mutual match
      const matchResult = await checkForMatchAndCreateChat(
        body.myId,
        body.ThePersonThatILiked
      );
      response.send(matchResult);
      break;
    }

    case 'personThatIDislike': {
      if (!body.thePersonThatIDontLiked) {
        return response
          .status(400)
          .send('ThePersonThatILiked parameter is missing.');
      }
      const notLikeResult = await dislikeUser(
        body.myId,
        body.thePersonThatIDontLiked
      );
      response.send(notLikeResult);
      break;
    }
    default:
      response.send('Unknown POST action');
      break;
  }
});

app.delete('/reset-all-users', async (request, response) => {
  await resetAllUsers();
  response.status(200).send('All users have been reset.');
});

export const api = functions.https.onRequest(app);
