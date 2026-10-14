import { Router } from "express";
import { createPaymentOrder, verifyPayment, getOrders, getOrderById } from "../controllers/order.controller.js";
import { protect } from "../middlewares/auth.middleware.js";
import { asyncHandler } from "../utils/helpers.js";

const router = Router();
router.use(protect);
router.post("/create-payment-order", asyncHandler(createPaymentOrder));
router.post("/verify-payment", asyncHandler(verifyPayment));
router.get("/", asyncHandler(getOrders));
router.get("/:id", asyncHandler(getOrderById));
export default router;
