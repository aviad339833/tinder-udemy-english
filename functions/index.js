const functions = require("firebase-functions");
const admin = require("firebase-admin");
const express = require("express");
const cors = require("cors");

admin.initializeApp();
const firestore = admin.firestore();

const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

const TIMEOUT_DURATION = 10000; // 10 seconds

// Utility function for sending error responses.
function sendErrorResponse(res, status, message) {
  console.error(message);
  if (process.env.NODE_ENV !== "production") {
    res.status(status).send(message);
  } else {
    res.status(status).send("An error occurred. Please try again.");
  }
}

app.get("/", async (req, res) => {
  let timeout;

  try {
    timeout = setTimeout(() => {
      sendErrorResponse(res, 500, "Request timed out.");
    }, TIMEOUT_DURATION);

    const userId = req.query.userId;
    console.log("Received userId:", userId);

    if (!userId || typeof userId !== "string" || userId.length !== 28) {
      return sendErrorResponse(
        res,
        400,
        `Invalid or missing userId received: ${userId}`
      );
    }

    const userSnapshot = await firestore.collection("users").doc(userId).get();

    if (!userSnapshot.exists) {
      return sendErrorResponse(
        res,
        404,
        `User not found for userId: ${userId}`
      );
    }

    const currentUser = userSnapshot.data();
    const userInterestInGender = currentUser.userInterestInGender;

    if (!userInterestInGender) {
      return sendErrorResponse(
        res,
        400,
        `User's gender preference not found for userId: ${userId}`
      );
    }

    // Fetch list of users from subcollections
    const likedUserIds = await fetchUserIdsInBatches(
      firestore.collection("users").doc(userId).collection("usersThatILike")
    );

    const dislikedUserIds = await fetchUserIdsInBatches(
      firestore.collection("users").doc(userId).collection("iDislikeThem")
    );

    console.log("Liked User IDs:", likedUserIds);
    console.log("Disliked User IDs:", dislikedUserIds);

    const excludeIds = [userId, ...likedUserIds, ...dislikedUserIds];

    const allUsers = await firestore
      .collection("users")
      .where("gender", "==", userInterestInGender)
      .where(admin.firestore.FieldPath.documentId(), "not-in", excludeIds)
      .limit(50)
      .get();

    const results = allUsers.docs.map((doc) => doc.data());

    console.log(
      "Sending response with",
      results.length,
      "users for userId:",
      userId
    );

    clearTimeout(timeout); // Clear the timeout before sending the response
    res.status(200).send(results);
  } catch (error) {
    clearTimeout(timeout);
    sendErrorResponse(res, 500, `Error occurred: ${error.message}`);
  }
});

async function fetchUserIdsInBatches(collectionRef) {
  const userIDs = [];
  let query = collectionRef.limit(10); // Fetch in batches of 10

  while (true) {
    const snapshot = await query.get();
    if (snapshot.empty) break;

    snapshot.forEach((doc) => {
      userIDs.push(doc.id);
    });

    // Fetch the next batch
    const lastVisible = snapshot.docs[snapshot.docs.length - 1];
    query = collectionRef.startAfter(lastVisible).limit(10);
  }

  return userIDs;
}

app.post("/userActions", async (req, res) => {
  try {
    const { type, myId, idOfTheOtherPerson } = req.body;

    console.log("Received request:", { type, myId, idOfTheOtherPerson });

    if (type === "personThatILike" || type === "personThatIDislike") {
      await firestore.runTransaction(async (transaction) => {
        console.log("Initiating transaction...");

        const otherPersonRef = firestore
          .collection("users")
          .doc(idOfTheOtherPerson);
        const myRef = firestore.collection("users").doc(myId);

        console.log("Fetching other person's data...");
        const otherPersonData = await transaction.get(otherPersonRef);

        if (!otherPersonData.exists) {
          console.log("Other person does not exist. Exiting transaction.");
          return; // Exit the transaction
        }

        console.log("Checking if the other person has liked me...");
        const theirLikes = await transaction.get(
          otherPersonRef.collection("usersThatILike").doc(myId)
        );

        const currentTimeStamp = admin.firestore.FieldValue.serverTimestamp();

        if (type === "personThatILike" && theirLikes.exists) {
          console.log(
            "Mutual like situation detected between",
            myId,
            "and",
            idOfTheOtherPerson
          );

          // Add both user's IDs, references, and timestamps to each other's "matches" subcollections
          transaction.set(myRef.collection("matches").doc(idOfTheOtherPerson), {
            userId: idOfTheOtherPerson,
            timestamp: currentTimeStamp,
            userRef: otherPersonRef,
          });
          transaction.set(otherPersonRef.collection("matches").doc(myId), {
            userId: myId,
            timestamp: currentTimeStamp,
            userRef: myRef,
          });

          // Create a new chat room for them
          const chatRoomId = firestore.collection("chats").doc().id;
          console.log("Generating chat room with ID:", chatRoomId);

          transaction.set(firestore.collection("chats").doc(chatRoomId), {
            users: [myId, idOfTheOtherPerson],
            timestamp: currentTimeStamp,
          });
          console.log("Saved chat room to DB.");

          // Update user documents to include chat room ID
          console.log("Updating user data with chat room ID...");
          transaction.update(myRef, {
            chats: admin.firestore.FieldValue.arrayUnion(chatRoomId),
          });
          transaction.update(otherPersonRef, {
            chats: admin.firestore.FieldValue.arrayUnion(chatRoomId),
          });
          console.log("Updated user data in DB.");
        }

        if (type === "personThatILike") {
          // Add the liked user to the current user's "usersThatILike" subcollection
          transaction.set(
            myRef.collection("usersThatILike").doc(idOfTheOtherPerson),
            {
              userId: idOfTheOtherPerson,
              timestamp: currentTimeStamp,
              userRef: otherPersonRef,
            }
          );
          console.log("Like added to DB.");

          // Add the current user to the liked user's "usersThatLikedMe" subcollection
          transaction.set(
            otherPersonRef.collection("usersThatLikedMe").doc(myId),
            {
              userId: myId,
              timestamp: currentTimeStamp,
              userRef: myRef,
            }
          );
          console.log(
            "Added me to other person's 'usersThatLikedMe' subcollection."
          );
        } else if (type === "personThatIDislike") {
          transaction.set(
            myRef.collection("iDislikeThem").doc(idOfTheOtherPerson),
            {
              userId: idOfTheOtherPerson,
              timestamp: currentTimeStamp,
              userRef: otherPersonRef,
            }
          );
          console.log("Dislike added to DB.");
        }
      });

      console.log("Transaction completed successfully!");
      res.send("Operation completed successfully!");
    } else {
      console.log("Invalid request type:", type);
      res.status(400).send("Invalid request type.");
    }
  } catch (error) {
    console.error("Transaction Error:", error);
    res.status(500).send("An error occurred.");
  }
});

/**
 * Deletes a collection in batches to avoid out-of-memory errors.
 * Node has a default memory limit of 256MB for a 32-bit process,
 * and 1.4GB for a 64-bit process.
 * @param {CollectionReference} collectionRef - Reference to the collection to delete.
 * @param {number} batchSize - Number of documents to delete in each batch.
 */
async function deleteCollection(collectionRef, batchSize = 500) {
  const query = collectionRef.orderBy("__name__").limit(batchSize);

  return new Promise((resolve, reject) => {
    deleteQueryBatch(query, resolve).catch(reject);
  });
}

async function deleteQueryBatch(query, resolve) {
  const snapshot = await query.get();

  const batchSize = snapshot.size;
  if (batchSize === 0) {
    // When there are no documents left, we are done
    resolve();
    return;
  }

  // Delete documents in a batch
  const batch = firestore.batch();
  snapshot.docs.forEach((doc) => {
    batch.delete(doc.ref);
  });
  await batch.commit();

  // Recurse on the next process tick, to avoid exploding the stack.
  process.nextTick(() => {
    deleteQueryBatch(query, resolve);
  });
}

app.delete("/deleteAllUserSubcollections", async (req, res) => {
  try {
    const deletePromises = [];

    // Delete main chats collection
    const chatsRef = firestore.collection("chats");
    deletePromises.push(deleteCollection(chatsRef));

    // Get all user documents
    const usersSnapshot = await firestore.collection("users").get();

    // Loop through each user
    usersSnapshot.docs.forEach((doc) => {
      if (!doc.id || typeof doc.id !== "string") {
        console.error("Invalid user ID:", doc.id);
        return; // Skip this user and continue with the next
      }

      const userId = doc.id;
      const userData = doc.data();

      // If user has "chats" field, loop through each chat and delete the respective chat document
      if (userData.chats && Array.isArray(userData.chats)) {
        userData.chats.forEach((chatId) => {
          const chatDocumentRef = chatsRef.doc(chatId);
          deletePromises.push(chatDocumentRef.delete());
        });
      }

      // Delete the "chats" field from the user document
      const userRef = firestore.collection("users").doc(userId);
      deletePromises.push(
        userRef.update({ chats: admin.firestore.FieldValue.delete() })
      );

      // Delete subcollections for this user
      ["usersThatILike", "iDislikeThem", "matches", "usersThatLikedMe"].forEach(
        (subCollectionName) => {
          const subCollectionRef = firestore
            .collection("users")
            .doc(userId)
            .collection(subCollectionName);

          deletePromises.push(deleteCollection(subCollectionRef));
        }
      );
    });

    // Wait for all delete operations to complete
    await Promise.all(deletePromises);
    res
      .status(200)
      .send(
        "Successfully deleted the chats collection, user chats field, and subcollections for all users"
      );
  } catch (error) {
    console.error("Error deleting collections and chat fields:", error);
    res.status(500).send(error.message);
  }
});

// Rename the exports to correspond to specific routes
exports.api = functions.https.onRequest(app); // This will include all the routes of your Express app

const generateChatId = (id1, id2) => {
  const array = [id1, id2];
  array.sort();
  return `${array[0]}-${array[1]}`;
};
