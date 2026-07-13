import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { router } from "expo-router";
import RoleLoginForm from "../../src/components/RoleLoginForm";
import LoginRoleSwitcher from "../../src/components/LoginRoleSwitcher";
import BackButton from "../../src/components/BackButton";
import { colors } from "../../src/constants/theme";

export default function BusinessOwnerLoginScreen() {
  return (
    <View style={styles.wrapper}>
      <RoleLoginForm
        role="businessOwner"
        icon="🏪"
        title="Business Owner"
        subtitle="Sign in to manage your shop"
        emailPlaceholder="owner@business.com"
        successRoute="/(business-owner)/dashboard"
        footer={
          <View style={styles.footer}>
            <TouchableOpacity
              onPress={() => router.push("/(auth)/business-owner-register")}
              activeOpacity={0.7}
              style={styles.registerRow}
            >
              <Text style={styles.registerText}>New shop? </Text>
              <Text style={styles.registerLink}>Create an account</Text>
            </TouchableOpacity>

            <View style={styles.divider} />
            <LoginRoleSwitcher currentRole="businessOwner" compact />
          </View>
        }
      />
      <BackButton top={12} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
  },
  footer: {
    alignItems: "center",
  },
  registerRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingBottom: 8,
  },
  registerText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  registerLink: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.green[600],
  },
  divider: {
    width: 160,
    height: 1,
    backgroundColor: colors.border ?? "#E5E7EB",
    marginTop: 4,
    marginBottom: 12,
    opacity: 0.6,
  },
});
