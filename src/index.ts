import express from 'express';
import { initializeApp } from 'firebase-admin/app';

initializeApp();

import * as functions from 'firebase-functions';
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
import { resetAllUsers } from './reseteDb';

const app = express();

app.get('/fetchPotentialMatches', async (req, res) => {
  const userId = req.query.userId as string;
  if (!userId) {
    return res.status(400).send('userId is required.');
  }

  const users = await fetchPotentialMatches(userId);
  res.send(users);
});

app.get('/fetchAllMatches', async (req, res) => {
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
  const { myId, ThePersonThatILiked } = req.body;
  if (!ThePersonThatILiked) {
    return res.status(400).send('ThePersonThatILiked parameter is missing.');
  }

  await likeUser(myId, ThePersonThatILiked);
  // Now, check for a mutual match
  const matchResult = await checkForMatchAndCreateChat(
    myId,
    ThePersonThatILiked
  );
  res.json(matchResult);
});

app.post('/dislikeUser', async (req, res) => {
  const { myId, thePersonThatIDontLiked } = req.body;
  if (!thePersonThatIDontLiked) {
    return res
      .status(400)
      .send('thePersonThatIDontLiked parameter is missing.');
  }

  const notLikeResult = await dislikeUser(myId, thePersonThatIDontLiked);
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

app.delete('/reset-all-users', async (req, res) => {
  await resetAllUsers();
  res.status(200).send('All users have been reset.');
});

export const api = functions.https.onRequest(app);
