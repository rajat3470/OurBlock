import React, { useState } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Text,
} from "react-native";

const RoleSelectionScreen: React.FC = () => {
  const [selectedRole, setSelectedRole] = useState<string | null>(null);

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Select Your Role</Text>

        <TouchableOpacity
          style={[
            styles.roleButton,
            selectedRole === "superAdmin" && styles.roleButtonSelected,
          ]}
          onPress={() => setSelectedRole("superAdmin")}
        >
          <Text style={styles.roleButtonText}>🔐 Super Admin</Text>
          <Text style={styles.roleDescription}>
            Manage societies and business owners
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.roleButton,
            selectedRole === "businessOwner" && styles.roleButtonSelected,
          ]}
          onPress={() => setSelectedRole("businessOwner")}
        >
          <Text style={styles.roleButtonText}>🏪 Business Owner</Text>
          <Text style={styles.roleDescription}>
            Register and manage your business
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.roleButton,
            selectedRole === "user" && styles.roleButtonSelected,
          ]}
          onPress={() => setSelectedRole("user")}
        >
          <Text style={styles.roleButtonText}>👤 User</Text>
          <Text style={styles.roleDescription}>
            Browse and shop from local businesses
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  content: {
    padding: 20,
    marginTop: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 30,
    textAlign: "center",
  },
  roleButton: {
    backgroundColor: "#fff",
    padding: 20,
    marginBottom: 15,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#e0e0e0",
  },
  roleButtonSelected: {
    borderColor: "#007AFF",
    backgroundColor: "#f0f7ff",
  },
  roleButtonText: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 8,
  },
  roleDescription: {
    fontSize: 14,
    color: "#666",
  },
});

export default RoleSelectionScreen;
