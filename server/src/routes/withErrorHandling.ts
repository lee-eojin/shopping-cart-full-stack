import { Request, Response } from "express";
import { HttpError, SERVER_ERROR } from "../httpError";

type Handler = (req: Request, res: Response) => void | Promise<void>;

export function withErrorHandling(handler: Handler): Handler {
  return async(req, res) => {
    try { 
      await handler(req, res) 
    } catch (error) {
      if (error instanceof HttpError) {
        res.status(error.status).json({ errorMessage: error.message, ...(error.code && { code: error.code }) });
        return;
      }
      
      console.error(error);
      res.status(500).json({ errorMessage: SERVER_ERROR });
    };
  }  
}