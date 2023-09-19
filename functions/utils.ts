import { Response } from 'express';

function sendErrorResponse(res: Response, status: number, message: string, error: Error | null = null): void {
    const errorMessage = error ? `${message}\n${error.message}` : message;
    console.error(errorMessage);

    if (process.env.NODE_ENV !== 'production') {
        res.status(status).send(errorMessage);
    } else {
        res.status(status).send('An error occurred. Please try again.');
    }
}

function sendSuccessResponse<T>(res: Response, statusCode: number, data: T): void {
    res.status(statusCode).send({ success: true, data });
}

export { sendErrorResponse, sendSuccessResponse };
