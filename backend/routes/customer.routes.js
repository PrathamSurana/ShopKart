import { Router } from "express";
import { register, login, me, logout } from "../controllers/customer.controller.js";
import { protect } from "../middlewares/auth.middleware.js";
import { asyncHandler } from "../utils/helpers.js";

const router = Router();
router.post("/register", asyncHandler(register));
router.post("/login", asyncHandler(login));
router.get("/me", protect, me);
router.post("/logout", protect, logout);
export default router;
