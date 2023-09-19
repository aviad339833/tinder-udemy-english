const { sendErrorResponse, sendSuccessResponse, log } = require("./utils");

module.exports = async function (req, res, firestore) {
    try {
        const deletePromises = [];

        const chatsRef = firestore.collection("chats");
        deletePromises.push(deleteCollection(chatsRef));

        const usersSnapshot = await firestore.collection("users").get();

        usersSnapshot.docs.forEach(async (doc) => {
            if (!doc.id || typeof doc.id !== "string") {
                log("Invalid user ID:", doc.id);
                return;
            }

            const userId = doc.id;
            const userData = doc.data();

            if (userData.chats && Array.isArray(userData.chats)) {
                userData.chats.forEach((chatId) => {
                    const chatDocumentRef = chatsRef.doc(chatId);
                    deletePromises.push(chatDocumentRef.delete().catch((error) => {
                        log(`Error deleting chat document ${chatId} for user ${userId}:`, error);
                    }));
                });
            }

            const userRef = firestore.collection("users").doc(userId);
            deletePromises.push(
                userRef.update({ chats: admin.firestore.FieldValue.delete() })
                .catch((error) => {
                    log(`Error deleting chats field for user ${userId}:`, error);
                })
            );

            ["usersThatILike", "iDislikeThem", "matches", "usersThatLikedMe"].forEach(
                (subCollectionName) => {
                    const subCollectionRef = firestore
                        .collection("users")
                        .doc(userId)
                        .collection(subCollectionName);

                    deletePromises.push(deleteCollection(subCollectionRef).catch((error) => {
                        log(`Error deleting subcollection ${subCollectionName} for user ${userId}:`, error);
                    }));
                }
            );
        });

        await Promise.all(deletePromises);
        sendSuccessResponse(
            res,
            "Successfully deleted the chats collection, user chats field, and subcollections for all users"
        );
    } catch (error) {
        log("Error deleting collections and chat fields:", error);
        sendErrorResponse(res, 500, error.message);
    }
};
