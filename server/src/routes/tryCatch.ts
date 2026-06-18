import { Request, Response } from "express";
import { HttpError, SERVER_ERROR } from "../httpError";

type Handler = (req: Request, res: Response) => void;

export function tryCatch(handler: Handler): Handler {
  return (req, res) => {
    try {
      handler(req, res);
    } catch (error) {
      if (error instanceof HttpError) {
        res.status(error.status).json({ errorMessage: error.message });
        return;
      }
      console.error(error);
      res.status(500).json({ errorMessage: SERVER_ERROR });
    }
  };
}
