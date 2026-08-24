import { prisma } from "../../lib/prisma";
import { MessageInput, processBookingRequest } from "../../services/booking.service";
import { sendWhatsAppTextMessage } from "./whatsapp.api";

type WhatsAppMessage = {
  from?: string;
  timestamp?: string;
  text?: { body?: string };
  id?: string;
};

type WhatsAppWebhookPayload = {
  entry?: Array<{
    changes?: Array<{
      value?: { messages?: WhatsAppMessage[] };
    }>;
  }>;
};

/**
 * Reads the first incoming text message from a Meta webhook payload.
 */
const extractWhatsAppMessage = (payload: WhatsAppWebhookPayload): WhatsAppMessage | null => {
  return payload.entry?.[0]?.changes?.[0]?.value?.messages?.[0] ?? null;
};

/**
 * Normalizes a WhatsApp message into the shared booking input format.
 */
const normalizeWhatsAppMessage = (message: WhatsAppMessage): MessageInput => {
  if (!message.from || !message.text?.body) {
    throw new Error("WhatsApp webhook does not contain a text message.");
  }

  const timestamp = message.timestamp ? new Date(Number(message.timestamp) * 1000) : new Date();

  return {
    channel: "WHATSAPP",
    senderId: message.from,
    message: message.text.body,
    timestamp,
  };
};

/**
 * Processes one WhatsApp message with the same booking pipeline as Web Chat.
 */
export const handleWhatsAppWebhookMessage = async (payload: WhatsAppWebhookPayload) => {
  const message = extractWhatsAppMessage(payload);

  // Meta also sends status updates; they do not need booking processing.
  if (!message) {
    return { ignored: true };
  }

  const normalizedInput = normalizeWhatsAppMessage(message);

  let conversation = await prisma.conversation.findFirst({
    where: { customerId: normalizedInput.senderId, channel: "WHATSAPP" },
    orderBy: { createdAt: "desc" },
  });

  if (!conversation) {
    conversation = await prisma.conversation.create({
      data: { customerId: normalizedInput.senderId, channel: "WHATSAPP" },
    });
  }

  await prisma.message.create({
    data: {
      conversationId: conversation.id,
      senderId: normalizedInput.senderId,
      senderExternalId: normalizedInput.senderId,
      externalMessageId: message.id,
      senderRole: "CUSTOMER",
      channel: normalizedInput.channel,
      content: normalizedInput.message,
      createdAt: normalizedInput.timestamp,
    },
  });

  const bookingResult = await processBookingRequest(normalizedInput);

  await prisma.message.create({
    data: {
      conversationId: conversation.id,
      senderRole: "ASSISTANT",
      channel: normalizedInput.channel,
      content: bookingResult.replyText,
      bookingId: bookingResult.bookingId,
    },
  });

  await sendWhatsAppTextMessage(normalizedInput.senderId, bookingResult.replyText);

  return {
    conversationId: conversation.id,
    reply: bookingResult.replyText,
    bookingId: bookingResult.bookingId,
    success: bookingResult.success,
  };
};