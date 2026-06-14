import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth, rolePaths, UserRole } from '@/contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
  redirectTo?: string;
  requireVerified?: boolean;
}

export function ProtectedRoute({ 
  children, 
  allowedRoles,
  redirectTo = '/login',
  requireVerified = false,
}: ProtectedRouteProps) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to={redirectTo} state={{ from: location }} replace />;
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return <Navigate to={rolePaths[user.role] || '/'} replace />;
  }

  if (requireVerified && user && !user.isVerified) {
    return <Navigate to={`/verify-otp?email=${encodeURIComponent(user.email)}&next=${encodeURIComponent(location.pathname)}`} replace />;
  }

  return <>{children}</>;
}

export function PublicRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user } = useAuth();
  
  if (isAuthenticated && user) {
    return <Navigate to="/farmer" replace />;
  }

  return <>{children}</>;
}
