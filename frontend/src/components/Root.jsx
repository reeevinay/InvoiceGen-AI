import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const Root = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      navigate("/login", { replace: true });
      return;
    }

    const role = user.role?.toLowerCase();
    if (role === "admin" || role === "manager" || role === "staff") {
      navigate("/admin-dashboard", { replace: true });
    } else if (role === "customer") {
      navigate("/customer/dashboard", { replace: true });
    } else {
      navigate("/login", { replace: true });
    }
  }, [user, navigate]);

  return null;
};

export default Root;
