import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { router } from "expo-router";
import RoleLoginForm from "../../src/components/RoleLoginForm";
import LoginRoleSwitcher from "../../src/components/LoginRoleSwitcher";
import { colors } from "../../src/constants/theme";

export default function UserLoginScreen() {
  return (
    <RoleLoginForm
      role="user"
      icon="🏠"
      title="Resident"
      subtitle="Sign in to explore your society marketplace"
      emailPlaceholder="you@example.com"
      successRoute="/(user)/home"
      footer={
        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.registerLink}
            onPress={() => router.push("/(auth)/user-register")}
            activeOpacity={0.7}
          >
            <Text style={styles.registerLinkText}>
              Don't have an account?{" "}
              <Text style={styles.registerLinkBold}>Create one</Text>
            </Text>
          </TouchableOpacity>

          <View style={styles.divider} />
          <LoginRoleSwitcher currentRole="user" />
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  footer: {
    alignItems: "center",
  },
  registerLink: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  registerLinkText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  registerLinkBold: {
    fontWeight: "700",
    color: colors.blue[600],
  },
  divider: {
    width: 160,
    height: 1,
    backgroundColor: colors.border ?? "#E5E7EB",
    marginTop: 8,
    marginBottom: 12,
    opacity: 0.6,
  },
});
