import { Router } from "express";
import { register, login, getMe } from "../controllers/auth.controller";
import { authenticate } from "../middlewares/auth.middleware";

const router = Router();

/**
 * @route  POST /api/v1/auth/register
 * @desc   Register a new user (CUSTOMER or TRADER)
 * @access Public
 */
router.post("/register", register);

/**
 * @route  POST /api/v1/auth/login
 * @desc   Login with email & password
 * @access Public
 */
router.post("/login", login);

/**
 * @route  GET /api/v1/auth/me
 * @desc   Get current authenticated user
 * @access Private (requires Bearer token)
 */
router.get("/me", authenticate, getMe);

export default router;
