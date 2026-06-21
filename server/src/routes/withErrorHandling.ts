import { Request, Response } from "express";
import { HttpError, SERVER_ERROR } from "../httpError";

type Handler = (req: Request, res: Response) => void;

export function withErrorHandling(handler: Handler): Handler {
  return (req, res) => {
    Promise.resolve().then(() => handler(req, res)).catch((error) => {
      if (error instanceof HttpError) {
        res.status(error.status).json({ errorMessage: error.message, ...(error.code && { code: error.code }) });
        return;
      }
      console.error(error);
      res.status(500).json({ errorMessage: SERVER_ERROR });
    });
  };
}
