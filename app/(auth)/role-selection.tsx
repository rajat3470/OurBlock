import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
} from "react-native";
import { router } from "expo-router";

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

  const handleContinue = () => {
    if (!selectedRole) return;
    switch (selectedRole) {
      case "superAdmin":
        router.push("/(auth)/super-admin-login");
        break;
      case "businessOwner":
        router.push("/(auth)/business-owner-login");
        break;
      case "user":
        router.push("/(auth)/user-login");
        break;
      default:
        router.push("/(auth)/role-selection");
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.logo}>OurBlock</Text>
          <Text style={styles.tagline}>Your Society's Marketplace</Text>
        </View>

        <Text style={styles.title}>Choose Your Role</Text>
        <Text style={styles.subtitle}>
          Select how you want to use OurBlock
        </Text>

        {/* Role Cards */}
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
              activeOpacity={0.8}
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

        {/* Continue Button */}
        <TouchableOpacity
          style={[
            styles.continueBtn,
            !selectedRole && styles.continueBtnDisabled,
          ]}
          onPress={handleContinue}
          disabled={!selectedRole}
          activeOpacity={0.8}
        >
          <Text style={styles.continueBtnText}>Continue</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  header: {
    alignItems: "center",
    paddingTop: 48,
    paddingBottom: 36,
  },
  logo: {
    fontSize: 38,
    fontWeight: "800",
    color: "#007AFF",
    letterSpacing: -0.5,
  },
  tagline: {
    fontSize: 14,
    color: "#64748B",
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
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 18,
    marginBottom: 14,
    borderWidth: 2,
    borderColor: "#E2E8F0",
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
    backgroundColor: "#007AFF",
    borderRadius: 16,
    paddingVertical: 17,
    alignItems: "center",
    marginTop: 24,
    shadowColor: "#007AFF",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  continueBtnDisabled: {
    backgroundColor: "#CBD5E1",
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
