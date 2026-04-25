import type { ErrorRequestHandler } from 'express';
import multer from 'multer';

export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  if (res.headersSent) {
    return;
  }

  if (error instanceof multer.MulterError) {
    const message =
      error.code === 'LIMIT_FILE_SIZE'
        ? 'The file is too large. Try uploading a smaller dataset.'
        : 'The upload could not be processed.';
    res.status(400).json({ message, suggestion: 'Check the file and try again.' });
    return;
  }

  const status = typeof error?.response?.status === 'number' ? error.response.status : 500;
  const upstream = error?.response?.data?.detail ?? error?.response?.data?.message;
  const message = upstream ?? error?.message ?? 'Something went wrong.';
  res.status(status >= 400 && status < 600 ? status : 500).json({
    message,
    suggestion: status === 401 ? 'Check your API key configuration.' : 'Retry the action or inspect the service logs.',
  });
};
