import mongoose from "mongoose";

export function notFound(req, res) {
  res.status(404).json({ success: false, message: `Route not found: ${req.method} ${req.originalUrl}` });
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  if (err instanceof mongoose.Error.ValidationError) {
    const errors = Object.fromEntries(Object.entries(err.errors).map(([k, v]) => [k, v.message]));
    return res.status(400).json({ success: false, message: Object.values(errors)[0] || "Validation failed", errors });
  }
  if (err instanceof mongoose.Error.CastError) {
    return res.status(400).json({ success: false, message: `Invalid value for ${err.path}` });
  }
  if (err instanceof mongoose.Error.VersionError) {
    return res.status(409).json({ success: false, message: "Your data changed in the meantime. Please try again." });
  }
  if (err?.code === 11000) {
    return res.status(409).json({ success: false, message: "Duplicate value" });
  }
  if (err?.type === "entity.parse.failed") {
    return res.status(400).json({ success: false, message: "Malformed JSON body" });
  }
  const status = err.status || 500;
  if (status >= 500) console.error(err);
  res.status(status).json({ success: false, message: status >= 500 && !err.status ? "Internal server error" : err.message });
}
