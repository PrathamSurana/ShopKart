export default function FormField({ id, label, error, ...inputProps }) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <input id={id} name={id} className={`input ${error ? "input-error" : ""}`} aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-err` : undefined} {...inputProps} />
      {error && <p id={`${id}-err`} className="field-error">{error}</p>}
    </div>
  );
}
