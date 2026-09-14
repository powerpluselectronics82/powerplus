const sendResponse = (res, statusCode, message, data = null, meta = null) => {
  return res.status(statusCode).json({
    success: statusCode >= 200 && statusCode < 300,
    statusCode,
    message,
    data,
    ...(meta && { meta }),
  });
};

module.exports = { sendResponse };
