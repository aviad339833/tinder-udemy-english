import * as functions from 'firebase-functions';
import * as express from 'express';


const app = express();
app.use(express.json());

export const yourFunctionName = functions.https.onRequest(async (req, res) => {
    try {
        const userId = req.query.userId;
        const requestType = req.query.type;

        log('Received userId:', userId);

        if (!userId || typeof userId !== 'string' || userId.length !== 28) {
            log('Invalid or missing userId received:', userId);
            return sendErrorResponse(
                res,
                400,
                `Invalid or missing userId received: ${userId}`
            );
        }

        switch (requestType) {
            case 'fetchAllPotentialUsers': {
                let timeout: NodeJS.Timeout | undefined;
                try {
                    log('Fetching all potential users...');
                    const TIMEOUT_DURATION = 30000;
                    timeout = setTimeout(() => {
                        sendErrorResponse(res, 500, 'Request timed out.');
                    }, TIMEOUT_DURATION);

                    // Simulate fetching results (replace with your actual logic)
                    const results:any = []; // Replace with your actual results

                    clearTimeout(timeout);
                    sendSuccessResponse(res, results);
                } catch (error) {
                    if (timeout) {
                        clearTimeout(timeout);
                    }
                    log('Error occurred while fetching potential users:', error);
                    sendErrorResponse(res, 500, `Error occurred: ${error}`);
                }
                break;
            }

            default:
                log('Invalid request type:', requestType);
                sendErrorResponse(res, 400,
                    `Invalid request type: ${requestType}`
                );
        }
    } catch (error) {
        log('Error occurred:', error);
        sendErrorResponse(res, 500, `Error occurred: ${error}`);
    }
});
