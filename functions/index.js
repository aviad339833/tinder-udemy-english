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
    console.log("Received GET request for user with ID:", userId);

    // Get the user's profile
    const userSnapshot = await firestore.collection("users").doc(userId).get();
    if (!userSnapshot.exists) {
      console.log("User not found for ID:", userId);
      return res.status(404).send("User not found");
    }

    const currentUser = userSnapshot.data();
    const userInterestInGender = currentUser.userInterestInGender;
    console.log("User's gender preference:", userInterestInGender);

    if (!userInterestInGender) {
      console.log("User's gender preference not found for ID:", userId);
      return res.status(400).send("User's gender preference not found");
    }

    // Get list of users from the subcollections "iLikeThem" and "iDislikeThem"
    const likedUsersSnapshot = await firestore
      .collection("users")
      .doc(userId)
      .collection("iLikeThem")
      .get();
    const dislikedUsersSnapshot = await firestore
      .collection("users")
      .doc(userId)
      .collection("iDislikeThem")
      .get();

    const likedUserIds = likedUsersSnapshot.docs.map((doc) => doc.id);
    const dislikedUserIds = dislikedUsersSnapshot.docs.map((doc) => doc.id);
    const excludeIds = [userId, ...likedUserIds, ...dislikedUserIds];

    // Fetch users limited to 50, excluding the current user, users from the "iLikeThem" and "iDislikeThem" collections, and matching the gender preference
    let allUsers = await firestore
      .collection("users")
      .where("gender", "==", userInterestInGender)
      .where(admin.firestore.FieldPath.documentId(), "not-in", excludeIds)
      .limit(50)
      .get();

    const results = [];
    allUsers.forEach((doc) => {
      results.push(doc.data());
    });

    console.log("Sending response with results:", results);
    res.status(200).send(results);
  } catch (error) {
    console.error("Error occurred:", error);
    res.status(500).send(error.message);
  }
});

app.post("/", async (req, res) => {
  try {
    const { type, myId, idOfTheOtherPerson } = req.body;

    // Log the received data
    console.log("Received POST request:");
    console.log(`type: ${type}`);
    console.log(`myId: ${myId}`);

    switch (type) {
      case "personThatIDislike":
        try {
          // Add the disliked person to the current user's iDislikeThem collection
          await firestore
            .collection("users")
            .doc(myId)
            .collection("iDislikeThem")
            .doc(idOfTheOtherPerson)
            .set(
              {
                uid: idOfTheOtherPerson,
                timestamp: admin.firestore.FieldValue.serverTimestamp(),
                documentReference: firestore
                  .collection("users")
                  .doc(idOfTheOtherPerson),
              },
              { merge: true }
            );

          // Delete the liked person from the current user's iLikeThem collection
          await firestore
            .collection("users")
            .doc(myId)
            .collection("iLikeThem")
            .doc(idOfTheOtherPerson)
            .delete();

          res.status(200).send("Dislike recorded successfully");
        } catch (error) {
          console.error("Error in personThatIDislike:", error);
          res.status(500).send(error.message || "Internal server error");
        }
        break;

      case "personThatILike":
        console.log("Processing request for 'personThatILike'.");
        console.log("myId:", myId); // Logging the current user's ID
        console.log("idOfTheOtherPerson:", idOfTheOtherPerson); // Logging the other person's ID

        try {
          // Check if the clicked user has liked the current user
          const theyLikeMeSnapshot = await firestore
            .collection("users")
            .doc(idOfTheOtherPerson)
            .collection("theyLikeMe")
            .doc(myId)
            .get();

          if (theyLikeMeSnapshot.exists) {
            // This means they like each other
            const otherPersonObject = {
              uid: idOfTheOtherPerson,
              documentReference: firestore
                .collection("users")
                .doc(idOfTheOtherPerson),
            };
            const myObject = {
              uid: myId,
              documentReference: firestore.collection("users").doc(myId),
            };
            await firestore
              .collection("users")
              .doc(idOfTheOtherPerson)
              .collection("weLikeEachOther")
              .doc(myId)
              .set(myObject, { merge: true });
            await firestore
              .collection("users")
              .doc(myId)
              .collection("weLikeEachOther")
              .doc(idOfTheOtherPerson)
              .set(otherPersonObject, { merge: true });
            await firestore
              .collection("users")
              .doc(myId)
              .collection("theyLikeMe")
              .doc(idOfTheOtherPerson)
              .delete();
            const idOfDocument = generateChatId(myId, idOfTheOtherPerson);
            await firestore
              .collection("chats")
              .doc(idOfDocument)
              .set(
                {
                  idsConcatenated: idOfDocument,
                  arrayOfPeopleInConversation: [myId, idOfTheOtherPerson],
                },
                { merge: true }
              );
            res.status(200).send("We like Each other successfully done");
          } else {
            // Add the current user (myId) to the liked person's theyLikeMe collection
            await firestore
              .collection("users")
              .doc(myId)
              .collection("iLikeThem")
              .doc(idOfTheOtherPerson)
              .set(
                {
                  uid: idOfTheOtherPerson,
                  timestamp: admin.firestore.FieldValue.serverTimestamp(),
                  documentReference: firestore
                    .collection("users")
                    .doc(idOfTheOtherPerson),
                },
                { merge: true }
              );
            await firestore
              .collection("users")
              .doc(idOfTheOtherPerson)
              .collection("theyLikeMe")
              .doc(myId)
              .set(
                {
                  uid: myId,
                  timestamp: admin.firestore.FieldValue.serverTimestamp(),
                  documentReference: firestore.collection("users").doc(myId),
                },
                { merge: true }
              );
            console.log("You liked a person successfully."); // Logging success message
            res.status(200).send("You liked a person successfully");
          }
        } catch (error) {
          console.error("Error in personThatILike:", error);
          res.status(500).send(error.message || "Internal server error");
        }
        break;

      case "breakMatch":
        const id = generateChatId(myId, idOfTheOtherPerson);
        const listMessageDocuments = await firestore
          .collection("chats")
          .doc(id)
          .collection("messages")
          .listDocuments();
        listMessageDocuments.forEach((eachDoc) => {
          eachDoc.delete();
        });
        await firestore.collection("chats").doc(id).delete();
        const path1 = `users/${myId}/weLikeEachOther/${idOfTheOtherPerson}`;
        const path2 = `users/${idOfTheOtherPerson}/weLikeEachOther/${myId}`;
        await firestore.doc(path1).delete();
        await firestore.doc(path2).delete();
        res.status(200).send("Deletion successful");
        break;

      default:
        res.status(400).send("Invalid type provided");
    }
  } catch (error) {
    res.status(500).send(error.message);
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

app.delete("/deleteChats", async (req, res) => {
  try {
    const chatsRef = firestore.collection("chats");
    await deleteCollection(chatsRef);
    res.status(200).send("Successfully deleted the entire chats collection");
  } catch (error) {
    console.error("Error deleting chats collection:", error);
    res.status(500).send(error.message);
  }
});

app.delete("/deleteAllUserSubcollections", async (req, res) => {
  try {
    // Get all user documents
    const usersSnapshot = await firestore.collection("users").get();

    const deletePromises = [];

    // Loop through each user
    usersSnapshot.docs.forEach((doc) => {
      if (!doc.id || typeof doc.id !== "string") {
        console.error("Invalid user ID:", doc.id);
        return; // Skip this user and continue with the next
      }

      const userId = doc.id;

      // Delete subcollections for this user
      ["iDislikeThem", "iLikeThem", "theyLikeMe"].forEach(
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
    res.status(200).send("Successfully deleted subcollections for all users");
  } catch (error) {
    console.error("Error deleting subcollections:", error);
    res.status(500).send(error.message);
  }
});

// Rename the exports to correspond to specific routes
exports.api = functions.https.onRequest(app); // This will include all the routes of your Express app

// If you want to separate each route as a different cloud function (which I wouldn't recommend for scalability), you could do it like this:
exports.getUserData = functions.https.onRequest(app);
exports.userActions = functions.https.onRequest(app);
exports.deleteChats = functions.https.onRequest(app);

const generateChatId = (id1, id2) => {
  const array = [id1, id2];
  array.sort();
  return `${array[0]}-${array[1]}`;
};
