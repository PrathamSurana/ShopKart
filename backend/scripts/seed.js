import "dotenv/config";
import mongoose from "mongoose";
import Product from "../models/product.model.js";
import { connectDB } from "../config/db.js";

// Placeholder images are labelled so the catalogue looks intentional offline-first; swap in real URLs any time.
const img = (label, bg = "1f2937", fg = "ffffff") => `https://placehold.co/600x450/${bg}/${fg}/png?text=${encodeURIComponent(label)}`;

export const PRODUCTS = [
  // Electronics
  { name: "Noise Cancelling Headphones", description: "Wireless over-ear headphones with active noise cancellation and 30-hour battery life.", price: 4999, category: "Electronics", image: img("Headphones", "1e3a8a"), stock: 25 },
  { name: "Mechanical Keyboard", description: "RGB mechanical keyboard with blue switches, aluminium top plate and detachable USB-C cable.", price: 2999, category: "Electronics", image: img("Keyboard", "1e40af"), stock: 10 },
  { name: "Wireless Gaming Mouse", description: "Lightweight 2.4GHz wireless mouse with 16,000 DPI sensor and 70-hour battery.", price: 1499, category: "Electronics", image: img("Mouse", "1d4ed8"), stock: 40 },
  { name: "Smartphone 128GB", description: "6.5-inch AMOLED display, 50MP camera, 5000mAh battery and fast charging.", price: 17999, category: "Electronics", image: img("Phone", "2563eb"), stock: 8 },
  { name: "Portable Bluetooth Speaker", description: "Water-resistant speaker with deep bass, 12-hour playtime and built-in microphone.", price: 2199, category: "Electronics", image: img("Speaker", "3b82f6"), stock: 3 },
  { name: "USB-C Fast Charger 65W", description: "Compact GaN charger that powers a laptop and a phone at the same time.", price: 1799, category: "Electronics", image: img("Charger", "60a5fa", "111827"), stock: 60 },
  // Fashion
  { name: "Classic Denim Jacket", description: "Mid-weight cotton denim jacket with a relaxed fit and brass buttons.", price: 2499, category: "Fashion", image: img("Denim Jacket", "7c2d12"), stock: 18 },
  { name: "Running Shoes", description: "Breathable mesh running shoes with cushioned sole and reflective details.", price: 3299, category: "Fashion", image: img("Running Shoes", "9a3412"), stock: 22 },
  { name: "Cotton Crew-Neck T-Shirt", description: "Pre-shrunk 100% cotton tee, soft hand-feel, available in a regular fit.", price: 599, category: "Fashion", image: img("T-Shirt", "c2410c"), stock: 120 },
  { name: "Leather Wallet", description: "Slim genuine-leather bifold wallet with six card slots and RFID protection.", price: 899, category: "Fashion", image: img("Wallet", "ea580c"), stock: 35 },
  // Books
  { name: "Clean Code", description: "A handbook of agile software craftsmanship by Robert C. Martin.", price: 899, category: "Books", image: img("Clean Code", "14532d"), stock: 30 },
  { name: "The Pragmatic Programmer", description: "Your journey to mastery: practical advice for working developers.", price: 1099, category: "Books", image: img("Pragmatic Programmer", "166534"), stock: 15 },
  { name: "Atomic Habits", description: "An easy and proven way to build good habits and break bad ones by James Clear.", price: 499, category: "Books", image: img("Atomic Habits", "15803d"), stock: 75 },
  { name: "Designing Data-Intensive Applications", description: "The big ideas behind reliable, scalable and maintainable systems.", price: 1899, category: "Books", image: img("DDIA", "16a34a"), stock: 0 },
  // Home
  { name: "Ceramic Coffee Mug Set (4)", description: "Set of four 350ml stoneware mugs, dishwasher and microwave safe.", price: 799, category: "Home", image: img("Mug Set", "581c87"), stock: 50 },
  { name: "LED Desk Lamp", description: "Dimmable LED lamp with three colour temperatures and a USB charging port.", price: 1299, category: "Home", image: img("Desk Lamp", "6b21a8"), stock: 28 },
  { name: "Non-Stick Cookware Set (3 pc)", description: "Induction-friendly non-stick set: frying pan, saucepan and kadhai with lids.", price: 2799, category: "Home", image: img("Cookware", "7e22ce"), stock: 12 },
  { name: "Memory Foam Pillow", description: "Ergonomic cervical pillow with a washable bamboo cover.", price: 999, category: "Home", image: img("Pillow", "9333ea"), stock: 45 },
];

async function run() {
  const resetStock = process.argv.includes("--reset-stock");
  await connectDB();
  let created = 0;
  let updated = 0;
  for (const p of PRODUCTS) {
    const { stock, ...catalogFields } = p;
    // Upsert by name => safe to re-run. Stock is only set on first insert (so real orders aren't undone),
    // unless --reset-stock is passed.
    const update = resetStock ? { $set: { ...catalogFields, stock } } : { $set: catalogFields, $setOnInsert: { stock } };
    const r = await Product.updateOne({ name: p.name }, update, { upsert: true, runValidators: true });
    if (r.upsertedCount) created++;
    else updated++;
  }
  console.log(`Seed complete: ${created} created, ${updated} already existed (catalogue fields refreshed${resetStock ? ", stock reset" : ", stock kept"}).`);
  await mongoose.disconnect();
}

run().catch(async (e) => {
  console.error("Seed failed:", e.message);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
