import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma";
import { signToken } from "../utils/jwt";
import { AppError } from "../utils/AppError";
import type { RegisterInput, LoginInput } from "../validators/auth.validator";

const SALT_ROUNDS = 12;

// ─── Strip password before returning user ────────────────────────────────────
function sanitizeUser(user: { password: string | null; [key: string]: unknown }) {
  const { password: _pw, ...rest } = user;
  return rest;
}

// ─── Register ────────────────────────────────────────────────────────────────
export const registerService = async (input: RegisterInput) => {
  const { name, email, password, phone, role } = input;

  // Check duplicate email
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw new AppError("An account with this email already exists", 409);
  }

  // Check duplicate phone (if provided)
  if (phone) {
    const phoneExists = await prisma.user.findUnique({ where: { phone } });
    if (phoneExists) {
      throw new AppError("An account with this phone number already exists", 409);
    }
  }

  const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

  const user = await prisma.user.create({
    data: {
      name,
      email,
      password: hashedPassword,
      phone: phone ?? null,
      role,
    },
  });

  if (role === "TRADER") {
    await prisma.traderProfile.create({ data: { userId: user.id } });
  }
  const token = signToken({ userId: user.id, role: user.role });

  return { user: sanitizeUser(user), token };
};

// ─── Login ───────────────────────────────────────────────────────────────────
export const loginService = async (input: LoginInput) => {
  const { email, password } = input;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.password) {
    // Generic message to prevent email enumeration
    throw new AppError("Invalid email or password", 401);
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    throw new AppError("Invalid email or password", 401);
  }

  const token = signToken({ userId: user.id, role: user.role });

  return { user: sanitizeUser(user), token };
};

// ─── Get current user ────────────────────────────────────────────────────────
export const getMeService = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { traderProfile: true },
  });

  if (!user) {
    throw new AppError("User not found", 404);
  }

  return sanitizeUser(user);
};
