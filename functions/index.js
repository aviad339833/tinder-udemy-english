// Import required modules
const functions = require('firebase-functions');
const admin = require('firebase-admin');
const express = require('express');
const cors = require('cors');

// Initialize Firebase admin
admin.initializeApp();
const firestore = admin.firestore();

// Create an Express app
const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

// Import your utility functions
const {
    sendErrorResponse,
    sendSuccessResponse,
    log,
    documentExists,
} = require('./utils');
const deleteAllUserSubcollections = require('./deleteAllUserSubcollections');
const { handleUserAction } = require('./userActions');
const fetchAllPotentialUsers = require('./fetchAllPotentialUsers');

// Now you can use the fetchAllPotentialUsers function in your code


// Define the timeout duration
const TIMEOUT_DURATION = 10000; // 10 seconds

// Utility function for sending error responses.

app.get('/', async (req, res) => {
    const requestType = req.query.type;

    try {
        switch (requestType) {
            case 'fetchAllPotentialUsers':
                await fetchAllPotentialUsers(req, res, firestore, admin);
                break;

            case 'fetchLikedUsers':
                await fetchLikedUsers(req, res, firestore);
                break;

            default:
                sendErrorResponse(res, 400, `Invalid request type: ${requestType}`);
        }
    } catch (error) {
        log('Error handling request:', error);
        sendErrorResponse(res, 500, error.message);
    }
});

app.post('/userActions', async (req, res) => {
    try {
        await handleUserAction(req, res, firestore);
    } catch (error) {
        log('Error handling user action:', error);
        sendErrorResponse(res, 500, error.message);
    }
});

app.delete('/deleteAllUserSubcollections', async (req, res) => {
    try {
        await deleteAllUserSubcollections(req, res, firestore);
    } catch (error) {
        log('Error handling deleteAllUserSubcollections:', error);
        sendErrorResponse(res, 500, error.message);
    }
});

exports.api = functions.https.onRequest(app);
