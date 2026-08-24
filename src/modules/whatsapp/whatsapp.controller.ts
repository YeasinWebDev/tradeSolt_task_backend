import { NextFunction, Request, Response } from "express";
import { handleWhatsAppWebhookMessage } from "./whatsapp.service";

/**
 * Handles Meta's webhook verification request.
 */
export const verifyWhatsAppWebhook = (req: Request, res: Response): void => {
  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN;
  const isValid = req.query["hub.mode"] === "subscribe" && req.query["hub.verify_token"] === verifyToken;

  if (isValid) {
    res.status(200).send(req.query["hub.challenge"]);
    return;
  }

  res.sendStatus(403);
};

/**
 * Acknowledges Meta and processes the incoming webhook message.
 */
export const receiveWhatsAppWebhook = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    res.sendStatus(200);
    await handleWhatsAppWebhookMessage(req.body);
  } catch (error) {
    next(error);
  }
};