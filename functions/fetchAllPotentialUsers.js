const { sendErrorResponse, sendSuccessResponse, log, documentExists } = require("./utils");
const { fetchUserIdsInBatches, getUsersByIDs } = require("./fetchUtils");

module.exports = async function (req, res, firestore, admin) {
    try {
        const userId = req.query.userId;
        const requestType = req.query.type;

        log("Received userId:", userId);

        if (!userId || typeof userId !== "string" || userId.length !== 28) {
            log("Invalid or missing userId received:", userId);
            return sendErrorResponse(
                res,
                400,
                `Invalid or missing userId received: ${userId}`
            );
        }

        switch (requestType) {
            case "fetchAllPotentialUsers":
                let timeout;
                try {
                    log("Fetching all potential users...");
                    timeout = setTimeout(() => {
                        sendErrorResponse(res, 500, "Request timed out.");
                    }, TIMEOUT_DURATION);

                    // Fetch user data
                    const userSnapshot = await firestore
                        .collection("users")
                        .doc(userId)
                        .get();

                    if (!documentExists(userSnapshot)) {
                        log("User not found for userId:", userId);
                        return sendErrorResponse(
                            res,
                            404,
                            `User not found for userId: ${userId}`
                        );
                    }

                    const currentUser = userSnapshot.data();
                    const userInterestInGender = currentUser.userInterestInGender;

                    if (!userInterestInGender) {
                        log("User's gender preference not found for userId:", userId);
                        return sendErrorResponse(
                            res,
                            400,
                            `User's gender preference not found for userId: ${userId}`
                        );
                    }

                    // Fetch list of liked and disliked user IDs
                    log("Fetching liked and disliked user IDs...");
                    const likedUserIds = await fetchUserIdsInBatches(
                        firestore
                            .collection("users")
                            .doc(userId)
                            .collection("usersThatILike")
                    );

                    const dislikedUserIds = await fetchUserIdsInBatches(
                        firestore
                            .collection("users")
                            .doc(userId)
                            .collection("iDislikeThem")
                    );

                    log("Liked User IDs:", likedUserIds);
                    log("Disliked User IDs:", dislikedUserIds);

                    const excludeIds = [userId, ...likedUserIds, ...dislikedUserIds];

                    // Fetch potential users based on gender preference
                    log("Fetching potential users based on gender preference...");
                    const allUsers = await firestore
                        .collection("users")
                        .where("gender", "==", userInterestInGender)
                        .where(
                            admin.firestore.FieldPath.documentId(),
                            "not-in",
                            excludeIds
                        )
                        .limit(50)
                        .get();

                    const results = allUsers.docs.map((doc) => doc.data());

                    log(
                        "Sending response with",
                        results.length,
                        "users for userId:",
                        userId
                    );

                    clearTimeout(timeout);
                    sendSuccessResponse(res, results);
                } catch (error) {
                    clearTimeout(timeout);
                    log("Error occurred while fetching potential users:", error);
                    sendErrorResponse(res, 500, `Error occurred: ${error.message}`);
                }
                break;

            default:
                log("Invalid request type:", requestType);
                sendErrorResponse(res, 400, `Invalid request type: ${requestType}`);
        }
    } catch (error) {
        log("Error occurred:", error);
        sendErrorResponse(res, 500, `Error occurred: ${error.message}`);
    }
};
