const { sendErrorResponse, sendSuccessResponse, log } = require('./utils');

module.exports = async function (req, res) { // Removed unused parameters
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
                let timeout;
                try {
                    log('Fetching all potential users...');
                    const TIMEOUT_DURATION = 30000;
                    timeout = setTimeout(() => {
                        sendErrorResponse(res, 500, 'Request timed out.');
                    }, TIMEOUT_DURATION);


                    clearTimeout(timeout);
                    sendSuccessResponse(res, results);
                } catch (error) {
                    clearTimeout(timeout);
                    log('Error occurred while fetching potential users:', error);
                    sendErrorResponse(res, 500, `Error occurred: ${error.message}`);
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
        sendErrorResponse(res, 500, `Error occurred: ${error.message}`);
    }
};
