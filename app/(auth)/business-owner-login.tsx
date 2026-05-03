import React from "react";
import RoleLoginForm from "../../src/components/RoleLoginForm";

export default function BusinessOwnerLoginScreen() {
  return (
    <RoleLoginForm
      role="businessOwner"
      icon="🏪"
      title="Business Owner"
      subtitle="Sign in to manage your shop"
      emailPlaceholder="owner@business.com"
      successRoute="/(business-owner)/dashboard"
    />
  );
}
