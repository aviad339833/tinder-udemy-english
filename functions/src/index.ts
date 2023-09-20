import { fetchLikedUsers } from '../fetchLikedUsers'; // Changed double quotes to single quotes

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
    log,
} = require('./utils');
const deleteAllUserSubcollections = require('./deleteAllUserSubcollections');
const { handleUserAction } = require('./userActions');
const fetchAllPotentialUsers = require('./fetchAllPotentialUsers');

// Now you can use the fetchAllPotentialUsers function in your code

// Utility function for sending error responses.
import { Request, Response } from 'express';

app.get('/', async (req: Request, res: Response) => {
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
        sendErrorResponse(res, 500, error);
    }
});

app.post('/userActions', async (req: Request, res: Response) => {
    try {
        await handleUserAction(req, res, firestore);
    } catch (error) {
        log('Error handling user action:', error);
        sendErrorResponse(res, 500, error);
    }
});

app.delete('/deleteAllUserSubcollections', async (req: Request, res: Response) => {
    try {
        await deleteAllUserSubcollections(req, res, firestore);
    } catch (error) {
        log('Error handling deleteAllUserSubcollections:', error);
        sendErrorResponse(res, 500, error);
    }
});

exports.api = functions.https.onRequest(app);
