import jwt from "jsonwebtoken";

export interface JwtPayload {
  userId: string;
  role: string;
}

const secret = (): string => {
  const s = process.env.JWT_SECRET;
  if (!s) throw new Error("JWT_SECRET is not defined");
  return s;
};

export const signToken = (payload: JwtPayload): string => {
  const expiresIn = (process.env.JWT_EXPIRES_IN ?? "7d") as jwt.SignOptions["expiresIn"];
  return jwt.sign(payload, secret(), { expiresIn });
};

export const verifyToken = (token: string): JwtPayload => {
  return jwt.verify(token, secret()) as JwtPayload;
};
