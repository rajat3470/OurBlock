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
      return "/(auth)/welcome";
  }
};

const getDefaultRoute = (isAuthenticated, role, appTarget) => {
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

const run = () => {
  assert.equal(getDefaultRoute(false, undefined, "superAdmin"), "/(auth)/welcome");
  assert.equal(getDefaultRoute(false, undefined, "businessOwner"), "/(auth)/welcome");
  assert.equal(getDefaultRoute(false, undefined, "deliveryPartner"), "/(auth)/welcome");
  assert.equal(getDefaultRoute(false, undefined, "user"), "/(auth)/welcome");

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
