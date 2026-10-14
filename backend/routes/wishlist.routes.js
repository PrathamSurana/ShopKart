import { Router } from "express";
import { addToWishlist, getWishlist, removeFromWishlist } from "../controllers/wishlist.controller.js";
import { protect } from "../middlewares/auth.middleware.js";
import { asyncHandler } from "../utils/helpers.js";

const router = Router();
router.use(protect);
router.get("/", asyncHandler(getWishlist));
router.post("/:productId", asyncHandler(addToWishlist));
router.delete("/:productId", asyncHandler(removeFromWishlist));
export default router;
