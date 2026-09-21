import { UserRole } from "@/types";

export type AppTarget = UserRole | undefined;

export const getHomeRouteByRole = (role?: UserRole) => {
  switch (role) {
    case "businessOwner":
      return "/(business-owner)/dashboard";
    case "deliveryPartner":
      return "/(delivery-partner)/dashboard";
    case "user":
      return "/(user)/home";
    default:
      return "/(auth)/welcome";
  }
};

export const getDefaultRoute = (
  isAuthenticated: boolean,
  role?: UserRole,
  appTarget?: AppTarget
) => {
  if (!isAuthenticated) {
    return "/(auth)/welcome";
  }

  if (appTarget === "businessOwner") {
    return "/(business-owner)/dashboard";
  }

  if (appTarget === "deliveryPartner") {
    return "/(delivery-partner)/dashboard";
  }

  if (appTarget === "user") {
    return "/(user)/home";
  }

  return getHomeRouteByRole(role);
};
