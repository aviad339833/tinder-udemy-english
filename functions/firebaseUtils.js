// firebaseUtils.js
const admin = require('firebase-admin');

async function documentExists(collectionName, docId) {
    try {
        const docRef = admin.firestore().collection(collectionName).doc(docId);
        const doc = await docRef.get();
        return doc.exists;
    } catch (error) {
        console.error(`[ERROR] Error checking if document exists in ${collectionName} with ID ${docId}:`, error);
        throw error; // Re-throwing so it's caught in your main function's catch block
    }
}

// Add other Firebase-related functions as needed

module.exports = {
    documentExists,
    // Add other Firebase-related functions here
};
