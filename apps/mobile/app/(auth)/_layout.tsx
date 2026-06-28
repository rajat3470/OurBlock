import { Stack } from "expo-router";
import { Redirect } from "expo-router";
import { useAppSelector } from "../../src/hooks/useRedux";
import { getHomeRouteByRole } from "../../src/utils/appRouting";

export default function AuthLayout() {
  const { isAuthenticated, isHydrated, user } = useAppSelector((state) => state.auth);

  if (isHydrated && isAuthenticated && user?.role) {
    return <Redirect href={getHomeRouteByRole(user.role)} />;
  }

  return (
    <Stack
      initialRouteName="user-login"
      screenOptions={{ headerShown: false }}
    />
  );
}
