import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";
import { LoadingIndicator } from "@/components/ui/loading-indicator";
import type { AppRole } from "@/constants/roles";

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRoles?: AppRole[];
}

const ProtectedRoute = ({ children, requiredRoles }: ProtectedRouteProps) => {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-dvh flex items-center justify-center">
        <LoadingIndicator />
      </div>
    );
  }

  if (!user) {
    localStorage.setItem('auth_redirect_url', window.location.pathname);
    return <Navigate to="/auth" replace />;
  }

  if (requiredRoles && profile && !requiredRoles.includes(profile.role)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
