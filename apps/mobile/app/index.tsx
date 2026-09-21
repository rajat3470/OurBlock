import { useEffect } from "react";
import { Redirect, router } from "expo-router";
import { useAppSelector } from "../src/hooks/useRedux";
import { AppTarget, getDefaultRoute } from "../src/utils/appRouting";
import { consumePendingOrderNavigation } from "../src/services/orderNotificationService";

export default function IndexScreen() {
  const { isAuthenticated, user } = useAppSelector((state) => state.auth);
  const appTarget = process.env.EXPO_PUBLIC_APP_TARGET as AppTarget;

  useEffect(() => {
    const pending = consumePendingOrderNavigation();
    if (pending) {
      router.replace({
        pathname: pending.pathname as never,
        params: pending.params,
      });
    }
  }, []);

  if (isAuthenticated && user?.role) {
    return <Redirect href={getDefaultRoute(true, user.role, appTarget)} />;
  }

  return <Redirect href="/(auth)/onboarding" />;
}
