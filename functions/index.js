const functions = require("firebase-functions");
const admin = require("firebase-admin");
const express = require("express");
const cors = require("cors");
const usersData = [
  {
    aditional_photos: [
      "https://firebasestorage.googleapis.com/v0/b/tinder-app-af33b.appspot.com/o/users%2F0bdnXMi9TnZ0uAztVrTWqBO3dZh1%2Fuploads%2F1694483926554000_0.png?alt=media&token=956683b9-426f-43bc-82e9-3a39ad994b0d",
    ],
    city: "Ashdod",
    created_time: "September 11, 2023 at 9:58:35 PM UTC-4",
    description:
      "I enjoy outdoor activities and love to travel. Looking for someone who shares similar interests!",
    display_name: "Natasha",
    email: "user1@gmail.com",
    gender: "Female",
    uid: "0bdnXMi9TnZ0uAztVrTWqBO3dZh1",
    userIntrestInGender: "Male",
    year_of_birth: 1989,
  },
  {
    aditional_photos: [
      "https://firebasestorage.googleapis.com/v0/b/tinder-app-af33b.appspot.com/o/users%2F1bdnXMi9TnZ0uAztVrTWqBO3dZh2%2Fuploads%2F1694483926554000_1.png?alt=media&token=956683b9-426f-43bc-82e9-3a39ad994b0e",
    ],
    city: "New York",
    created_time: "September 12, 2023 at 10:15:20 AM UTC-4",
    description:
      "A foodie who loves trying new restaurants and cuisines. Looking for someone to explore the food scene with!",
    display_name: "Mike",
    email: "user2@gmail.com",
    gender: "Male",
    uid: "1bdnXMi9TnZ0uAztVrTWqBO3dZh2",
    userIntrestInGender: "Female",
    year_of_birth: 1990,
  },
  {
    aditional_photos: [
      "https://firebasestorage.googleapis.com/v0/b/tinder-app-af33b.appspot.com/o/users%2F2bdnXMi9TnZ0uAztVrTWqBO3dZh3%2Fuploads%2F1694483926554000_2.png?alt=media&token=956683b9-426f-43bc-82e9-3a39ad994b0f",
    ],
    city: "Los Angeles",
    created_time: "September 13, 2023 at 2:30:45 PM UTC-7",
    description:
      "Passionate about fitness and outdoor adventures. Looking for an active partner!",
    display_name: "Lena",
    email: "user3@gmail.com",
    gender: "Female",
    uid: "2bdnXMi9TnZ0uAztVrTWqBO3dZh3",
    userIntrestInGender: "Male",
    year_of_birth: 1985,
  },
  {
    aditional_photos: [
      "https://firebasestorage.googleapis.com/v0/b/tinder-app-af33b.appspot.com/o/users%2F3bdnXMi9TnZ0uAztVrTWqBO3dZh4%2Fuploads%2F1694483926554000_3.png?alt=media&token=956683b9-426f-43bc-82e9-3a39ad994b10",
    ],
    city: "Chicago",
    created_time: "September 14, 2023 at 4:45:10 PM UTC-5",
    description:
      "An art enthusiast who loves visiting museums and galleries. Seeking someone with an appreciation for art.",
    display_name: "David",
    email: "user4@gmail.com",
    gender: "Male",
    uid: "3bdnXMi9TnZ0uAztVrTWqBO3dZh4",
    userIntrestInGender: "Female",
    year_of_birth: 1988,
  },
  {
    aditional_photos: [
      "https://firebasestorage.googleapis.com/v0/b/tinder-app-af33b.appspot.com/o/users%2F4bdnXMi9TnZ0uAztVrTWqBO3dZh5%2Fuploads%2F1694483926554000_4.png?alt=media&token=956683b9-426f-43bc-82e9-3a39ad994b11",
    ],
    city: "Miami",
    created_time: "September 15, 2023 at 11:20:55 AM UTC-4",
    description:
      "A beach lover who enjoys water sports and sunsets. Looking for someone to share beautiful moments with.",
    display_name: "Emily",
    email: "user5@gmail.com",
    gender: "Female",
    uid: "4bdnXMi9TnZ0uAztVrTWqBO3dZh5",
    userIntrestInGender: "Male",
    year_of_birth: 1992,
  },
  {
    aditional_photos: [
      "https://firebasestorage.googleapis.com/v0/b/tinder-app-af33b.appspot.com/o/users%2F5bdnXMi9TnZ0uAztVrTWqBO3dZh6%2Fuploads%2F1694483926554000_5.png?alt=media&token=956683b9-426f-43bc-82e9-3a39ad994b12",
    ],
    city: "San Francisco",
    created_time: "September 16, 2023 at 3:05:30 PM UTC-7",
    description:
      "Tech geek who loves coding and building cool projects. Searching for someone with similar tech interests.",
    display_name: "Alex",
    email: "user6@gmail.com",
    gender: "Male",
    uid: "5bdnXMi9TnZ0uAztVrTWqBO3dZh6",
    userIntrestInGender: "Female",
    year_of_birth: 1987,
  },
  {
    aditional_photos: [
      "https://firebasestorage.googleapis.com/v0/b/tinder-app-af33b.appspot.com/o/users%2F6bdnXMi9TnZ0uAztVrTWqBO3dZh7%2Fuploads%2F1694483926554000_6.png?alt=media&token=956683b9-426f-43bc-82e9-3a39ad994b13",
    ],
    city: "London",
    created_time: "September 17, 2023 at 8:12:45 PM UTC+1",
    description:
      "Bookworm who enjoys reading classics and contemporary fiction. Seeking a fellow book lover.",
    display_name: "Sophie",
    email: "user7@gmail.com",
    gender: "Female",
    uid: "6bdnXMi9TnZ0uAztVrTWqBO3dZh7",
    userIntrestInGender: "Male",
    year_of_birth: 1991,
  },
  {
    aditional_photos: [
      "https://firebasestorage.googleapis.com/v0/b/tinder-app-af33b.appspot.com/o/users%2F7bdnXMi9TnZ0uAztVrTWqBO3dZh8%2Fuploads%2F1694483926554000_7.png?alt=media&token=956683b9-426f-43bc-82e9-3a39ad994b14",
    ],
    city: "Toronto",
    created_time: "September 18, 2023 at 11:30:20 AM UTC-4",
    description:
      "Music enthusiast who enjoys attending concerts and festivals. Looking for a music-loving companion.",
    display_name: "Daniel",
    email: "user8@gmail.com",
    gender: "Male",
    uid: "7bdnXMi9TnZ0uAztVrTWqBO3dZh8",
    userIntrestInGender: "Female",
    year_of_birth: 1993,
  },
  {
    aditional_photos: [
      "https://firebasestorage.googleapis.com/v0/b/tinder-app-af33b.appspot.com/o/users%2F8bdnXMi9TnZ0uAztVrTWqBO3dZh9%2Fuploads%2F1694483926554000_8.png?alt=media&token=956683b9-426f-43bc-82e9-3a39ad994b15",
    ],
    city: "Sydney",
    created_time: "September 19, 2023 at 7:55:15 PM UTC+10",
    description:
      "Nature lover who enjoys hiking and camping. Searching for someone who appreciates the great outdoors.",
    display_name: "Olivia",
    email: "user9@gmail.com",
    gender: "Female",
    uid: "8bdnXMi9TnZ0uAztVrTWqBO3dZh9",
    userIntrestInGender: "Male",
    year_of_birth: 1994,
  },
  {
    aditional_photos: [
      "https://firebasestorage.googleapis.com/v0/b/tinder-app-af33b.appspot.com/o/users%2F9bdnXMi9TnZ0uAztVrTWqBO3dZh0%2Fuploads%2F1694483926554000_9.png?alt=media&token=956683b9-426f-43bc-82e9-3a39ad994b16",
    ],
    city: "Berlin",
    created_time: "September 20, 2023 at 9:10:50 AM UTC+2",
    description:
      "Travel enthusiast who has explored various countries. Looking for a travel buddy to explore new destinations.",
    display_name: "Max",
    email: "user10@gmail.com",
    gender: "Male",
    uid: "9bdnXMi9TnZ0uAztVrTWqBO3dZh0",
    userIntrestInGender: "Female",
    year_of_birth: 1986,
  },
];

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

        await firestore
          .collection("users")
          .doc(myId)
          .collection("iDislikeThem")
          .doc(idOfPersonThatILike)
          .delete();

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

app.post("/addUsers", async (req, res) => {
  try {
    const batch = firestore.batch();
    const usersCollectionRef = firestore.collection("users");

    usersData.forEach((userData) => {
      const userRef = usersCollectionRef.doc(userData.uid);
      batch.set(userRef, userData);
    });

    await batch.commit();
    res.status(200).send("Users added successfully to Firestore.");
  } catch (error) {
    console.error("Error adding users to Firestore:", error);
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
