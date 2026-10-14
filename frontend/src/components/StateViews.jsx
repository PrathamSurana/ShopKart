import { Link } from "react-router-dom";

export function Loading({ text = "Loading..." }) {
  return (
    <div className="state" role="status" aria-live="polite">
      <div className="spinner" aria-hidden="true" />
      <p>{text}</p>
    </div>
  );
}

export function ErrorState({ title = "Something went wrong.", message, onRetry }) {
  return (
    <div className="state state-error" role="alert">
      <div className="state-icon" aria-hidden="true">⚠️</div>
      <h2>{title}</h2>
      {message && <p>{message}</p>}
      {onRetry && (
        <button className="btn btn-primary" onClick={onRetry}>
          Try Again
        </button>
      )}
    </div>
  );
}

export function EmptyState({ icon = "🛍️", title, message, actionLabel, actionTo }) {
  return (
    <div className="state">
      <div className="state-icon" aria-hidden="true">{icon}</div>
      <h2>{title}</h2>
      {message && <p>{message}</p>}
      {actionLabel && (
        <Link className="btn btn-primary" to={actionTo}>
          {actionLabel}
        </Link>
      )}
    </div>
  );
}
