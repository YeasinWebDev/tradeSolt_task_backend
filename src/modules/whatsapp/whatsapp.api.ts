/**
 * Sends a text reply through the WhatsApp Cloud API.
 */
export const sendWhatsAppTextMessage = async (phoneNumber: string, messageText: string): Promise<void> => {
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (!accessToken || !phoneNumberId) {
    throw new Error("WHATSAPP_ACCESS_TOKEN and WHATSAPP_PHONE_NUMBER_ID are required.");
  }

  const response = await fetch(`https://graph.facebook.com/v20.0/${phoneNumberId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: phoneNumber,
      type: "text",
      text: { body: messageText },
    }),
  });

  if (!response.ok) {
    throw new Error(`WhatsApp API returned status ${response.status}: ${await response.text()}`);
  }
};