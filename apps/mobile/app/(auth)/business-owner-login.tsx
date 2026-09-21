import RoleLoginForm from "../../src/components/RoleLoginForm";

export default function BusinessOwnerLoginScreen() {
  return (
    <RoleLoginForm
      role="businessOwner"
      badge="Business Partner"
      title={"Welcome back"}
      subtitle="Sign in with your registered email to manage your shop."
      emailPlaceholder="owner@business.com"
      successRoute="/(business-owner)/dashboard"
      registerRoute="/(auth)/business-owner-register"
      registerLabel="New partner? Register your shop"
    />
  );
}
