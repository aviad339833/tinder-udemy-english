import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as express from 'express';
import * as cors from 'cors';

// Initialize Firebase admin
admin.initializeApp();
const firestore = admin.firestore();

// Create an Express app
const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

// Define the log function
function log(...args: any[]) {
    // Replace this with your actual logging implementation
    console.log(...args);
}

async function deleteCollection(collectionRef: FirebaseFirestore.CollectionReference) {
    const batchSize = 500;
    const query = collectionRef.limit(batchSize);

    while (true) {
        const snapshot = await query.get();

        if (snapshot.size === 0) {
            break;
        }

        const batch = firestore.batch();
        snapshot.docs.forEach((doc) => {
            batch.delete(doc.ref);
        });

        await batch.commit();
    }
}

export const deleteCollections = functions.https.onRequest(async (req, res) => {
    try {
        const deletePromises: Promise<void>[] = [];

        const chatsRef = firestore.collection('chats');
        deletePromises.push(deleteCollection(chatsRef));

        const usersSnapshot = await firestore.collection('users').get();

        usersSnapshot.docs.forEach(async (doc) => {
            if (!doc.id || typeof doc.id !== 'string') {
                log('Invalid user ID:', doc.id);
                return;
            }

            const userId = doc.id;
            const userData = doc.data() as FirebaseFirestore.DocumentData;

            if (userData.chats && Array.isArray(userData.chats)) {
                userData.chats.forEach((chatId) => {
                    const chatDocumentRef = chatsRef.doc(chatId);
                    deletePromises.push(chatDocumentRef.delete().catch((error) => {
                        log(`Error deleting chat document ${chatId} for user ${userId}:`, error);
                    }) as Promise<void>); // Cast to Promise<void>
                });
            }

            const userRef = firestore.collection('users').doc(userId);

            // Create a custom promise wrapper
            const updatePromise = new Promise<void>((resolve, reject) => {
                userRef.update({ chats: admin.firestore.FieldValue.delete() })
                    .then(() => resolve())
                    .catch((error) => {
                        log(`Error deleting chats field for user ${userId}:`, error);
                        reject(error);
                    });
            });

            // Push the custom promise wrapper into deletePromises
            deletePromises.push(updatePromise);

            ['usersThatILike', 'iDislikeThem', 'matches', 'usersThatLikedMe'].forEach(
                (subCollectionName) => {
                    const subCollectionRef = firestore
                        .collection('users')
                        .doc(userId)
                        .collection(subCollectionName);

                    deletePromises.push(deleteCollection(subCollectionRef).catch((error) => {
                        log(`Error deleting subcollection ${subCollectionName} for user ${userId}:`, error);
                    }));
                }
            );
        });

        await Promise.all(deletePromises);
        // Send a success response
        res.status(200).send('Successfully deleted the chats collection, user chats field, and subcollections for all users');
    } catch (error) {
        log('Error deleting collections and chat fields:', error);
        // Send an error response
        res.status(500).send(error);
    }
});
