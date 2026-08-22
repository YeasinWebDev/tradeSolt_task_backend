import { Request, Response, NextFunction } from "express";
import { handleWebChatMessage } from "../services/chat.service";

/**
 * CHAT CONTROLLER
 * ---------------
 * Thin controller function that receives HTTP POST /api/chat/message
 */
export const postChatMessage = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { message, customerId } = req.body;

    if (!message) {
      res.status(400).json({ success: false, error: "Message is required." });
      return;
    }

    // Default customerId if not passed in body
    const activeCustomerId = customerId || (req as any).user?.userId || "cus_123";

    // Delegate to chat.service.ts
    const result = await handleWebChatMessage(activeCustomerId, message);

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};
