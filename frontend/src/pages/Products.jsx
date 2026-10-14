import { useCallback, useEffect, useState } from "react";
import { errorMessage, fetchProducts, isCanceled } from "../services/api";
import useWishlistIds from "../hooks/useWishlistIds";
import SearchBar from "../components/SearchBar";
import ProductCard from "../components/ProductCard";
import { EmptyState, ErrorState, Loading } from "../components/StateViews";

export default function Products() {
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [category, setCategory] = useState("");
  const [sort, setSort] = useState("");
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);
  const wishlist = useWishlistIds();

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 350); // wait for the user to stop typing
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    const c = new AbortController();
    setLoading(true);
    setError("");
    const params = {};
    if (debounced) params.search = debounced;
    if (category) params.category = category;
    if (sort) params.sort = sort;
    fetchProducts(params, c.signal)
      .then((d) => {
        setProducts(d.products);
        setLoading(false);
      })
      .catch((e) => {
        if (isCanceled(e)) return;
        setError(errorMessage(e));
        setLoading(false);
      });
    return () => c.abort(); // a newer search cancels the older request, so stale results never overwrite fresh ones
  }, [debounced, category, sort, reload]);

  const retry = useCallback(() => setReload((n) => n + 1), []);

  return (
    <main className="container page">
      <h1>Products</h1>
      <SearchBar search={search} onSearch={setSearch} category={category} onCategory={setCategory} sort={sort} onSort={setSort} />
      {loading ? (
        <Loading text="Loading products..." />
      ) : error ? (
        <ErrorState title="Something went wrong while loading products." message={error} onRetry={retry} />
      ) : products.length === 0 ? (
        <EmptyState icon="🔍" title="No products found." message="Try a different search or category." />
      ) : (
        <>
          <p className="muted" aria-live="polite">{products.length} product{products.length === 1 ? "" : "s"}</p>
          <div className="grid">
            {products.map((p) => (
              <ProductCard
                key={p._id}
                product={p}
                wished={wishlist.ids.has(p._id)}
                wishBusy={wishlist.busy.has(p._id)}
                wishError={wishlist.errors[p._id]}
                onToggleWish={() => wishlist.toggle(p._id)}
              />
            ))}
          </div>
        </>
      )}
    </main>
  );
}
