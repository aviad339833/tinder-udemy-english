import * as functions from 'firebase-functions';

type MessageType = {
  content: string;
  senderId: string;
  timestamp: unknown; // Use the appropriate type based on your timestamp
  // Include any other fields as needed
};

/* eslint-disable operator-linebreak */
import * as admin from 'firebase-admin';

const firestore = admin.firestore();

export const fetchPotentialMatches = async (
  userId: string
): Promise<{ users: admin.firestore.DocumentData[] }> => {
  console.log(`Fetching potential matches for user with ID: ${userId}`);

  const TARGET_SIZE = 20; // Desired number of potential matches
  const BATCH_SIZE = 100; // Fetch size for each query

  const interactionsCollection = firestore
    .collection('users')
    .doc(userId)
    .collection('interactions');
  const likedAndDislikedUsers = await interactionsCollection.get();
  const excludedUserIds = likedAndDislikedUsers.docs.map((doc) => doc.id);
  excludedUserIds.push(userId); // Exclude the user themself

  const currentUserDoc = await firestore.collection('users').doc(userId).get();
  const currentUserData = currentUserDoc.data();
  if (!currentUserData) throw new Error('User not found');

  const userInterestInGender = currentUserData.userInterestInGender;

  let lastDoc; // To keep track of where to start in the next batch
  let potentialMatches: admin.firestore.DocumentData[] = [];

  while (potentialMatches.length < TARGET_SIZE) {
    let usersQuery = firestore
      .collection('users')
      .where('gender', '==', userInterestInGender)
      .orderBy('created_time')
      .limit(BATCH_SIZE);

    if (lastDoc) {
      usersQuery = usersQuery.startAfter(lastDoc);
    }

    const usersSnapshot = await usersQuery.get();
    if (usersSnapshot.empty) break; // Exit if no more users to fetch

    lastDoc = usersSnapshot.docs[usersSnapshot.docs.length - 1];

    const filteredUsers = usersSnapshot.docs
      .filter((doc) => !excludedUserIds.includes(doc.id))
      .map((doc) => ({ id: doc.id, ...doc.data() }));

    potentialMatches.push(...filteredUsers);
  }

  // If there are more than the target size due to the last batch, slice it
  if (potentialMatches.length > TARGET_SIZE) {
    potentialMatches = potentialMatches.slice(0, TARGET_SIZE);
  }

  console.log(
    `Fetched ${potentialMatches.length} potential matches for user with ID: ${userId}.`
  );
  return { users: potentialMatches };
};

export const dislikeUser = async (
  currentUserId: string,
  targetUserId: string
) => {
  console.log(
    `User with ID ${currentUserId} dislikes user with ID ${targetUserId}`
  );

  // 1. Recording the Dislike
  const currentUserInteractions = firestore
    .collection('users')
    .doc(currentUserId)
    .collection('interactions');

  const dislikeData = {
    targetUserId: targetUserId,
    interactionType: 'dislike',
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
  };

  // eslint-disable-next-line max-len
  await currentUserInteractions.doc(targetUserId).set(dislikeData); // Here the document ID is set as the targetUserId to prevent duplication

  // 2. Optionally Notify the Disliked User
  // eslint-disable-next-line max-len
  // (This step can be a push notification or an update in some sort of "views" count, without specifying it was a dislike)

  // 3. Update Metrics (if applicable)
  // (This can involve updating some metrics in the users' collection or another analytics system)

  console.log(
    `Dislike recorded for user with ID ${targetUserId} by user with ID ${currentUserId}`
  );
};

export const likeUser = async (currentUserId: string, targetUserId: string) => {
  console.log(
    `User with ID ${currentUserId} likes user with ID ${targetUserId}`
  );

  // Record the Like for the current user
  const currentUserInteractions = firestore
    .collection('users')
    .doc(currentUserId)
    .collection('interactions');

  const likeData = {
    targetUserId: targetUserId,
    interactionType: 'like',
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
  };

  await currentUserInteractions.doc(targetUserId).set(likeData);

  console.log(
    `Like recorded for user with ID ${targetUserId} by user with ID ${currentUserId}`
  );

  // Add the current user to the liked user's "usersWhoLikedMe" sub-collection
  const targetUserLikedBy = firestore
    .collection('users')
    .doc(targetUserId)
    .collection('usersWhoLikedMe');

  const likedByData = {
    userId: currentUserId,
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
  };

  await targetUserLikedBy.doc(currentUserId).set(likedByData);

  console.log(
    `User with ID ${currentUserId} added to "usersWhoLikedMe" sub-collection of user with ID ${targetUserId}`
  );
};

export const fetchUnreadNotifications = async (
  userId: string
): Promise<{
  unreadMatches: number;
  unreadMessages: number;
  notifications: Array<any>;
}> => {
  const userRef = firestore.collection('users').doc(userId);
  const notificationsRef = userRef
    .collection('notifications')
    .where('viewed', '==', false);

  let unreadMatches = 0;
  let unreadMessages = 0;
  const notifications: Array<any> = [];

  const snapshot = await notificationsRef.get();

  snapshot.forEach((doc) => {
    const notificationData = doc.data();
    notifications.push(notificationData);

    switch (notificationData.type) {
      case 'match':
        unreadMatches++;
        break;
      case 'message':
        unreadMessages++;
        break;
    }
  });

  return { unreadMatches, unreadMessages, notifications };
};

// const markNotificationAsRead = async (
//   userId: string,
//   notificationId: string
// ) => {
//   await firestore
//     .collection('users')
//     .doc(userId)
//     .collection('notifications')
//     .doc(notificationId)
//     .update({ viewed: true });
// };

// Function to check for unread notifications and update the user's document
export const checkNotifications = functions.firestore
  .document('users/{userId}/notifications/{notificationId}')
  .onWrite(async (change, context) => {
    const userId = context.params.userId;

    // Get a reference to the user's document
    const userRef = admin.firestore().collection('users').doc(userId);

    // Query the notifications sub-collection for unread notifications
    const notificationsQuery = userRef
      .collection('notifications')
      .where('viewed', '==', false);

    try {
      // Check if there are any unread notifications
      const notificationsSnapshot = await notificationsQuery.get();
      const hasUnreadNotifications = !notificationsSnapshot.empty;

      // Update the user's document with the 'hasUnreadNotifications' field
      await userRef.update({ hasUnreadNotifications });

      console.log(
        `User ${userId} has unread notifications: ${hasUnreadNotifications}`
      );
    } catch (error) {
      console.error('Error checking notifications:', error);
    }
  });
export const checkForMatchAndCreateChat = async (
  currentUserId: string,
  targetUserId: string
) => {
  console.log(
    `Checking for match between ${currentUserId} and ${targetUserId}`
  );

  const targetUserInteractions = firestore
    .collection('users')
    .doc(targetUserId)
    .collection('interactions');

  const interactionDoc = await targetUserInteractions.doc(currentUserId).get();

  if (
    interactionDoc.exists &&
    interactionDoc.get('interactionType') === 'like'
  ) {
    console.log('Its a match!');

    const currentUserMatches = firestore
      .collection('users')
      .doc(currentUserId)
      .collection('matches');
    const targetUserMatches = firestore
      .collection('users')
      .doc(targetUserId)
      .collection('matches');

    const matchDataForCurrentUser = {
      matchedUserId: targetUserId,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    };

    await currentUserMatches.doc(targetUserId).set(matchDataForCurrentUser);

    const matchDataForTargetUser = {
      matchedUserId: currentUserId,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    };

    await targetUserMatches.doc(currentUserId).set(matchDataForTargetUser);

    // Create a new chat for the matched users
    const chatData = {
      user1Id: currentUserId,
      user2Id: targetUserId,
      lastMessageTimestamp: admin.firestore.FieldValue.serverTimestamp(),
    };

    const chatRef = await firestore.collection('chats').add(chatData);

    // Notification for current user
    const notificationForCurrentUser = {
      type: 'match',
      fromUserId: targetUserId,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      content: 'You have a new match!',
      viewed: false,
    };
    firestore
      .collection('users')
      .doc(currentUserId)
      .collection('notifications')
      .add(notificationForCurrentUser);

    // Notification for target user
    const notificationForTargetUser = {
      type: 'match',
      fromUserId: currentUserId,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      content: 'You have a new match!',
      viewed: false,
    };
    firestore
      .collection('users')
      .doc(targetUserId)
      .collection('notifications')
      .add(notificationForTargetUser);

    console.log(
      `Matched and chat created for ${currentUserId} and ${targetUserId}`
    );

    return {
      status: 'matched',
      chatId: chatRef.id,
    };
  }

  console.log(`No match found between ${currentUserId} and ${targetUserId}`);
  return 'liked';
};

export const sendMessage = async (
  chatId: string,
  senderId: string,
  content: string
): Promise<{ success: boolean; message: string }> => {
  try {
    const chatRef = firestore.collection('chats').doc(chatId);
    const chatDoc = await chatRef.get();

    if (!chatDoc.exists) {
      throw new Error('Chat does not exist.');
    }

    const chatData = chatDoc.data();

    if (!chatData) {
      throw new Error('Chat data is unavailable.');
    }

    const user1Id = chatData.user1Id;
    const user2Id = chatData.user2Id;

    // Identify the recipient
    const recipientId = user1Id === senderId ? user2Id : user1Id;

    const messagesRef = chatRef.collection('messages');

    // Including the 'read' field set to false
    const messageData = {
      senderId: senderId,
      content: content,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      read: false, // Indicates the message is unread
    };

    await messagesRef.add(messageData);

    await chatRef.update({
      lastMessageTimestamp: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Create a notification for the recipient
    const notificationData = {
      type: 'message',
      fromUserId: senderId,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      content: 'You have a new message!',
      viewed: false,
    };
    firestore
      .collection('users')
      .doc(recipientId)
      .collection('notifications')
      .add(notificationData);

    return { success: true, message: 'Message sent successfully.' };
  } catch (error) {
    console.error('Error sending message:', error); // Logging the specific error message
    return { success: false, message: 'Failed to send message.' };
  }
};

export const fetchUsersILike = async (
  userId: string,
  limit: number
): Promise<string[]> => {
  console.log(
    `[fetchUsersILike] Fetching liked users for user with ID: ${userId} with limit: ${limit}`
  ); // Logging the start of the function

  const interactionsCollection = firestore.collection('interactions');
  const likedUsers: string[] = [];

  try {
    console.log(
      `[fetchUsersILike] Fetching liked users for userId: ${userId} up to limit: ${limit}`
    ); // Logging before fetching liked users

    // Fetch all users that the given user has "liked" up to the specified limit.
    const likesSnapshot = await interactionsCollection
      .where('userId', '==', userId)
      .where('interactionType', '==', 'like')
      .limit(limit)
      .get();

    likesSnapshot.forEach((doc) => {
      likedUsers.push(doc.data().otherUserId);
    });

    console.log(
      `[fetchUsersILike] User ${userId} has liked the following users:`,
      likedUsers
    ); // Logging liked users

    return likedUsers;
  } catch (error) {
    console.error(
      `[fetchUsersILike] Error fetching liked users for user ${userId}: ${error}`
    );
    throw new Error(`Error fetching liked users for user: ${error}`);
  }
};

export const fetchAllMatchesForUser = async (
  userId: string,
  page = 1,
  pageSize = 20
): Promise<unknown[]> => {
  console.log(`Fetching page ${page} of matches for user with ID: ${userId}`);

  const matchesCollection = firestore
    .collection('users')
    .doc(userId)
    .collection('matches');

  const matchesSnapshot = await matchesCollection
    .orderBy('timestamp', 'desc')
    .offset((page - 1) * pageSize)
    .limit(pageSize)
    .get();

  const results: unknown[] = [];
  for (const matchDoc of matchesSnapshot.docs) {
    const matchedUserId = matchDoc.id;

    // Fetch matched person's data
    const matchedUserDoc = await firestore
      .collection('users')
      .doc(matchedUserId)
      .get();
    const matchedPersonData = matchedUserDoc.data();

    // Fetch last message between the two users
    const chatRef = firestore
      .collection('chats')
      .where('user1Id', 'in', [userId, matchedUserId])
      .where('user2Id', 'in', [userId, matchedUserId]);

    const chatSnapshot = await chatRef.get();
    let lastMessage: any = null;
    let chatId: string | null = null; // Initialize chatId
    if (!chatSnapshot.empty) {
      const chatDoc = chatSnapshot.docs[0];
      chatId = chatDoc.id; // Extract the chatId
      const lastMessageSnapshot = await chatDoc.ref
        .collection('messages')
        .orderBy('timestamp', 'desc')
        .limit(1)
        .get();

      if (!lastMessageSnapshot.empty) {
        lastMessage = lastMessageSnapshot.docs[0].data();
      }
    }

    results.push({
      matchedPersonData,
      lastMessage,
      chatId, // Include the chatId in the result
    });
  }

  console.log(
    `Fetched ${results.length} matches for user with ID: ${userId}, page ${page}`
  );

  return results;
};

// NEW FUNCITNS
export const fetchChatBetweenUsers = async (
  user1Id: string,
  user2Id: string
) => {
  console.log(`Fetching chat between ${user1Id} and ${user2Id}`);

  const chatId = await chatExistsBetweenUsers(user1Id, user2Id);
  if (!chatId) {
    return []; // No chat exists between the users
  }

  const chatDetails = await fetchChatDetails(chatId);
  if (!chatDetails) {
    return []; // Chat details not found
  }

  const messages = await fetchChatMessages(chatId);

  return {
    chatDetails,
    messages,
  };
};

export const fetchChatMessages = async (chatId: string, limit = 50) => {
  const messagesRef = firestore
    .collection('chats')
    .doc(chatId)
    .collection('messages'); // Reference to the messages sub-collection

  const messagesSnapshot = await messagesRef
    .orderBy('timestamp', 'asc')
    .limit(limit)
    .get();
  const messages = messagesSnapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));

  return messages;
};

export const fetchChatDetails = async (chatId: string) => {
  const chatDoc = await firestore.collection('chats').doc(chatId).get();
  if (!chatDoc.exists) return null;
  return chatDoc.data();
};

export const chatExistsBetweenUsers = async (
  user1Id: string,
  user2Id: string
): Promise<string | null> => {
  try {
    let chatsSnapshot = await firestore
      .collection('chats')
      .where('user1Id', '==', user1Id)
      .where('user2Id', '==', user2Id)
      .limit(1)
      .get();

    if (chatsSnapshot.empty) {
      chatsSnapshot = await firestore
        .collection('chats')
        .where('user1Id', '==', user2Id)
        .where('user2Id', '==', user1Id)
        .limit(1)
        .get();
    }

    return !chatsSnapshot.empty ? chatsSnapshot.docs[0].id : null;
  } catch (error) {
    console.error('Error checking chat existence:', error);
    return null;
  }
};

export const createChatBetweenUsers = async (
  user1Id: string,
  user2Id: string
) => {
  const chatRef = await firestore.collection('chats').add({
    user1Id: user1Id,
    user2Id: user2Id,
    lastMessageTimestamp: admin.firestore.FieldValue.serverTimestamp(),
  });
  return chatRef.id;
};

export const fetchChatMessagesForChatId = async (
  chatId: string,
  limit?: number
): Promise<MessageType[]> => {
  console.log(`Fetching messages for chat ID: ${chatId}`);

  // Define a default limit if not provided
  limit = limit ?? 50;

  const messagesCollection = firestore
    .collection('chats')
    .doc(chatId)
    .collection('messages');

  const messagesSnapshot = await messagesCollection
    .orderBy('timestamp', 'asc')
    .limit(limit)
    .get();

  const messages: MessageType[] = [];
  messagesSnapshot.forEach((doc) => {
    const messageData = doc.data() as MessageType;
    messages.push(messageData);
  });

  console.log(`Fetched ${messages.length} messages for chat ID: ${chatId}`);

  return messages;
};

export const doesChatExist = async (chatId: string): Promise<boolean> => {
  try {
    const chatRef = firestore.collection('chats').doc(chatId);
    const chatDoc = await chatRef.get();
    return chatDoc.exists;
  } catch (error) {
    console.error('Error checking chat existence:', error);
    return false;
  }
};
