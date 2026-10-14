import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { errorMessage, registerCustomer } from "../services/api";
import { validateRegister } from "../utils/validation";
import FormField from "../components/FormField";

export default function Register() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [values, setValues] = useState({ fullName: "", email: "", password: "", phone: "" });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [loading, setLoading] = useState(false);

  if (user) return <Navigate to="/home" replace />;

  const onChange = (e) => setValues((v) => ({ ...v, [e.target.name]: e.target.value }));

  async function onSubmit(e) {
    e.preventDefault();
    setFormError("");
    const v = validateRegister(values);
    setErrors(v);
    if (Object.keys(v).length) return;
    setLoading(true);
    try {
      await registerCustomer({ ...values, fullName: values.fullName.trim(), email: values.email.trim(), phone: values.phone.trim() });
      navigate("/login", { replace: true, state: { registered: true } });
    } catch (err) {
      const serverErrors = err.response?.data?.errors;
      if (serverErrors) setErrors(serverErrors);
      setFormError(errorMessage(err, "Unable to create account."));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="container auth-wrap">
      <form className="card auth-card" onSubmit={onSubmit} noValidate>
        <h1>Create your account</h1>
        {formError && <p className="alert alert-error" role="alert">{formError}</p>}
        <FormField id="fullName" label="Full Name" autoComplete="name" value={values.fullName} onChange={onChange} error={errors.fullName} />
        <FormField id="email" label="Email" type="email" autoComplete="email" value={values.email} onChange={onChange} error={errors.email} />
        <FormField id="password" label="Password" type="password" autoComplete="new-password" value={values.password} onChange={onChange} error={errors.password} />
        <FormField id="phone" label="Phone Number" type="tel" autoComplete="tel" value={values.phone} onChange={onChange} error={errors.phone} />
        <button className="btn btn-primary btn-block" type="submit" disabled={loading}>{loading ? "Creating account..." : "Create Account"}</button>
        <p className="muted center">Already have an account? <Link to="/login">Log in</Link></p>
      </form>
    </main>
  );
}
