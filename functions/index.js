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

    // Get the user's profile
    const userSnapshot = await firestore.collection("users").doc(userId).get();
    if (!userSnapshot.exists) {
      return res.status(404).send("User not found");
    }

    const currentUser = userSnapshot.data();
    const userInterestInGender = currentUser.userIntrestInGender; // Assuming the field name is 'interestInGender'

    if (!userInterestInGender) {
      return res.status(400).send("User's gender preference not found");
    }

    // Get list of users from the subcollections "iLikeThem" and "IDislikeThem"
    const likedUsersSnapshot = await firestore
      .collection("users")
      .doc(userId)
      .collection("iLikeThem")
      .get();
    const dislikedUsersSnapshot = await firestore
      .collection("users")
      .doc(userId)
      .collection("IDislikeThem")
      .get();

    const likedUserIds = likedUsersSnapshot.docs.map((doc) => doc.id);
    const dislikedUserIds = dislikedUsersSnapshot.docs.map((doc) => doc.id);
    const excludeIds = [userId, ...likedUserIds, ...dislikedUserIds];

    // Fetch users limited to 50, excluding the current user, users from the "iLikeThem" and "IDislikeThem" collections, and matching the gender preference
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

    res.status(200).send(results);
  } catch (error) {
    console.error("Error occurred:", error);
    res.status(500).send(error.message);
  }
});

app.post("/", async (req, res) => {
  try {
    const { type, myId, idOfPersonThatILike, idOfPersonThatIDontLike } =
      req.body;

    // Log the received data
    console.log("Received POST request:");
    console.log(`type: ${type}`);
    console.log(`myId: ${myId}`);
    console.log(`idOfPersonThatILike: type: ${typeof idOfPersonThatIDontLike}`);
    console.log(idOfPersonThatILike);
    console.log("enter a case");

    switch (type) {
      case "personThatIDislike":
        // Add the disliked person to the current user's iDislikeThem collection
        await firestore
          .collection("users")
          .doc(myId)
          .collection("iDislikeThem")
          .doc(idOfPersonThatILike) // Assuming you have the ID of the disliked person
          .set(
            {
              uid: idOfPersonThatILike,
              timestamp: admin.firestore.FieldValue.serverTimestamp(), // Adding timestamp
              documentReference: firestore
                .collection("users")
                .doc(idOfPersonThatILike),
            },
            { merge: true }
          );

        await firestore
          .collection("users")
          .doc(myId)
          .collection("theyLikeMe")
          .doc(idOfPersonThatILike)
          .delete();
        res.status(200).send("Successfully Deleted");

        res.status(200).send("Dislike recorded successfully");
        break;

      case "personThatILike":
        console.log("Handling 'personThatILike' request");
        console.log(`myId: ${myId}`);
        console.log(`idOfPersonThatILike: ${idOfPersonThatILike}`);

        // Add the current user (myId) to the liked person's theyLikeMe collection
        await firestore
          .collection("users")
          .doc(idOfPersonThatILike)
          .collection("theyLikeMe")
          .doc(myId)
          .set(
            {
              uid: myId,
              timestamp: admin.firestore.FieldValue.serverTimestamp(), // Adding timestamp
              documentReference: firestore.collection("users").doc(myId),
            },
            { merge: true }
          );

        console.log(`Added ${myId} to theyLikeMe of ${idOfPersonThatILike}`);

        // Add the liked person to the current user's iLikeThem collection
        await firestore
          .collection("users")
          .doc(myId)
          .collection("iLikeThem")
          .doc(idOfPersonThatILike)
          .set(
            {
              uid: idOfPersonThatILike,
              timestamp: admin.firestore.FieldValue.serverTimestamp(), // Adding timestamp
              documentReference: firestore
                .collection("users")
                .doc(idOfPersonThatILike),
            },
            { merge: true }
          );

        console.log(`Added ${idOfPersonThatILike} to iLikeThem of ${myId}`);

        res.status(200).send("Successful");
        break;

      case "weLikeEachOther":
        const otherPersonObject = {
          uid: idOfPersonThatILike,
          documentReference: firestore
            .collection("users")
            .doc(idOfPersonThatILike),
        };
        const myObject = {
          uid: myId,
          documentReference: firestore.collection("users").doc(myId),
        };
        await firestore
          .collection("users")
          .doc(idOfPersonThatILike)
          .collection("weLikeEachOther")
          .doc(myId)
          .set(myObject, { merge: true });
        await firestore
          .collection("users")
          .doc(myId)
          .collection("weLikeEachOther")
          .doc(idOfPersonThatILike)
          .set(otherPersonObject, { merge: true });
        await firestore
          .collection("users")
          .doc(myId)
          .collection("theyLikeMe")
          .doc(idOfPersonThatILike)
          .delete();
        const idOfDocument = generateChatId(myId, idOfPersonThatILike);
        await firestore
          .collection("chats")
          .doc(idOfDocument)
          .set(
            {
              idsConcatenated: idOfDocument,
              arrayOfPeopleInConversation: [myId, idOfPersonThatILike],
            },
            { merge: true }
          );
        res.status(200).send("We like Each other successfully done");
        break;

      case "breakMatch":
        const id = generateChatId(myId, idOfPersonThatIDontLike);
        const listMessageDocuments = await firestore
          .collection("chats")
          .doc(id)
          .collection("messages")
          .listDocuments();
        listMessageDocuments.forEach((eachDoc) => {
          eachDoc.delete();
        });
        await firestore.collection("chats").doc(id).delete();
        const path1 = `users/${myId}/weLikeEachOther/${idOfPersonThatIDontLike}`;
        const path2 = `users/${idOfPersonThatIDontLike}/weLikeEachOther/${myId}`;
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
