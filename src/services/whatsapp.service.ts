import { processBookingRequest, MessageInput } from "./booking.service";

/**
 * WHATSAPP SERVICE
 * ----------------
 * Handles WhatsApp incoming webhooks.
 * 1. Extracts phone number and message text from Meta webhook payload.
 * 2. Normalizes into standard MessageInput format.
 * 3. Calls the EXACT SAME shared processBookingRequest() function!
 * 4. Formats outgoing WhatsApp response.
 */
export const handleWhatsAppWebhookMessage = async (webhookPayload: any) => {
  // Step 1: Extract message text & sender phone from Meta WhatsApp JSON payload
  const entry = webhookPayload.entry?.[0];
  const change = entry?.changes?.[0]?.value;
  const messageData = change?.messages?.[0];

  const senderPhone = messageData?.from || "8801700000000";
  const rawText = messageData?.text?.body || "I need an electrician tomorrow at 2 PM";

  // Step 2: Normalize into the single MessageInput interface!
  const normalizedInput: MessageInput = {
    channel: "WHATSAPP",
    senderId: senderPhone,
    message: rawText,
    timestamp: new Date(),
  };

  // Step 3: Call the SHARED Booking Service (same function as Web Chat!)
  const bookingResult = await processBookingRequest(normalizedInput);

  // Step 4: Outbound reply payload for Meta Cloud API
  return {
    messaging_product: "whatsapp",
    to: senderPhone,
    text: {
      body: bookingResult.replyText,
    },
    bookingId: bookingResult.bookingId,
  };
};
