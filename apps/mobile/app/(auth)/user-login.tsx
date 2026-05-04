import React from "react";
import RoleLoginForm from "../../src/components/RoleLoginForm";

export default function UserLoginScreen() {
  return (
    <RoleLoginForm
      role="user"
      icon="👤"
      title="Resident"
      subtitle="Sign in to explore your society marketplace"
      emailPlaceholder="you@example.com"
      successRoute="/(user)/home"
    />
  );
}
