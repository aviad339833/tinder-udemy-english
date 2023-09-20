import { Request, Response } from 'express';
import { Firestore } from '@google-cloud/firestore';
import { getUserIdsFromSubCollection, getUsersByIDs } from './fetchUtils';
import { sendErrorResponse, sendSuccessResponse } from './utils';

export async function fetchLikedUsers(req: Request, res: Response, firestore: Firestore): Promise<void> {
    try {
        const userId = req.query.userId as string;

        console.log(`[INFO] Starting fetch for user IDs from 'usersThatILike' for user: ${userId}`);
        console.log(`[TYPE]: fetchLikedUsers`);

        const startTime = new Date();
        const likedUserIDs = await getUserIdsFromSubCollection(
            firestore
                .collection('users')
                .doc(userId)
                .collection('usersThatILike')
        );

        const notInMatches: string[] = (await Promise.all(likedUserIDs.map(async (userId) => {
            try {
                const snapshot = await firestore
                    .collection('users')
                    .doc(userId)
                    .collection('matches')
                    .get();
                return snapshot.empty ? userId : null;
            } catch (error) {
                console.log(`[ERROR] Error checking if user ${userId} is in 'matches'. Error:`, error);
                return null;
            }
        }))).filter((id) => id !== null) as string[];

        const filteredMatches = notInMatches.filter((id) => id !== null) as string[];

        const likedUsers = await getUsersByIDs(filteredMatches);

        const endTime = new Date();
        const fetchDuration = (endTime.getTime() - startTime.getTime()) / 1000;

        const infoMessage = `[INFO] Fetch completed in ${fetchDuration} seconds.`;
        const foundMessage = `Found ${likedUsers.length} user documents not in 'matches'.`;
        console.log(infoMessage + ' ' + foundMessage);

        sendSuccessResponse(res, 200, likedUsers);
    } catch (error) {
        console.log(`[ERROR] Failed to fetch user IDs and their documents not in 'matches' for user:. Error:`, error);
        sendErrorResponse(res, 500, 'Error fetching liked user documents.');
    }
}
