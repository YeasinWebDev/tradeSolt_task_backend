import { Router } from "express";
import { authenticate } from "../middlewares/auth.middleware";
import { createWorkArea, getTraderProfile, updateTraderProfile, updateWorkArea, connectStripeAccount, getStripeConnectStatus } from "../controllers/trader.controller";

export const TraderRoutes = Router()

TraderRoutes.get('/',authenticate , getTraderProfile)
TraderRoutes.put('/',authenticate , updateTraderProfile)
TraderRoutes.post('/work-area', authenticate, createWorkArea)
TraderRoutes.put('/work-area', authenticate, updateWorkArea)

// Stripe Connect onboarding (traders)
TraderRoutes.post('/connect', authenticate, connectStripeAccount)
TraderRoutes.get('/connect', authenticate, getStripeConnectStatus)