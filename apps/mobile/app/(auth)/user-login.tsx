import RoleLoginForm from "../../src/components/RoleLoginForm";

export default function UserLoginScreen() {
  return (
    <RoleLoginForm
      role="user"
      badge="Resident"
      title={"Welcome back"}
      subtitle="Sign in to explore shops in your mohalla and get them delivered."
      emailPlaceholder="you@example.com"
      successRoute="/(user)/home"
      registerRoute="/(auth)/user-register"
      registerLabel="New here? Create an account"
    />
  );
}
