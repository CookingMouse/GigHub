import type { ErrorRequestHandler } from "express";
import { MulterError } from "multer";
import { ZodError } from "zod";
import { HttpError } from "../lib/http-error";

export const errorHandler: ErrorRequestHandler = (error, request, response, _next) => {
  if (error instanceof ZodError) {
    response.status(400).json({
      code: "VALIDATION_ERROR",
      message: "The request payload is invalid.",
      requestId: request.requestId,
      details: error.flatten()
    });
    return;
  }

  if (error instanceof HttpError) {
    response.status(error.statusCode).json({
      code: error.code,
      message: error.message,
      requestId: request.requestId
    });
    return;
  }

  if (error instanceof MulterError) {
    response.status(400).json({
      code: "UPLOAD_ERROR",
      message: error.message,
      requestId: request.requestId
    });
    return;
  }

  console.error(error instanceof Error ? error.stack ?? `${error.name}: ${error.message}` : String(error));

  response.status(500).json({
    code: "INTERNAL_SERVER_ERROR",
    message: "An unexpected error occurred.",
    requestId: request.requestId
  });
};
