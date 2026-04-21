import type { RequestHandler } from "express";

export const notFoundHandler: RequestHandler = (request, response) => {
  response.status(404).json({
    code: "NOT_FOUND",
    message: `No route matches ${request.method} ${request.originalUrl}.`,
    requestId: request.requestId
  });
};

