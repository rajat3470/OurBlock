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
      return "/(auth)/user-login";
  }
};

export const getDefaultRoute = (
  isAuthenticated: boolean,
  role?: UserRole,
  appTarget?: AppTarget
) => {
  if (appTarget === "businessOwner") {
    return isAuthenticated
      ? "/(business-owner)/dashboard"
      : "/(auth)/business-owner-login";
  }

  if (appTarget === "deliveryPartner") {
    return isAuthenticated
      ? "/(delivery-partner)/dashboard"
      : "/(auth)/delivery-partner-login";
  }

  if (appTarget === "user") {
    return isAuthenticated ? "/(user)/home" : "/(auth)/user-login";
  }

  if (!isAuthenticated || !role) {
    return "/(auth)/user-login";
  }

  return getHomeRouteByRole(role);
};
