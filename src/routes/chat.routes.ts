import { Router } from "express";
import { postChatMessage } from "../controllers/chat.controller";
import { authenticate } from "../middlewares/auth.middleware";

const router = Router();

// POST /api/chat/message
router.post("/message", authenticate, postChatMessage as any);

export const chatModuleRoutes = router;
