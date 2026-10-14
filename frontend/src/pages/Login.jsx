import { useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { errorMessage } from "../services/api";
import { validateLogin } from "../utils/validation";
import FormField from "../components/FormField";

export default function Login() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [values, setValues] = useState({ email: "", password: "" });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [loading, setLoading] = useState(false);

  if (user) return <Navigate to="/home" replace />;

  const onChange = (e) => setValues((v) => ({ ...v, [e.target.name]: e.target.value }));

  async function onSubmit(e) {
    e.preventDefault();
    setFormError("");
    const v = validateLogin(values);
    setErrors(v);
    if (Object.keys(v).length) return;
    setLoading(true);
    try {
      await login({ email: values.email.trim(), password: values.password });
      navigate(location.state?.from && location.state.from !== "/login" ? location.state.from : "/home", { replace: true });
    } catch (err) {
      setFormError(err.response?.status === 401 ? "Invalid Credentials" : errorMessage(err, "Unable to log in."));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="container auth-wrap">
      <form className="card auth-card" onSubmit={onSubmit} noValidate>
        <h1>Welcome back</h1>
        <p className="muted">Log in to continue shopping.</p>
        {location.state?.registered && <p className="alert alert-success" role="status">Account created. Please log in.</p>}
        {formError && <p className="alert alert-error" role="alert">{formError}</p>}
        <FormField id="email" label="Email" type="email" autoComplete="email" value={values.email} onChange={onChange} error={errors.email} />
        <FormField id="password" label="Password" type="password" autoComplete="current-password" value={values.password} onChange={onChange} error={errors.password} />
        <button className="btn btn-primary btn-block" type="submit" disabled={loading}>{loading ? "Logging in..." : "Login"}</button>
        <p className="muted center">New to ShopKart? <Link to="/register">Create an account</Link></p>
      </form>
    </main>
  );
}
