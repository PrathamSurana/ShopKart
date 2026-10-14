import mongoose from "mongoose";

const cartItemSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    quantity: { type: Number, default: 1, min: 1 },
  },
  { _id: false }
);

// One identity for the whole app. Labs 04-06 call this "User"; it is the Lab 01 Customer.
const customerSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, select: false }, // bcrypt hash; never returned by default
    phone: { type: String, required: true, trim: true },
    wishlist: { type: [{ type: mongoose.Schema.Types.ObjectId, ref: "Product" }], default: [] },
    cart: { type: [cartItemSchema], default: [] },
  },
  { timestamps: true }
);

export default mongoose.model("Customer", customerSchema);
