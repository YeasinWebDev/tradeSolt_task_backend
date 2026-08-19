import { Request, Response, NextFunction } from "express";
import { registerService, loginService, getMeService } from "../services/auth.service";
import { registerSchema, loginSchema } from "../validators/auth.validator";
import { ZodError } from "zod";
import { AppError } from "../utils/AppError";

// ─── Register ────────────────────────────────────────────────────────────────
export const register = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const input = registerSchema.parse(req.body);
    const data = await registerService(input);

    res.status(201).json({
      success: true,
      message: "Account created successfully",
      data,
    });
  } catch (err) {
    if (err instanceof ZodError) {
      const formatted = err.issues.map((e) => ({
        field: e.path.map(String).join("."),
        message: e.message,
      }));
      const error = new AppError("Validation failed", 422) as AppError & { errors: unknown[] };
      error.errors = formatted;
      return next(error);
    }
    next(err);
  }
};

// ─── Login ───────────────────────────────────────────────────────────────────
export const login = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const input = loginSchema.parse(req.body);
    const data = await loginService(input);

    res.status(200).json({
      success: true,
      message: "Logged in successfully",
      data,
    });
  } catch (err) {
    if (err instanceof ZodError) {
      const formatted = err.issues.map((e) => ({
        field: e.path.map(String).join("."),
        message: e.message,
      }));
      const error = new AppError("Validation failed", 422) as AppError & { errors: unknown[] };
      error.errors = formatted;
      return next(error);
    }
    next(err);
  }
};

// ─── Get Me (protected) ──────────────────────────────────────────────────────
export const getMe = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = (req as Request & { user?: { userId: string } }).user?.userId;
    if (!userId) {
      throw new AppError("Unauthorized", 401);
    }
    const user = await getMeService(userId);

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (err) {
    next(err);
  }
};
