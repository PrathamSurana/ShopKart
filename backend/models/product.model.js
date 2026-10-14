import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, "name is required"], trim: true },
    description: { type: String, required: [true, "description is required"], trim: true },
    price: {
      type: Number,
      required: [true, "price is required"],
      validate: { validator: (v) => Number.isFinite(v) && v > 0, message: "price must be greater than 0" },
    },
    category: { type: String, required: [true, "category is required"], trim: true },
    image: { type: String, required: [true, "image is required"], trim: true },
    stock: {
      type: Number,
      required: [true, "stock is required"],
      min: [0, "stock cannot be negative"],
      validate: { validator: Number.isInteger, message: "stock must be a whole number" },
    },
  },
  { timestamps: true }
);

productSchema.index({ name: 1 });
productSchema.index({ category: 1 });

export default mongoose.model("Product", productSchema);
