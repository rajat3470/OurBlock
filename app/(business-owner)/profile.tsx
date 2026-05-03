import React from "react";
import { View, Text, StyleSheet, SafeAreaView } from "react-native";
import AppSectionHeader from "../../src/components/AppSectionHeader";
import { useAppSelector } from "../../src/hooks/useRedux";

export default function BusinessOwnerProfile() {
  const { user } = useAppSelector((state) => state.auth);

  return (
    <SafeAreaView style={styles.container}>
      <AppSectionHeader
        title="Profile"
        subtitle="Business owner account settings"
      />
      <View style={styles.content}>
        <Text style={styles.name}>{user?.firstName} {user?.lastName}</Text>
        <Text style={styles.email}>{user?.email}</Text>
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
});
