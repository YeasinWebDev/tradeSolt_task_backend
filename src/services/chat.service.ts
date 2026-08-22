import { prisma } from "../lib/prisma";
import { MessageInput, processBookingRequest } from "./booking.service";


/**
 * CHAT SERVICE (Web Chat)
 * -----------------------
 * Handles Web Chat messaging logic.
 * 1. Normalizes Web Chat input to MessageInput format.
 * 2. Saves incoming & outgoing messages into Prisma.
 * 3. Invokes the single shared Booking Service.
 */
export const handleWebChatMessage = async (customerId: string, rawMessage: string) => {
  // Step 1: Normalize incoming message to common format
  const normalizedInput: MessageInput = {
    channel: "WEB",
    senderId: customerId,
    message: rawMessage,
  };

  // Step 2: Get or create active conversation in Prisma
  let conversation = await prisma.conversation.findFirst({
    where: { customerId, channel: "WEB" },
    orderBy: { createdAt: "desc" },
  });

  if (!conversation) {
    conversation = await prisma.conversation.create({
      data: { customerId, channel: "WEB" },
    });
  }

  // Step 3: Save Customer Message to DB
  await prisma.message.create({
    data: {
      conversationId: conversation.id,
      senderId: customerId,
      senderRole: "CUSTOMER",
      channel: "WEB",
      content: rawMessage,
    },
  });

  // Step 4: Call SHARED Booking Service
  const bookingResult = await processBookingRequest(normalizedInput);

  // Step 5: Save Bot Response to DB
  const botMessage = await prisma.message.create({
    data: {
      conversationId: conversation.id,
      senderRole: "ASSISTANT",
      channel: "WEB",
      content: bookingResult.replyText,
      bookingId: bookingResult.bookingId,
    },
  });

  return {
    conversationId: conversation.id,
    reply: botMessage.content,
    bookingId: bookingResult.bookingId,
    success: bookingResult.success,
  };
};
