import React from "react";
import { Redirect } from "expo-router";
import { UserRole } from "@/types";
import { useAppSelector } from "@hooks/useRedux";
import { getHomeRouteByRole } from "@utils/appRouting";

interface RoleGateProps {
  allowedRole: UserRole;
  children: React.ReactNode;
}

export default function RoleGate({ allowedRole, children }: RoleGateProps) {
  const { isAuthenticated, user } = useAppSelector((state) => state.auth);

  if (!isAuthenticated || !user) {
    return <Redirect href="/(auth)/user-login" />;
  }

  if (user.role !== allowedRole) {
    return <Redirect href={getHomeRouteByRole(user.role)} />;
  }

  return <>{children}</>;
}
