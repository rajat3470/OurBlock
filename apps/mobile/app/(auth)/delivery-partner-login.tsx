import RoleLoginForm from "../../src/components/RoleLoginForm";

export default function DeliveryPartnerLoginScreen() {
  return (
    <RoleLoginForm
      role="deliveryPartner"
      badge="Delivery Partner"
      title={"Welcome back"}
      subtitle="Sign in to deliver orders and collect payment for your shop."
      emailPlaceholder="partner@business.com"
      successRoute="/(delivery-partner)/dashboard"
    />
  );
}
