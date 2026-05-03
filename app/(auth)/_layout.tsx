import { Stack } from "expo-router";

export default function AuthLayout() {
  return (
    <Stack
      initialRouteName="role-selection"
      screenOptions={{ headerShown: false }}
    />
  );
}
