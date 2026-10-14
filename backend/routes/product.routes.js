import { Router } from "express";
import { createProduct, getProducts, getProductById } from "../controllers/product.controller.js";
import { asyncHandler } from "../utils/helpers.js";

const router = Router();
router.post("/", asyncHandler(createProduct)); // open for now (Lab 03); admin auth comes later
router.get("/", asyncHandler(getProducts));
router.get("/:id", asyncHandler(getProductById));
export default router;
