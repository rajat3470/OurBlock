import { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { gradients } from "../../src/constants/theme";

type Role = "superAdmin" | "businessOwner" | "user";

interface RoleOption {
  key: Role;
  icon: string;
  name: string;
  description: string;
  color: string;
  bgColor: string;
}

const ROLES: RoleOption[] = [
  {
    key: "superAdmin",
    icon: "🔐",
    name: "Super Admin",
    description: "Manage societies, businesses, and platform",
    color: "#007AFF",
    bgColor: "#EFF6FF",
  },
  {
    key: "businessOwner",
    icon: "🏪",
    name: "Business Owner",
    description: "Register and manage your business & products",
    color: "#22C55E",
    bgColor: "#F0FDF4",
  },
  {
    key: "user",
    icon: "👤",
    name: "Resident",
    description: "Browse and order from local businesses",
    color: "#8B5CF6",
    bgColor: "#F5F3FF",
  },
];

export default function RoleSelectionScreen() {
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);

  // If the app was launched with a specific target, skip role selection entirely.
  useEffect(() => {
    const target = process.env.EXPO_PUBLIC_APP_TARGET;
    if (target === "superAdmin") {
      router.replace("/(auth)/super-admin-login");
    } else if (target === "businessOwner") {
      router.replace("/(auth)/business-owner-login");
    } else if (target === "user") {
      router.replace("/(auth)/user-login");
    }
  }, []);

  const handleContinue = () => {
    if (!selectedRole) return;
    switch (selectedRole) {
      case "superAdmin":
        router.replace("/(auth)/super-admin-login");
        break;
      case "businessOwner":
        router.replace("/(auth)/business-owner-login");
        break;
      case "user":
        router.replace("/(auth)/user-login");
        break;
    }
  };

  return (
    <LinearGradient colors={[...gradients.appBackground]} style={styles.container}>
      <SafeAreaView style={styles.container}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <LinearGradient colors={["#0F172A", "#1E3A8A"]} style={styles.header}>
            <Text style={styles.logo}>OurBlock</Text>
            <Text style={styles.tagline}>Your Society's Marketplace</Text>
          </LinearGradient>

          <Text style={styles.title}>Choose Your Role</Text>
          <Text style={styles.subtitle}>
            Select how you want to use OurBlock
          </Text>

          {ROLES.map((role) => {
            const isSelected = selectedRole === role.key;
            return (
              <TouchableOpacity
                key={role.key}
                style={[
                  styles.roleCard,
                  isSelected && { borderColor: role.color, backgroundColor: role.bgColor },
                ]}
                onPress={() => setSelectedRole(role.key)}
                activeOpacity={0.88}
              >
                <View
                  style={[
                    styles.roleIconContainer,
                    isSelected && { backgroundColor: role.color + "22" },
                  ]}
                >
                  <Text style={styles.roleIcon}>{role.icon}</Text>
                </View>
                <View style={styles.roleInfo}>
                  <Text
                    style={[
                      styles.roleName,
                      isSelected && { color: role.color },
                    ]}
                  >
                    {role.name}
                  </Text>
                  <Text style={styles.roleDesc}>{role.description}</Text>
                </View>
                {isSelected && (
                  <View style={[styles.checkCircle, { backgroundColor: role.color }]}>
                    <Text style={styles.checkIcon}>✓</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}

          <TouchableOpacity
            style={[
              styles.continueBtn,
              !selectedRole && styles.continueBtnDisabled,
            ]}
            onPress={handleContinue}
            disabled={!selectedRole}
            activeOpacity={0.88}
          >
            <LinearGradient
              colors={selectedRole ? ["#1D4ED8", "#2563EB"] : ["#CBD5E1", "#CBD5E1"]}
              style={styles.continueBtnGradient}
            >
              <Text style={styles.continueBtnText}>Continue</Text>
            </LinearGradient>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  header: {
    alignItems: "center",
    marginTop: 16,
    marginBottom: 18,
    paddingTop: 34,
    paddingBottom: 34,
    borderRadius: 24,
  },
  logo: {
    fontSize: 38,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: -0.5,
  },
  tagline: {
    fontSize: 14,
    color: "rgba(255,255,255,0.85)",
    marginTop: 6,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: "#64748B",
    marginBottom: 24,
  },
  roleCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.92)",
    borderRadius: 16,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1.4,
    borderColor: "rgba(148,163,184,0.28)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  roleIconContainer: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },
  roleIcon: {
    fontSize: 26,
  },
  roleInfo: {
    flex: 1,
  },
  roleName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1E293B",
    marginBottom: 3,
  },
  roleDesc: {
    fontSize: 13,
    color: "#64748B",
    lineHeight: 18,
  },
  checkCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: "center",
    alignItems: "center",
  },
  checkIcon: {
    fontSize: 14,
    color: "#FFFFFF",
    fontWeight: "700",
  },
  continueBtn: {
    borderRadius: 16,
    marginTop: 24,
    shadowColor: "#1D4ED8",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
    overflow: "hidden",
  },
  continueBtnGradient: {
    paddingVertical: 17,
    alignItems: "center",
    borderRadius: 16,
  },
  continueBtnDisabled: {
    shadowOpacity: 0,
    elevation: 0,
  },
  continueBtnText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
});
