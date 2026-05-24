
import RoleLoginForm from "../../src/components/RoleLoginForm";

export default function SuperAdminLoginScreen() {
  return (
    <RoleLoginForm
      role="superAdmin"
      icon="🔐"
      title="Super Admin"
      subtitle="Sign in to manage mohallaMitr"
      emailPlaceholder="admin@mohallamitr.com"
      successRoute="/(super-admin)/dashboard"
    />
  );
}
