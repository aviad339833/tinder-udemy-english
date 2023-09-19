function sendErrorResponse(res, status, message, error = null) {
  const errorMessage = error ? `${message}\n${error.message}` : message;
  console.error(errorMessage);
  
  if (process.env.NODE_ENV !== "production") {
      res.status(status).send(errorMessage);
  } else {
      res.status(status).send("An error occurred. Please try again.");
  }
}

function sendSuccessResponse(res, statusCode, data) {
  res.status(statusCode).send({ success: true, data });
}


module.exports = {
  sendErrorResponse,
  sendSuccessResponse,
  log,
};
