import { Request, Response, NextFunction } from "express";
import { handleWhatsAppWebhookMessage } from "../services/whatsapp.service";

/**
 * WHATSAPP CONTROLLER
 * -------------------
 * Receives Meta WhatsApp webhooks:
 * GET  /api/webhooks/whatsapp -> Webhook Verification Challenge
 * POST /api/webhooks/whatsapp -> Inbound Webhook Payload
 */

// GET Verification Handshake
export const verifyWhatsAppWebhook = (req: Request, res: Response): void => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === (process.env.WHATSAPP_VERIFY_TOKEN || "MY_VERIFY_TOKEN")) {
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
};

// POST Inbound Webhook Processing
export const receiveWhatsAppWebhook = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // 1. Immediately acknowledge webhook with 200 OK to Meta
    res.status(200).json({ status: "EVENT_RECEIVED" });

    // 2. Process message asynchronously via whatsapp.service.ts
    await handleWhatsAppWebhookMessage(req.body);
  } catch (error) {
    next(error);
  }
};
