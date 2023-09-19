// fetchUtils.js
const admin = require("firebase-admin");

async function fetchUserIdsInBatches(collectionRef) {
    const userIDs = [];
    let query = collectionRef.limit(10); // Fetch in batches of 10

    while (true) {
        try {
            const snapshot = await query.get();
            if (snapshot.empty) break;

            snapshot.forEach((doc) => {
                userIDs.push(doc.id);
            });

            // Fetch the next batch
            const lastVisible = snapshot.docs[snapshot.docs.length - 1];
            query = collectionRef.startAfter(lastVisible).limit(10);
        } catch (error) {
            console.error("[ERROR] Error fetching user IDs in batches:", error);
            throw error; // Re-throwing so it's caught in your main function's catch block
        }
    }

    return userIDs;
}

async function getUserIdsFromSubCollection(subCollection) {
    const userIds = [];

    try {
        const snapshot = await subCollection.get();

        snapshot.forEach((doc) => {
            userIds.push(doc.id);
        });
    } catch (error) {
        console.error("[ERROR] Error fetching user IDs from sub-collection:", error);
        throw error; // Re-throwing so it's caught in your main function's catch block
    }

    return userIds;
}

async function getUsersByIDs(userIDs) {
    const users = [];

    for (const id of userIDs) {
        try {
            const userDoc = await admin.firestore().collection("users").doc(id).get();
            if (userDoc.exists) {
                users.push(userDoc.data());
            } else {
                console.warn(`[WARN] User document for ID ${id} does not exist.`);
            }
        } catch (error) {
            console.error(`[ERROR] Error fetching user data for ID ${id}:`, error);
            // You can choose to continue processing or skip this user on error
        }
    }

    return users;
}

// Add other fetching-related functions as needed

module.exports = {
    fetchUserIdsInBatches,
    getUserIdsFromSubCollection,
    getUsersByIDs,
    // Add other fetching-related functions here
};
