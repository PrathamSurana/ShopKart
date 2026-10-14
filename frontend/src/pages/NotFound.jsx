import { EmptyState } from "../components/StateViews";

export default function NotFound() {
  return (
    <main className="container page">
      <EmptyState icon="🧭" title="Page not found" message="The page you're looking for doesn't exist." actionLabel="Go home" actionTo="/" />
    </main>
  );
}
