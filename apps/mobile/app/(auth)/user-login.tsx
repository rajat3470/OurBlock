
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
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
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
    color: "#3B82F6",
  },
});
