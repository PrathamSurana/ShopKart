import Product from "../models/product.model.js";
import { escapeRegex, isValidId } from "../utils/helpers.js";

const LIST_FIELDS = "name price category image stock"; // what the UI needs for cards
const SORTS = { price_asc: { price: 1 }, price_desc: { price: -1 }, newest: { createdAt: -1 } };

export async function createProduct(req, res) {
  const { name, description, price, category, image, stock } = req.body ?? {};
  // Explicit pick => no mass assignment. Mongoose enforces required/price>0/stock>=0 (ValidationError -> 400).
  const product = await Product.create({ name, description, price, category, image, stock });
  res.status(201).json({ success: true, product });
}

export async function getProducts(req, res) {
  const { search, category, sort } = req.query;
  const filter = {};

  if (typeof search === "string" && search.trim()) {
    filter.name = { $regex: escapeRegex(search.trim()), $options: "i" }; // case-insensitive "contains"
  }
  if (typeof category === "string" && category.trim()) {
    filter.category = { $regex: `^${escapeRegex(category.trim())}$`, $options: "i" };
  }

  const order = SORTS[sort] || SORTS.newest;
  const products = await Product.find(filter).select(LIST_FIELDS).sort({ ...order, _id: 1 }).lean();
  res.status(200).json({ success: true, count: products.length, products });
}

export async function getProductById(req, res) {
  if (!isValidId(req.params.id)) return res.status(400).json({ success: false, message: "Invalid product ID" });
  const product = await Product.findById(req.params.id).lean();
  if (!product) return res.status(404).json({ success: false, message: "Product not found" });
  res.status(200).json({ success: true, product });
}
