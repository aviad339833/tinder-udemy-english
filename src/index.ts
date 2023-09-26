import express from 'express';
import { initializeApp } from 'firebase-admin/app';

initializeApp();

import * as functions from 'firebase-functions';
import {
  chatExistsBetweenUsers,
  checkForMatchAndCreateChat,
  createChatBetweenUsers,
  dislikeUser,
  fetchAllMatchesForUser,
  fetchChatBetweenUsers,
  fetchChatMessagesForChatId,
  fetchPotentialMatches,
  fetchUsersILike,
  likeUser,
  sendMessage,
} from './userHandlers';
import { resetAllUsers } from './reseteDb';

const app = express();

interface IRequest {
  type: string;
  myId: string;
  ThePersonThatILiked?: string;
  thePersonThatIDontLiked?: string;
  // For sending a message
  recipientId?: string; // ID of the user to whom the message is being sent
  message?: string; // The actual message text/content
}

interface IQuery {
  type: string;
  userId?: string;
  secondUserId?: string;
  chatId?: string;
  limit?: number;
}

app.get('/', async (request: express.Request, response: express.Response) => {
  const query = request.query as unknown as IQuery;

  console.log('started query', query);
  switch (query.type) {
    case 'fetchPotentialMatches': {
      if (!query.userId) {
        response.status(400).send('userId is required.');
        return;
      }
      const users = await fetchPotentialMatches(query.userId);
      response.send(users);
      break;
    }
    case 'fetchAllMatches': {
      if (!query.userId) {
        response.status(400).send('userId is required.');
        return;
      }
      const matches = await fetchAllMatchesForUser(query.userId);
      response.send(matches);
      break;
    }

    case 'fetchChatMessages': {
      if (!query.chatId) {
        response.status(400).send('chatId is required.');
        return;
      }

      const chatMessages = await fetchChatMessagesForChatId(
        query.chatId,
        query.limit
      );
      response.send(chatMessages);
      break;
    }

    case 'fetchUsersILike': {
      if (!query.userId) {
        response.status(400).send('userId is required.');
        return;
      }
      const likedUsers = await fetchUsersILike(query.userId, query.limit || 20);
      response.send({ likedUsers });
      break;
    }
    case 'fetchChatBetweenUsers': {
      if (!query.userId || !query.secondUserId) {
        response.status(400).send('Both userId and secondUserId are required.');
        return;
      }

      const chatMessages = await fetchChatBetweenUsers(
        query.userId,
        query.secondUserId
      );
      response.send(chatMessages);
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

    case 'sendMessage': {
      // Validate the necessary parameters
      if (!body.recipientId || !body.message) {
        return response.status(400).send({
          success: false,
          message: 'Both recipientId and message are required.',
        });
      }

      let chatId = await chatExistsBetweenUsers(body.myId, body.recipientId);

      // If no chat exists between the users, create one
      if (!chatId) {
        chatId = await createChatBetweenUsers(body.myId, body.recipientId);
      }

      // Send the message and get the result
      const sendResult = await sendMessage(chatId, body.myId, body.message);

      if (sendResult.success) {
        response.status(200).send(sendResult);
      } else {
        response.status(500).send(sendResult);
      }
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
