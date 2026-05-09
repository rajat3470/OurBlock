
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { router } from "expo-router";
import RoleLoginForm from "../../src/components/RoleLoginForm";

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
      />
      <View style={styles.registerRow}>
        <Text style={styles.registerText}>New here? </Text>
        <TouchableOpacity
          onPress={() => router.push("/(auth)/business-owner-register")}
          activeOpacity={0.7}
        >
          <Text style={styles.registerLink}>Create an account</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
  },
  registerRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingBottom: 36,
    backgroundColor: "#F8FAFC",
  },
  registerText: {
    fontSize: 14,
    color: "#64748B",
  },
  registerLink: {
    fontSize: 14,
    fontWeight: "700",
    color: "#22C55E",
  },
});
