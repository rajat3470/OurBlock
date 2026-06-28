
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { router } from "expo-router";
import RoleLoginForm from "../../src/components/RoleLoginForm";
import { colors } from "../../src/constants/theme";

export default function UserLoginScreen() {
  return (
    <View style={styles.container}>
      <RoleLoginForm
        role="user"
        icon="👤"
        title="Resident"
        subtitle="Sign in to explore your society marketplace"
        emailPlaceholder="you@example.com"
        successRoute="/(user)/home"
      />
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

        <TouchableOpacity
          style={styles.partnerLink}
          onPress={() => router.push("/(auth)/business-owner-login")}
          activeOpacity={0.7}
        >
          <Text style={styles.partnerIcon}>🏪</Text>
          <Text style={styles.partnerText}>
            Business Owner?{" "}
            <Text style={styles.partnerTextBold}>Partner Login</Text>
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "transparent",
  },
  footer: {
    paddingVertical: 20,
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
    marginVertical: 12,
    opacity: 0.6,
  },
  partnerLink: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    paddingHorizontal: 16,
    gap: 6,
  },
  partnerIcon: {
    fontSize: 13,
  },
  partnerText: {
    fontSize: 12,
    color: colors.textSecondary ?? "#9CA3AF",
  },
  partnerTextBold: {
    fontWeight: "600",
    color: colors.textSecondary ?? "#6B7280",
  },
});
