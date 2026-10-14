import { useState } from "react";

const FALLBACK =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='600' height='450'><rect width='100%' height='100%' fill='#e5e7eb'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='28' fill='#6b7280'>Image unavailable</text></svg>`
  );

export default function ProductImage({ src, alt, className = "" }) {
  const [failed, setFailed] = useState(false);
  return <img className={className} src={failed ? FALLBACK : src} alt={alt} loading="lazy" onError={() => setFailed(true)} />;
}
