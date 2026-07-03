import { Request, Response, NextFunction } from "express";
import { Prisma } from "@prisma/client";
import logger from "../utils/logger";

export class AppError extends Error {
  public statusCode: number;

  constructor(message: string, statusCode: number = 500) {
    super(message);
    this.statusCode = statusCode;
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  logger.error("Unhandled error", { error: err.message, stack: err.stack });

  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: err.message,
    });
    return;
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    // Connection pool timeout
    if (err.message.includes("Timed out fetching a new connection")) {
      logger.error("Database connection pool exhausted", { error: err.message });
      res.status(503).json({
        error: "Database is busy. Please try again in a few seconds.",
      });
      return;
    }
    switch (err.code) {
      case "P2002":
        res.status(409).json({
          error: "A record with this value already exists.",
        });
        return;
      case "P2025":
        res.status(404).json({
          error: "Record not found.",
        });
        return;
      case "P2003":
        res.status(400).json({
          error: "Invalid reference: the related record does not exist.",
        });
        return;
      default:
        res.status(400).json({
          error: "Database error occurred.",
        });
        return;
    }
  }

  if (err instanceof Prisma.PrismaClientValidationError) {
    res.status(400).json({
      error: "Invalid data provided.",
    });
    return;
  }

  res.status(500).json({
    error:
      process.env.NODE_ENV === "production"
        ? "An unexpected error occurred."
        : err.message,
  });
}
