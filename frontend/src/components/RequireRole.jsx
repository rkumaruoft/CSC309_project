// TODO: Create different pages for different roles
import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';

export default function RequireRole({ allowedRoles = [], redirectTo = '/dashboard' }) {
  const { user, initialized, currentRole } = useAuth();

  // Wait for auth init
  if (!initialized) return null;

  // Not logged in -> send to login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Prefer the UI-switched `currentRole` when making routing decisions.
  // This allows users (e.g., a cashier) to switch into the `regular` interface
  // and access pages guarded for regular users.
  const effectiveRole = currentRole ?? user.role;

  if (!allowedRoles.includes(effectiveRole)) {
    return <Navigate to={redirectTo} replace />;
  }

  return <Outlet />;
}
