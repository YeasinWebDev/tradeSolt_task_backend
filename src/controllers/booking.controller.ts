import { getMyBookingsService } from "../services/booking.service";
import { Request, Response } from "express";

export const getMyBookingsController = async (req: Request, res: Response) => {
  try {
    const userId = (req as Request & { user?: { userId: string } }).user?.userId;
    const bookings = await getMyBookingsService(userId as string);
    res.status(200).json({
      success: true,
      data: bookings,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error,
    });
  }
};
