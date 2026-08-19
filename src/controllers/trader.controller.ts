import { Request, Response, NextFunction } from "express";

import { createWorkAreaSchema, updateTraderProfileSchema, updateWorkAreaSchema } from "../validators/trader.validator";
import { ZodError } from "zod";
import { AppError } from "../utils/AppError";
import { createWorkAreaService, getTraderProfileService, updateTraderProfileService, updateWorkAreaService } from "../services/Trader.service";

export const getTraderProfile = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = (req as Request & { user?: { userId: string } }).user?.userId;
    if (!userId) {
      throw new AppError("Unauthorized", 401);
    }

    const profile = await getTraderProfileService(userId);

    res.status(200).json({
      success: true,
      message: "Trader profile retrieved successfully",
      data: profile,
    });
  } catch (err) {
    next(err);
  }
};

export const updateTraderProfile = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = (req as Request & { user?: { userId: string } }).user?.userId;
    if (!userId) {
      throw new AppError("Unauthorized", 401);
    }

    const validatedInput = updateTraderProfileSchema.parse(req.body);
    const updatedProfile = await updateTraderProfileService(userId, validatedInput);

    res.status(200).json({
      success: true,
      message: "Trader profile updated successfully",
      data: updatedProfile,
    });
  } catch (err) {
    if (err instanceof ZodError) {
      const formatted = err.issues.map((e) => ({
        field: e.path.map(String).join("."),
        message: e.message,
      }));
      const error = new AppError("Validation failed", 422) as AppError & {
        errors: unknown[];
      };
      error.errors = formatted;
      return next(error);
    }
    next(err);
  }
};

export const createWorkArea = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = (req as Request & { user?: { userId: string } }).user?.userId;
    if (!userId) {
      throw new AppError("Unauthorized", 401);
    }

    const validatedInput = createWorkAreaSchema.parse(req.body);
    const createdWorkArea = await createWorkAreaService(userId, validatedInput);

    res.status(201).json({
      success: true,
      message: "Work area created successfully",
      data: createdWorkArea,
    });
  } catch (err) {
    if (err instanceof ZodError) {
      const formatted = err.issues.map((e) => ({
        field: e.path.map(String).join("."),
        message: e.message,
      }));
      const error = new AppError("Validation failed", 422) as AppError & {
        errors: unknown[];
      };
      error.errors = formatted;
      return next(error);
    }
    next(err);
  }
};

export const updateWorkArea = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = (req as Request & { user?: { userId: string } }).user?.userId;
    if (!userId) {
      throw new AppError("Unauthorized", 401);
    }

    const validatedInput = updateWorkAreaSchema.parse(req.body);
    const updatedWorkArea = await updateWorkAreaService(userId, validatedInput);

    res.status(200).json({
      success: true,
      message: "Work area updated successfully",
      data: updatedWorkArea,
    });
  } catch (err) {
    if (err instanceof ZodError) {
      const formatted = err.issues.map((e) => ({
        field: e.path.map(String).join("."),
        message: e.message,
      }));
      const error = new AppError("Validation failed", 422) as AppError & {
        errors: unknown[];
      };
      error.errors = formatted;
      return next(error);
    }
    next(err);
  }
};