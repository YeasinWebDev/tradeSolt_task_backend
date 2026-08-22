import { prisma } from "../lib/prisma";

export interface CheckSlotParams {
  date: Date;
  startTime: Date;
  location?: string;
}

/**
 * SCHEDULING SERVICE
 * ------------------
 * Purpose: Checks if a trader is free for a requested time slot,
 * taking into account a mandatory 30-minute travel buffer.
 */
export const checkTraderAvailability = async (params: CheckSlotParams) => {
  const { date, startTime,location } = params;

  // 1. Working Hours Guard (9:00 AM - 6:00 PM)
  const requestedHour = startTime.getUTCHours();
  if (requestedHour < 9 || requestedHour >= 18) {
    return {
      available: false,
      reason: "Trader only works between 9:00 AM and 6:00 PM.",
    };
  }

  // 2. Query bookings on the same date
  const startOfDay = new Date(date);
  startOfDay.setUTCHours(0, 0, 0, 0);

  const endOfDay = new Date(date);
  endOfDay.setUTCHours(23, 59, 59, 999);

  // Find active trader profile
  const traderTest = await prisma.traderProfile.findFirst({
    where: {
      workAreas: {
        some: {
          area: location,
        },
      },
    }
  });

  if (!traderTest) {
    return { available: false, reason: "No profile in that location . Try another location." };
  }

  const trader = await prisma.traderProfile.findFirst({
    include: {
      bookings: {
        where: {
          date: { gte: startOfDay, lte: endOfDay },
          status: { in: ["PENDING_PAYMENT", "CONFIRMED"] },
        },
      },
    },
  });

  if (!trader) {
    return { available: false  , reason: "No trader booked on that date"};
  }

  // 3. Travel Buffer Calculation (30 minutes = 30 * 60 * 1000 ms)
  const BUFFER_MS = 30 * 60 * 1000;
  const requestedStartMs = startTime.getTime();

  for (const existingBooking of trader.bookings) {
    const existingStartMs = new Date(existingBooking.startTime).getTime();
    const existingEndMs = new Date(existingBooking.endTime).getTime();

    // Blocked Window: [existingStart - 30m, existingEnd + 30m]
    const blockedStartMs = existingStartMs - BUFFER_MS;
    const blockedEndMs = existingEndMs + BUFFER_MS;

    if (requestedStartMs >= blockedStartMs && requestedStartMs < blockedEndMs) {
      return {
        available: false,
        traderId: trader.id,
        reason: `Slot is unavailable due to an existing booking . Please try 2 hour later slots for ${location}.`,
      };
    }
  }

  // Slot is clear!
  return {
    available: true,
    traderId: trader.id,
  };
};
