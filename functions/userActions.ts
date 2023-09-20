import { Firestore } from '@google-cloud/firestore';
import * as admin from 'firebase-admin';
import { Request, Response } from 'express';
import { sendErrorResponse, sendSuccessResponse } from './utils';

export async function documentExists(collectionName: string, docId: string, firestore: Firestore): Promise<boolean> {
    try {
        const docRef = firestore.collection(collectionName).doc(docId);
        const doc = await docRef.get();
        return doc.exists;
    } catch (error) {
        console.error(`[ERROR] Error checking if document exists in ${collectionName} with ID ${docId}:`, error);
        throw error; // Re-throwing so it's caught in your main function's catch block
    }
}

export async function handleUserAction(req: Request, res: Response, firestore: Firestore): Promise<void> {
    try {
        const { type, myId, idOfTheOtherPerson } = req.body;

        console.log('Received request:', { type, myId, idOfTheOtherPerson });

        switch (type) {
            case 'personThatILike':
                await handleLikeAction(myId, idOfTheOtherPerson, firestore);
                console.log('Transaction completed successfully!');
                sendSuccessResponse(res, 200, 'Operation completed successfully!');
                break;
            default:
                console.log('Invalid request type:', type);
                sendErrorResponse(res, 400, 'Invalid request type.');
        }
    } catch (error) {
        console.log('Transaction Error:', error);
        sendErrorResponse(res, 500, 'An error occurred.');
    }
}

async function handleLikeAction(myId: string, idOfTheOtherPerson: string, firestore: Firestore): Promise<void> {
    try {
        await firestore.runTransaction(async (transaction) => {
            console.log('Initiating transaction...');

            const otherPersonRef = firestore.collection('users').doc(idOfTheOtherPerson);
            const myRef = firestore.collection('users').doc(myId);

            console.log('Fetching other person\'s data...');
            const otherPersonData = await transaction.get(otherPersonRef);

            if (!otherPersonData.exists) {
                console.log('Other person does not exist. Exiting transaction.');
                return; // Exit the transaction
            }

            console.log('Checking if the other person has liked me...');
            const theirLikes = await transaction.get(
                otherPersonRef.collection('usersThatILike').doc(myId)
            );

            const currentTimeStamp = admin.firestore.FieldValue.serverTimestamp();

            if (theirLikes.exists) {
                console.log(
                    'Mutual like situation detected between',
                    myId,
                    'and',
                    idOfTheOtherPerson
                );

                transaction.set(myRef.collection('matches').doc(idOfTheOtherPerson), {
                    userId: idOfTheOtherPerson,
                    timestamp: currentTimeStamp,
                    userRef: otherPersonRef,
                });
                transaction.set(otherPersonRef.collection('matches').doc(myId), {
                    userId: myId,
                    timestamp: currentTimeStamp,
                    userRef: myRef,
                });

                const chatRoomId = firestore.collection('chats').doc().id;
                console.log('Generating chat room with ID:', chatRoomId);

                transaction.set(firestore.collection('chats').doc(chatRoomId), {
                    users: [myId, idOfTheOtherPerson],
                    timestamp: currentTimeStamp,
                });
                console.log('Saved chat room to DB.');

                console.log('Updating user data with chat room ID...');
                transaction.update(myRef, {
                    chats: admin.firestore.FieldValue.arrayUnion(chatRoomId),
                });
                transaction.update(otherPersonRef, {
                    chats: admin.firestore.FieldValue.arrayUnion(chatRoomId),
                });
                console.log('Updated user data in DB.');
            }

            transaction.set(
                myRef.collection('usersThatILike').doc(idOfTheOtherPerson),
                {
                    userId: idOfTheOtherPerson,
                    timestamp: currentTimeStamp,
                    userRef: otherPersonRef,
                }
            );
            console.log('Like added to DB.');

            transaction.set(otherPersonRef.collection('usersThatLikedMe').doc(myId), {
                userId: myId,
                timestamp: currentTimeStamp,
                userRef: myRef,
            });
            console.log('Added me to other person\'s \'usersThatLikedMe\' subcollection.');
        });
    } catch (error) {
        console.error(`[ERROR] Error handling like action for users ${myId} and ${idOfTheOtherPerson}:`, error);
        throw error; // Re-throwing so it's caught in your main function's catch block
    }
}
