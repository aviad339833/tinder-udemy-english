const { sendErrorResponse, sendSuccessResponse, log } = require('./utils');
const { getUserIdsFromSubCollection, getUsersByIDs } = require('./fetchUtils');

module.exports = async function (req, res, firestore) {
    try {
        const userId = req.query.userId;

        log(`[INFO] Starting fetch for user IDs from 'usersThatILike' for user: ${userId}`);
        log(`[TYPE]: fetchLikedUsers`);

        // Fetch all user IDs from the sub-collection "usersThatILike"
        const startTime = new Date();
        const likedUserIDs = await getUserIdsFromSubCollection(
            firestore
                .collection('users')
                .doc(userId)
                .collection('usersThatILike')
        );

        // Check if the likedUserIDs are not in the "matches" sub-collection
        const notInMatches = likedUserIDs.filter(async (userId) => {
            try {
                const snapshot = await firestore
                    .collection('users')
                    .doc(userId)
                    .collection('matches')
                    .get();

                return snapshot.empty; // Returns true if the collection is empty (not in matches)
            } catch (error) {
                log(`[ERROR] Error checking if user ${userId} is in 'matches'. Error:`, error);
                return false; // Treat as not in matches on error
            }
        });

        // Fetch full user documents for the users not in "matches"
        const likedUsers = await getUsersByIDs(notInMatches);

        const endTime = new Date();
        const fetchDuration = (endTime - startTime) / 1000; // Duration in seconds

        // Breaking the long line into multiple lines to satisfy the linter.
        const infoMessage = `[INFO] Fetch completed in ${fetchDuration} seconds.`;
        const foundMessage = `Found ${likedUsers.length} user documents not in 'matches'.`;
        log(infoMessage + ' ' + foundMessage);

        // Send success response with liked users
        sendSuccessResponse(res, likedUsers);
    } catch (error) {
        log(`[ERROR] Failed to fetch user IDs and their documents not in 'matches' for user: ${userId}. Error:`, error);
        sendErrorResponse(res, 500, 'Error fetching liked user documents.');
    }
};
