const assert = require("node:assert/strict");

const getHomeRouteByRole = (role) => {
  switch (role) {
    case "superAdmin":
      return "/(super-admin)/dashboard";
    case "businessOwner":
      return "/(business-owner)/dashboard";
    case "deliveryPartner":
      return "/(delivery-partner)/dashboard";
    case "user":
      return "/(user)/home";
    default:
      return "/(auth)/role-selection";
  }
};

const getDefaultRoute = (isAuthenticated, role, appTarget) => {
  if (appTarget === "superAdmin") {
    return isAuthenticated
      ? "/(super-admin)/dashboard"
      : "/(auth)/super-admin-login";
  }

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
    return "/(auth)/role-selection";
  }

  return getHomeRouteByRole(role);
};

const run = () => {
  assert.equal(getDefaultRoute(false, undefined, "superAdmin"), "/(auth)/super-admin-login");
  assert.equal(getDefaultRoute(false, undefined, "businessOwner"), "/(auth)/business-owner-login");
  assert.equal(getDefaultRoute(false, undefined, "deliveryPartner"), "/(auth)/delivery-partner-login");
  assert.equal(getDefaultRoute(false, undefined, "user"), "/(auth)/user-login");

  assert.equal(getDefaultRoute(true, "superAdmin", undefined), "/(super-admin)/dashboard");
  assert.equal(getDefaultRoute(true, "businessOwner", undefined), "/(business-owner)/dashboard");
  assert.equal(getDefaultRoute(true, "deliveryPartner", undefined), "/(delivery-partner)/dashboard");
  assert.equal(getDefaultRoute(true, "user", undefined), "/(user)/home");

  assert.equal(getHomeRouteByRole("superAdmin"), "/(super-admin)/dashboard");
  assert.equal(getHomeRouteByRole("businessOwner"), "/(business-owner)/dashboard");
  assert.equal(getHomeRouteByRole("deliveryPartner"), "/(delivery-partner)/dashboard");
  assert.equal(getHomeRouteByRole("user"), "/(user)/home");

  console.log("Smoke tests passed for superAdmin, businessOwner, deliveryPartner, and user targets.");
};

run();
