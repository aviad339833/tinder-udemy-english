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
    const result = await firestore.collection("users").add({ name: "Jesse" });
    res.status(200).send(result);
  } catch (error) {
    res.status(500).send(error.message);
  }
});

app.post("/", async (req, res) => {
  try {
    const { type, myId, idOfPersonThatILike, idOfPersonThatIDontLike } =
      req.body;

    switch (type) {
      case "personLikesMe":
        await firestore
          .collection("users")
          .doc(idOfPersonThatILike)
          .collection("theyLikeMe")
          .doc(myId)
          .set(
            {
              uid: myId,
              documentReference: firestore.collection("users").doc(myId),
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

const generateChatId = (id1, id2) => {
  const array = [id1, id2];
  array.sort();
  return `${array[0]}-${array[1]}`;
};
