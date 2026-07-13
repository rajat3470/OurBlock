import React from "react";
import { Redirect } from "expo-router";
import { UserRole } from "@/types";
import { useAppSelector } from "@hooks/useRedux";
import { AppTarget, getDefaultRoute, getHomeRouteByRole } from "@utils/appRouting";

interface RoleGateProps {
  allowedRole: UserRole;
  children: React.ReactNode;
}

export default function RoleGate({ allowedRole, children }: RoleGateProps) {
  const { isAuthenticated, user } = useAppSelector((state) => state.auth);
  const appTarget = process.env.EXPO_PUBLIC_APP_TARGET as AppTarget;

  if (!isAuthenticated || !user) {
    return <Redirect href={getDefaultRoute(false, undefined, appTarget) as any} />;
  }

  if (user.role !== allowedRole) {
    return <Redirect href={getHomeRouteByRole(user.role) as any} />;
  }

  return <>{children}</>;
}
