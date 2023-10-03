import express from 'express';
import { initializeApp } from 'firebase-admin/app';

/* eslint-disable operator-linebreak */

initializeApp();
import * as functions from 'firebase-functions';

import * as admin from 'firebase-admin';
const firestore = admin.firestore();
import {
  checkForMatchAndCreateChat,
  dislikeUser,
  doesChatExist,
  fetchAllMatchesForUser,
  fetchChatBetweenUsers,
  fetchChatMessagesForChatId,
  fetchPotentialMatches,
  fetchUsersILike,
  likeUser,
  sendMessage,
} from './userHandlers';

const app = express();

// works
app.get('/fetchPotentialMatches', async (req, res) => {
  const userId = req.query.userId as string;
  if (!userId) {
    return res.status(400).send('userId is required.');
  }

  const users = await fetchPotentialMatches(userId);
  res.send(users);
});

app.get('/fetchAllMatchesForUser', async (req, res) => {
  const userId = req.query.userId as string;
  if (!userId) {
    return res.status(400).send('userId is required.');
  }

  const matches = await fetchAllMatchesForUser(userId);
  res.send(matches);
});

app.get('/fetchChatMessages', async (req, res) => {
  const chatId = req.query.chatId as string;
  const limit = parseInt(req.query.limit as string) || undefined;

  if (!chatId) {
    return res.status(400).send('chatId is required.');
  }

  const chatMessages = await fetchChatMessagesForChatId(chatId, limit);
  res.send(chatMessages);
});

app.get('/fetchUsersILike', async (req, res) => {
  const userId = req.query.userId as string;
  const limit = parseInt(req.query.limit as string) || 20;

  if (!userId) {
    return res.status(400).send('userId is required.');
  }

  const likedUsers = await fetchUsersILike(userId, limit);
  res.send({ likedUsers });
});

app.get('/fetchChatBetweenUsers', async (req, res) => {
  const userId = req.query.userId as string;
  const secondUserId = req.query.secondUserId as string;

  if (!userId || !secondUserId) {
    return res.status(400).send('Both userId and secondUserId are required.');
  }

  const chatMessages = await fetchChatBetweenUsers(userId, secondUserId);
  res.send(chatMessages);
});

// post
app.post('/likeUser', async (req, res) => {
  const { currentUserId, targetUserId } = req.body;
  if (!targetUserId || !currentUserId) {
    return res.status(400).send('ThePersonThatILiked parameter is missing.');
  }

  await likeUser(currentUserId, targetUserId);
  // Now, check for a mutual match
  const matchResult = await checkForMatchAndCreateChat(
    currentUserId,
    targetUserId
  );
  res.json(matchResult);
});

app.post('/dislikeUser', async (req, res) => {
  const { currentUserId, targetUserId } = req.body;
  if (!targetUserId || !currentUserId) {
    return res
      .status(400)
      .send('thePersonThatIDontLiked parameter is missing.');
  }

  const notLikeResult = await dislikeUser(currentUserId, targetUserId);
  res.send(notLikeResult);
});

app.post('/sendMessage', async (req, res) => {
  const { chatId, myId, message } = req.body;

  if (!chatId || !message) {
    return res.status(400).send({
      success: false,
      message: 'Both chatId and message are required.',
    });
  }

  const chatExists = await doesChatExist(chatId);

  if (!chatExists) {
    return res.status(400).send({
      success: false,
      message: 'No chat found with the provided chatId.',
    });
  }

  const sendResult = await sendMessage(chatId, myId, message);

  if (sendResult.success) {
    res.status(200).send(sendResult);
  } else {
    res.status(500).send(sendResult);
  }
});

export const api = functions.https.onRequest(app);

// listeners!
exports.listenToNewNotifications = functions.firestore
  .document('users/{userId}/notifications/{notificationId}')
  .onCreate(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async (
      snap: functions.firestore.QueryDocumentSnapshot,
      context: functions.EventContext
    ) => {
      const userId = context.params.userId;

      // Logging the userId to check if the function gets triggered
      functions.logger.log(`Notification created for user: ${userId}`);

      const userDocRef = firestore.collection('users').doc(userId);
      const userDoc = await userDocRef.get();

      if (userDoc.exists) {
        functions.logger.log(
          `Updating notification status for user: ${userId}`
        );
        await userDocRef.update({ hasNewNotification: true });
      } else {
        // Logging that the user document was not found
        functions.logger.warn(
          `User: ${userId} not found. Creating a new user document.`
        );

        await userDocRef.set({
          hasNewNotification: true,
          // ... any other default fields you want for a new user document
        });
      }
    }
  );
