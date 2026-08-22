import { Router } from "express";
import { verifyWhatsAppWebhook, receiveWhatsAppWebhook } from "../controllers/whatsapp.controller";

const router = Router();

// Meta verification handshake
router.get("/", verifyWhatsAppWebhook);

// Meta inbound webhook payload
router.post("/", receiveWhatsAppWebhook as any);

export const whatsappModuleRoutes = router;
