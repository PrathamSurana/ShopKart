import Customer from "../models/customer.model.js";
import Product from "../models/product.model.js";
import { isValidId } from "../utils/helpers.js";

const PRODUCT_FIELDS = "name price category image stock";

// Always reads the latest Product data (price/stock), never copies it into the cart.
async function loadCart(customerId) {
  const customer = await Customer.findById(customerId).populate({ path: "cart.product", select: PRODUCT_FIELDS });
  const live = customer.cart.filter((i) => i.product); // drop items whose product was deleted
  if (live.length !== customer.cart.length) {
    await Customer.updateOne({ _id: customerId }, { $set: { cart: live.map((i) => ({ product: i.product._id, quantity: i.quantity })) } });
  }
  return live.map((i) => ({ product: i.product, quantity: i.quantity }));
}

const badId = (res) => res.status(400).json({ success: false, message: "Invalid product ID" });

export async function addToCart(req, res) {
  const { productId } = req.params;
  if (!isValidId(productId)) return badId(res);

  const product = await Product.findById(productId).select("stock name");
  if (!product) return res.status(404).json({ success: false, message: "Product not found" });
  if (product.stock < 1) return res.status(400).json({ success: false, message: `${product.name} is out of stock` });

  const id = req.user._id;
  const existing = req.user.cart.find((i) => String(i.product) === productId); // req.user was just loaded by auth middleware

  if (existing) {
    const next = existing.quantity + 1;
    if (next > product.stock) {
      return res.status(400).json({ success: false, message: `Only ${product.stock} unit(s) of ${product.name} available` });
    }
    existing.quantity = next; // absolute, stock-validated value: can never exceed stock
  } else {
    req.user.cart.push({ product: productId, quantity: 1 }); // single row per product
  }
  // save() is version-checked: a concurrent cart change makes this fail with VersionError (-> 409) instead of corrupting data.
  await req.user.save();

  res.status(200).json({ success: true, message: "Cart updated", cart: await loadCart(id) });
}

export async function getCart(req, res) {
  res.status(200).json({ success: true, cart: await loadCart(req.user._id) });
}

export async function updateQuantity(req, res) {
  const { productId } = req.params;
  if (!isValidId(productId)) return badId(res);

  const { quantity } = req.body ?? {};
  if (typeof quantity !== "number" || !Number.isInteger(quantity)) {
    return res.status(400).json({ success: false, message: "Quantity must be a whole number" });
  }
  if (quantity < 1) return res.status(400).json({ success: false, message: "Quantity must be at least 1" });

  const product = await Product.findById(productId).select("stock name");
  if (!product) return res.status(404).json({ success: false, message: "Product not found" });
  if (!req.user.cart.some((i) => String(i.product) === productId)) {
    return res.status(404).json({ success: false, message: "Product not in cart" });
  }
  if (quantity > product.stock) {
    return res.status(400).json({ success: false, message: `Only ${product.stock} unit(s) of ${product.name} available` });
  }

  req.user.cart.find((i) => String(i.product) === productId).quantity = quantity;
  await req.user.save();
  res.status(200).json({ success: true, message: "Cart updated", cart: await loadCart(req.user._id) });
}

export async function removeFromCart(req, res) {
  const { productId } = req.params;
  if (!isValidId(productId)) return badId(res);

  if (!req.user.cart.some((i) => String(i.product) === productId)) {
    return res.status(404).json({ success: false, message: "Product not in cart" });
  }
  req.user.cart = req.user.cart.filter((i) => String(i.product) !== productId);
  await req.user.save();

  res.status(200).json({ success: true, message: "Item removed from cart", cart: await loadCart(req.user._id) });
}
