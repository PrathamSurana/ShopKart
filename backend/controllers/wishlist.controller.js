import Customer from "../models/customer.model.js";
import Product from "../models/product.model.js";
import { isValidId } from "../utils/helpers.js";

export async function addToWishlist(req, res) {
  const { productId } = req.params;
  if (!isValidId(productId)) return res.status(400).json({ success: false, message: "Invalid product ID" });
  if (!(await Product.exists({ _id: productId }))) {
    return res.status(404).json({ success: false, message: "Product not found" });
  }

  // Atomic: only pushes if the id is not already present, so duplicates are impossible even under races.
  const result = await Customer.updateOne({ _id: req.user._id, wishlist: { $ne: productId } }, { $push: { wishlist: productId } });
  if (result.modifiedCount === 0) {
    return res.status(409).json({ success: false, message: "Product already in wishlist" });
  }
  res.status(201).json({ success: true, message: "Product added to wishlist" });
}

export async function getWishlist(req, res) {
  const customer = await Customer.findById(req.user._id).populate({
    path: "wishlist",
    select: "name price category image stock",
  });
  // Products deleted after being wishlisted populate to null; hide them.
  const wishlist = customer.wishlist.filter(Boolean);
  res.status(200).json({ success: true, count: wishlist.length, wishlist });
}

export async function removeFromWishlist(req, res) {
  const { productId } = req.params;
  if (!isValidId(productId)) return res.status(400).json({ success: false, message: "Invalid product ID" });

  const result = await Customer.updateOne({ _id: req.user._id, wishlist: productId }, { $pull: { wishlist: productId } });
  if (result.modifiedCount === 0) {
    return res.status(404).json({ success: false, message: "Product not in wishlist" });
  }
  res.status(200).json({ success: true, message: "Product removed from wishlist" });
}
