import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Loading } from "./StateViews";

export default function ProtectedRoute() {
  const { user, checking } = useAuth();
  const location = useLocation();
  if (checking) return <Loading text="Checking your session..." />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return <Outlet />;
}
