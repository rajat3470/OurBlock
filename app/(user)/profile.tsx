import React from "react";
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, Alert } from "react-native";
import { router } from "expo-router";
import AppSectionHeader from "../../src/components/AppSectionHeader";
import { useAppSelector } from "../../src/hooks/useRedux";
import { useAuth } from "../../src/hooks/useAuth";

export default function UserProfile() {
  const { user } = useAppSelector((state) => state.auth);
  const { logoutUser } = useAuth();

  const handleLogout = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          await logoutUser();
          router.replace("/(auth)/user-login");
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <AppSectionHeader title="Profile" subtitle="Resident account settings" />
      <View style={styles.content}>
        <Text style={styles.name}>{user?.firstName} {user?.lastName}</Text>
        <Text style={styles.email}>{user?.email}</Text>
      </View>
      <View style={styles.footer}>
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutBtnText}>Sign Out</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  name: {
    fontSize: 20,
    fontWeight: "700",
    color: "#0F172A",
  },
  email: {
    marginTop: 8,
    fontSize: 14,
    color: "#64748B",
  },
  footer: {
    padding: 24,
    paddingBottom: 40,
  },
  logoutBtn: {
    backgroundColor: "#FEE2E2",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
  },
  logoutBtnText: {
    color: "#DC2626",
    fontSize: 16,
    fontWeight: "600",
  },
});
