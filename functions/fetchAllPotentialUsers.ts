import * as functions from 'firebase-functions';
import * as express from 'express';
import { sendErrorResponse, sendSuccessResponse } from './utils';

const app = express();
app.use(express.json());

export const yourFunctionName = functions.https.onRequest(async (req, res) => {
  try {
    const userId = req.query.userId;
    const requestType = req.query.type;

    console.log('Received userId:', userId);
    console.log('Received requestType:', requestType);

    if (!userId || typeof userId !== 'string' || userId.length !== 28) {
      console.log('Invalid or missing userId received:', userId);
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
          console.log('Fetching all potential users...');
          const TIMEOUT_DURATION = 30000;
          timeout = setTimeout(() => {
            sendErrorResponse(res, 500, 'Request timed out.');
          }, TIMEOUT_DURATION);

          // Simulate fetching results (replace with your actual logic)
          const results: unknown[] = []; // Replace with your actual results

          console.log('Fetched potential users:', results);

          clearTimeout(timeout);
          sendSuccessResponse(res, 200, results);
        } catch (error) {
          if (timeout) {
            clearTimeout(timeout);
          }
          console.log('Error occurred while fetching potential users:', error);
          sendErrorResponse(res, 500, `Error occurred: ${error}`);
        }
        break;
      }

      default:
        console.log('Invalid request type:', requestType);
        sendErrorResponse(res, 400, `Invalid request type: ${requestType}`);
    }
  } catch (error) {
    console.log('Error occurred:', error);
    sendErrorResponse(res, 500, `Error occurred: ${error}`);
  }
});
