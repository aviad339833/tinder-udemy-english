import * as admin from 'firebase-admin';
import { Query, QuerySnapshot, DocumentSnapshot, CollectionReference } from '@google-cloud/firestore';

export async function fetchUserIdsInBatches(collectionRef: CollectionReference): Promise<string[]> {
    const userIDs: string[] = [];
    let query: Query = collectionRef.limit(10);

    let hasMoreData = true;

    while (hasMoreData) {
        const snapshot: QuerySnapshot = await query.get();
        if (snapshot.empty) {
            hasMoreData = false;
            continue;
        }

        snapshot.forEach((doc: DocumentSnapshot) => {
            userIDs.push(doc.id);
        });

        const lastVisible = snapshot.docs[snapshot.docs.length - 1];
        query = collectionRef.startAfter(lastVisible).limit(10);
    }

    return userIDs;
}

export async function getUserIdsFromSubCollection(subCollection: CollectionReference): Promise<string[]> {
    const userIds: string[] = [];

    try {
        const snapshot: QuerySnapshot = await subCollection.get();

        snapshot.forEach((doc: DocumentSnapshot) => {
            userIds.push(doc.id);
        });
    } catch (error) {
        console.error('[ERROR] Error fetching user IDs from sub-collection:', error);
        throw error;
    }

    return userIds;
}

export async function getUsersByIDs(userIDs: string[]): Promise<(admin.firestore.DocumentData | undefined)[]> {
    const users: (admin.firestore.DocumentData | undefined)[] = [];

    for (const id of userIDs) {
        try {
            const userDoc: DocumentSnapshot = await admin.firestore().collection('users').doc(id).get();
            if (userDoc.exists) {
                users.push(userDoc.data());
            } else {
                console.warn(`[WARN] User document for ID ${id} does not exist.`);
            }
        } catch (error) {
            console.error(`[ERROR] Error fetching user data for ID ${id}:`, error);
        }
    }

    return users;
}
