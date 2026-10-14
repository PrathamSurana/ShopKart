import { Router } from "express";
import { addToCart, getCart, updateQuantity, removeFromCart } from "../controllers/cart.controller.js";
import { protect } from "../middlewares/auth.middleware.js";
import { asyncHandler } from "../utils/helpers.js";

const router = Router();
router.use(protect);
router.get("/", asyncHandler(getCart));
router.post("/:productId", asyncHandler(addToCart));
router.patch("/:productId", asyncHandler(updateQuantity));
router.delete("/:productId", asyncHandler(removeFromCart));
export default router;
