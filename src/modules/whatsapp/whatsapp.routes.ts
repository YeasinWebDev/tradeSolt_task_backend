import { Router } from "express";
import { receiveWhatsAppWebhook, verifyWhatsAppWebhook } from "./whatsapp.controller";

const router = Router();

router.get("/", verifyWhatsAppWebhook);
router.post("/", receiveWhatsAppWebhook);

export const whatsappModuleRoutes = router;