export interface ParsedBookingIntent {
  intent: "BOOKING_REQUEST" | "CANCEL_BOOKING" | "QUERY_STATUS" | "UNKNOWN";
  service?: string;
  date?: string; // Format: YYYY-MM-DD
  time?: string; // Format: HH:mm (24-hr)
  location?: string;
  clarificationPrompt?: string;
}

/**
 * AI PARSER SERVICE (OpenRouter Integration)
 * -----------------------------------------
 * Converts natural language user messages into structured booking information using OpenRouter Free Models.
 * Recommended Free Models:
 *  - meta-llama/llama-3.3-70b-instruct:free
 *  - google/gemini-2.0-flash-lite-preview-02-05:free
 *  - deepseek/deepseek-r1:free
 * 
 * STRICT RULE: AI only parses text into structured JSON. It NEVER modifies DB directly.
 */
export const parseBookingIntentWithAI = async (userMessage: string): Promise<ParsedBookingIntent> => {
  const openRouterApiKey = process.env.OPENROUTER_API_KEY;
  const openRouterModel = process.env.OPENROUTER_MODEL || "meta-llama/llama-3.3-70b-instruct:free";

  // 1. Try OpenRouter API if API Key is configured
  if (openRouterApiKey) {
    try {
      const currentDate = new Date().toISOString().split("T")[0];
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${openRouterApiKey}`,
          "HTTP-Referer": process.env.CLIENT_URL || "http://localhost:3000",
          "X-Title": "TradeSlot",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: openRouterModel,
          messages: [
            {
              role: "system",
              content: `You are an AI natural language parser for a tradesperson booking engine. Today's date is: ${currentDate}.
Analyze the user's message and extract structured JSON strictly matching this schema:
{
  "intent": "BOOKING_REQUEST" | "CANCEL_BOOKING" | "QUERY_STATUS" | "UNKNOWN",
  "service": "electrician" | "plumber" | "carpenter" | "painter" | "cleaner" | string,
  "date": "YYYY-MM-DD",
  "time": "HH:mm" (24-hour time),
  "location": string
}
Rules:
- Resolve relative terms like "tomorrow", "today" relative to ${currentDate}.
- Convert times like "3 PM" to 24-hour "15:00".
- Return ONLY valid raw JSON without markdown backticks or extra text.`,
            },
            {
              role: "user",
              content: userMessage,
            },
          ],
          temperature: 0,
        }),
      });

      if (response.ok) {
        const data = (await response.json()) as any;
        const rawContent = data.choices?.[0]?.message?.content?.trim() || "";
        const cleanJson = rawContent.replace(/```json/g, "").replace(/```/g, "").trim();
        const parsed = JSON.parse(cleanJson);

        return {
          intent: parsed.intent || "BOOKING_REQUEST",
          service: parsed.service || undefined,
          date: parsed.date || undefined,
          time: parsed.time || undefined,
          location: parsed.location || undefined,
        };
      } else {
        console.warn("OpenRouter API returned status:", response.status, await response.text());
      }
    } catch (err) {
      console.warn("OpenRouter API request failed, using local parser fallback:", err);
    }
  }

  // 2. Rule-based Local Parser Fallback (when API key is missing or offline)
  const text = userMessage.trim().toLowerCase();
  const isBooking =
    text.includes("need") ||
    text.includes("book") ||
    text.includes("want") ||
    text.includes("looking for") ||
    text.includes("plumber") ||
    text.includes("electrician") ||
    text.includes("carpenter");

  if (!isBooking) {
    return {
      intent: "UNKNOWN",
      clarificationPrompt: "How can I help you with your booking today?",
    };
  }

  // Extract Service
  let service: string | undefined;
  const services = ["plumber", "electrician", "carpenter", "painter", "cleaner"];
  for (const s of services) {
    if (text.includes(s)) {
      service = s;
      break;
    }
  }

  // Extract Date
  let dateStr: string | undefined;
  const today = new Date();

  if (text.includes("tomorrow")) {
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    dateStr = tomorrow.toISOString().split("T")[0];
  } else if (text.includes("today")) {
    dateStr = today.toISOString().split("T")[0];
  } else {
    const dateMatch = text.match(/\b\d{4}-\d{2}-\d{2}\b/);
    dateStr = dateMatch ? dateMatch[0] : new Date(today.setDate(today.getDate() + 1)).toISOString().split("T")[0];
  }

  // Extract Time (e.g. "3 PM" -> "15:00")
  let timeStr: string | undefined;
  const timeMatch12 = text.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)/i);
  const timeMatch24 = text.match(/\b([01]?\d|2[0-3]):([0-5]\d)\b/);

  if (timeMatch12) {
    let hours = parseInt(timeMatch12[1], 10);
    const minutes = timeMatch12[2] ? timeMatch12[2] : "00";
    const meridian = timeMatch12[3].toLowerCase();
    if (meridian === "pm" && hours < 12) hours += 12;
    if (meridian === "am" && hours === 12) hours = 0;
    timeStr = `${hours.toString().padStart(2, "0")}:${minutes}`;
  } else if (timeMatch24) {
    timeStr = timeMatch24[0].padStart(5, "0");
  } else {
    timeStr = "15:00";
  }

  // Extract Location
  let location: string | undefined;
  const locationMatch = text.match(/(?:in|at)\s+([a-zA-Z0-9\s]+?)(?:\s+at|\s+tomorrow|\s+today|\.|$)/i);
  if (locationMatch) {
    location = locationMatch[1].trim();
  }

  return {
    intent: "BOOKING_REQUEST",
    service: service || "plumber",
    date: dateStr,
    time: timeStr,
    location: location || "Dhanmondi",
  };
};
