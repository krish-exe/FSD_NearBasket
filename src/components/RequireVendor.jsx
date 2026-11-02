import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

// The Vendor Hub is only for store owners; everyone else is sent to log in with a vendor account.
export default function RequireVendor({ children }) {
  const { isLoggedIn, isVendor } = useAuth();
  const location = useLocation();

  if (!isLoggedIn || !isVendor) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location.pathname, notice: isLoggedIn ? "The Vendor Hub needs a store owner account." : null }}
      />
    );
  }
  return children;
}
