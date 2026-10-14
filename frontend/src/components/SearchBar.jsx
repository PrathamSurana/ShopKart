export const CATEGORIES = ["Electronics", "Fashion", "Books", "Home"];

export default function SearchBar({ search, onSearch, category, onCategory, sort, onSort }) {
  return (
    <form className="toolbar" role="search" onSubmit={(e) => e.preventDefault()}>
      <label className="sr-only" htmlFor="search">Search products</label>
      <input id="search" className="input" type="search" placeholder="Search products..." value={search} onChange={(e) => onSearch(e.target.value)} />
      <label className="sr-only" htmlFor="category">Category</label>
      <select id="category" className="input" value={category} onChange={(e) => onCategory(e.target.value)}>
        <option value="">All Categories</option>
        {CATEGORIES.map((c) => (
          <option key={c} value={c}>{c}</option>
        ))}
      </select>
      <label className="sr-only" htmlFor="sort">Sort by</label>
      <select id="sort" className="input" value={sort} onChange={(e) => onSort(e.target.value)}>
        <option value="">Newest first</option>
        <option value="price_asc">Price: low to high</option>
        <option value="price_desc">Price: high to low</option>
      </select>
    </form>
  );
}
