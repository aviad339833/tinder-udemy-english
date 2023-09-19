const { sendErrorResponse, sendSuccessResponse, log, documentExists } = require("./utils");

module.exports.handleUserAction = async function (req, res, firestore) {
    try {
        const { type, myId, idOfTheOtherPerson } = req.body;

        log("Received request:", { type, myId, idOfTheOtherPerson });

        switch (type) {
            case "personThatILike":
                await handleLikeAction(myId, idOfTheOtherPerson, firestore);
                log("Transaction completed successfully!");
                sendSuccessResponse(res, "Operation completed successfully!");
                break;

            // Add more cases as you expand the API functionality

            default:
                log("Invalid request type:", type);
                sendErrorResponse(res, 400, "Invalid request type.");
        }
    } catch (error) {
        log("Transaction Error:", error);
        sendErrorResponse(res, 500, "An error occurred.");
    }
};

async function handleLikeAction(myId, idOfTheOtherPerson, firestore) {
    try {
        await firestore.runTransaction(async (transaction) => {
            log("Initiating transaction...");

            const otherPersonRef = firestore.collection("users").doc(idOfTheOtherPerson);
            const myRef = firestore.collection("users").doc(myId);

            log("Fetching other person's data...");
            const otherPersonData = await transaction.get(otherPersonRef);

            if (!documentExists(otherPersonData)) {
                log("Other person does not exist. Exiting transaction.");
                return; // Exit the transaction
            }

            log("Checking if the other person has liked me...");
            const theirLikes = await transaction.get(
                otherPersonRef.collection("usersThatILike").doc(myId)
            );

            const currentTimeStamp = admin.firestore.FieldValue.serverTimestamp();

            if (documentExists(theirLikes)) {
                log(
                    "Mutual like situation detected between",
                    myId,
                    "and",
                    idOfTheOtherPerson
                );

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

                const chatRoomId = firestore.collection("chats").doc().id;
                log("Generating chat room with ID:", chatRoomId);

                transaction.set(firestore.collection("chats").doc(chatRoomId), {
                    users: [myId, idOfTheOtherPerson],
                    timestamp: currentTimeStamp,
                });
                log("Saved chat room to DB.");

                log("Updating user data with chat room ID...");
                transaction.update(myRef, {
                    chats: admin.firestore.FieldValue.arrayUnion(chatRoomId),
                });
                transaction.update(otherPersonRef, {
                    chats: admin.firestore.FieldValue.arrayUnion(chatRoomId),
                });
                log("Updated user data in DB.");
            }

            transaction.set(
                myRef.collection("usersThatILike").doc(idOfTheOtherPerson),
                {
                    userId: idOfTheOtherPerson,
                    timestamp: currentTimeStamp,
                    userRef: otherPersonRef,
                }
            );
            log("Like added to DB.");

            transaction.set(otherPersonRef.collection("usersThatLikedMe").doc(myId), {
                userId: myId,
                timestamp: currentTimeStamp,
                userRef: myRef,
            });
            log("Added me to other person's 'usersThatLikedMe' subcollection.");
        });
    } catch (error) {
        console.error(`[ERROR] Error handling like action for users ${myId} and ${idOfTheOtherPerson}:`, error);
        throw error; // Re-throwing so it's caught in your main function's catch block
    }
}
