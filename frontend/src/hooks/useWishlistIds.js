import { useCallback, useEffect, useState } from "react";
import { addToWishlist, errorMessage, fetchWishlist, isCanceled, removeFromWishlist } from "../services/api";

/**
 * Page-level helper (deliberately NOT global state, per Lab 04): the backend is the source of truth.
 * Loads which product ids are wishlisted and exposes a toggle that calls POST/DELETE /wishlist/:id.
 */
export default function useWishlistIds() {
  const [ids, setIds] = useState(() => new Set());
  const [busy, setBusy] = useState(() => new Set());
  const [errors, setErrors] = useState({}); // productId -> message

  useEffect(() => {
    const c = new AbortController();
    fetchWishlist(c.signal)
      .then((d) => setIds(new Set(d.wishlist.map((p) => p._id))))
      .catch((e) => !isCanceled(e) && setIds(new Set())); // non-fatal: buttons default to "not saved"
    return () => c.abort();
  }, []);

  const setFlag = (setter, id, on) =>
    setter((prev) => {
      const next = new Set(prev);
      on ? next.add(id) : next.delete(id);
      return next;
    });

  const toggle = useCallback(
    async (id) => {
      if (busy.has(id)) return; // no duplicate requests while saving
      setFlag(setBusy, id, true);
      setErrors((e) => ({ ...e, [id]: "" }));
      const saved = ids.has(id);
      try {
        if (saved) {
          await removeFromWishlist(id);
          setFlag(setIds, id, false);
        } else {
          try {
            await addToWishlist(id);
          } catch (e) {
            if (e.response?.status !== 409) throw e; // 409 = already saved: treat as success
          }
          setFlag(setIds, id, true);
        }
      } catch (e) {
        setErrors((prev) => ({ ...prev, [id]: errorMessage(e, "Unable to save product. Please try again.") }));
      } finally {
        setFlag(setBusy, id, false);
      }
    },
    [ids, busy]
  );

  return { ids, busy, errors, toggle };
}
