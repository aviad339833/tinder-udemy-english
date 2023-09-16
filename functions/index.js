const functions = require("firebase-functions");
const admin = require("firebase-admin");
const express = require("express");
const cors = require("cors");

admin.initializeApp();
const firestore = admin.firestore();

const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

app.get("/", async (req, res) => {
  try {
    const userId = req.query.userId;
    console.log("Received userId:", userId);

    // Validate userId
    if (!userId || typeof userId !== "string" || userId.length !== 28) {
      // Assume a valid user ID is a string of 28 characters.
      console.warn("Invalid or missing userId received:", userId);
      return res.status(400).send("Invalid or missing userId.");
    }

    // Fetch the user's profile
    const userSnapshot = await firestore.collection("users").doc(userId).get();

    if (!userSnapshot.exists) {
      console.warn("User not found for userId:", userId);
      return res.status(404).send("User not found");
    }

    const currentUser = userSnapshot.data();
    const userInterestInGender = currentUser.userInterestInGender;

    if (!userInterestInGender) {
      console.warn("User's gender preference not found for userId:", userId);
      return res.status(400).send("User's gender preference not found");
    }

    // Fetch list of users from subcollections "usersThatIlike" and "iDislikeThem"
    const likedUsersSnapshot = await firestore
      .collection("users")
      .doc(userId)
      .collection("usersThatIlike")
      .listDocuments();

    const dislikedUsersSnapshot = await firestore
      .collection("users")
      .doc(userId)
      .collection("iDislikeThem")
      .listDocuments();

    const likedUserIds = likedUsersSnapshot.map((doc) => doc.id);
    const dislikedUserIds = dislikedUsersSnapshot.map((doc) => doc.id);
    const excludeIds = [userId, ...likedUserIds, ...dislikedUserIds];

    // Limitation of Firestore's "not-in" operator: it only accepts a maximum of 10 values.
    if (excludeIds.length > 10) {
      console.warn(
        "Too many users in liked/disliked lists for userId:",
        userId
      );
      return res
        .status(500)
        .send("Too many exclusions. Please refine your choices.");
    }

    // Fetch users limited to 50, excluding the current user, users from the "usersThatIlike" and "iDislikeThem" collections, and matching the gender preference
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
    res.status(200).send(results);
  } catch (error) {
    console.error("Error occurred:", error);
    res.status(500).send(error.message);
  }
});

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
          otherPersonRef.collection("usersThatIlike").doc(myId)
        );

        if (type === "personThatILike" && theirLikes.exists) {
          console.log(
            "Mutual like situation detected between",
            myId,
            "and",
            idOfTheOtherPerson
          );

          // Create a new chat room for them
          const chatRoomId = firestore.collection("chats").doc().id;
          console.log("Generating chat room with ID:", chatRoomId);

          transaction.set(firestore.collection("chats").doc(chatRoomId), {
            users: [myId, idOfTheOtherPerson],
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
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
          transaction.set(
            myRef.collection("usersThatIlike").doc(idOfTheOtherPerson),
            { timestamp: admin.firestore.FieldValue.serverTimestamp() }
          );
          console.log("Like added to DB.");
        } else if (type === "personThatIDislike") {
          transaction.set(
            myRef.collection("iDislikeThem").doc(idOfTheOtherPerson),
            { timestamp: admin.firestore.FieldValue.serverTimestamp() }
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

      // Delete subcollections for this user
      ["iDislikeThem", "iLikeThem", "theyLikeMe", "weLikeEachOther"].forEach(
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
        "Successfully deleted the chats collection and subcollections for all users"
      );
  } catch (error) {
    console.error("Error deleting collections:", error);
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
