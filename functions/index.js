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

    switch (type) {
      case "personThatIDislike":
        // Add the disliked person to the current user's iDislikeThem collection
        await firestore
          .collection("users")
          .doc(myId)
          .collection("iDislikeThem")
          .doc(idOfPersonThatIDontLike) // Assuming you have the ID of the disliked person
          .set(
            {
              uid: idOfPersonThatIDontLike,
              timestamp: admin.firestore.FieldValue.serverTimestamp(), // Adding timestamp
              documentReference: firestore
                .collection("users")
                .doc(idOfPersonThatIDontLike),
            },
            { merge: true }
          );

        res.status(200).send("Dislike recorded successfully");
        break;

      case "personThatILike":
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

        res.status(200).send("Successful");
        break;

      case "IDontLikeYou":
        await firestore
          .collection("users")
          .doc(myId)
          .collection("theyLikeMe")
          .doc(idOfPersonThatIDontLike)
          .delete();
        res.status(200).send("Successfully Deleted");
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

exports.post = functions.https.onRequest(app);
exports.get = functions.https.onRequest(app);

const generateChatId = (id1, id2) => {
  const array = [id1, id2];
  array.sort();
  return `${array[0]}-${array[1]}`;
};
