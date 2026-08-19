import { prisma } from "../lib/prisma";
import { AppError } from "../utils/AppError";
import type { CreateWorkAreaInput, UpdateTraderProfileInput, UpdateWorkAreaInput } from "../validators/trader.validator";

export const getTraderProfileService = async (userId: string) => {
  // Check user role & existence
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!user) {
    throw new AppError("User not found", 404);
  }

  let traderProfile = await prisma.traderProfile.findUnique({
    where: { userId },
    include: {
      workAreas: {
        orderBy: { date: "asc" },
      },
      bookings: {
        orderBy: { createdAt: "desc" },
      },
    },
  });

  // Ensure TraderProfile exists if user is TRADER
  if (!traderProfile && user.role === "TRADER") {
    traderProfile = await prisma.traderProfile.create({
      data: { userId },
      include: {
        workAreas: true,
        bookings: true,
      },
    });
  }

  return {
    ...traderProfile,
    user,
  };
};

export const updateTraderProfileService = async (
  userId: string,
  input: UpdateTraderProfileInput
) => {
  const { businessName, description } = input;

  const existingProfile = await prisma.traderProfile.findUnique({
    where: { userId },
  });

  if (!existingProfile) {
    throw new AppError("Trader profile not found", 404);
  }

  const updatedProfile = await prisma.traderProfile.update({
    where: { userId },
    data: {
      ...(businessName !== undefined && { businessName }),
      ...(description !== undefined && { description }),
    },
    include: {
      workAreas: {
        orderBy: { date: "asc" },
      },
      bookings: {
        orderBy: { createdAt: "desc" },
      },
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          role: true,
          createdAt: true,
          updatedAt: true,
        },
      },
    },
  });

  return updatedProfile;
};

export const createWorkAreaService = async (
  userId: string,
  input: CreateWorkAreaInput
) => {
  const existingProfile = await prisma.traderProfile.findUnique({
    where: { userId },
  });

  if (!existingProfile) {
    throw new AppError("Trader profile not found", 404);
  }

  const createdWorkArea = await prisma.workArea.create({
    data: {
      traderId: existingProfile.id,
      date: new Date(input.date),
      area: input.area,
      startTime: input.startTime,
      endTime: input.endTime,
    }
  });

  return createdWorkArea;
};

export const updateWorkAreaService = async (
  userId: string,
  input: UpdateWorkAreaInput
) => {
  const existingProfile = await prisma.traderProfile.findUnique({
    where: { userId },
  });

  if (!existingProfile) {
    throw new AppError("Trader profile not found", 404);
  }

  const updatedWorkArea = await prisma.workArea.update({
    where: { id: input.workAreaId },
    data: {
      date: new Date(input.date),
      area: input.area,
      startTime: input.startTime,
      endTime: input.endTime,
    }
  });

  return updatedWorkArea;
};

