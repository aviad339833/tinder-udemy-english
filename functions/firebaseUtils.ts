import * as admin from 'firebase-admin';

export async function documentExists(collectionName: string, docId: string): Promise<boolean> {
    try {
        const docRef = admin.firestore().collection(collectionName).doc(docId);
        const doc = await docRef.get();
        return doc.exists;
    } catch (error) {
        console.error(`[ERROR] Error checking if document exists in ${collectionName} with ID ${docId}:`, error);
        throw error; // Re-throwing so it's caught in your main function's catch block
    }
}
