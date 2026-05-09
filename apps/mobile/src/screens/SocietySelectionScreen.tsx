import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { Society } from "@/types";
import { useSociety } from "@hooks/useSociety";

const SocietySelectionScreen: React.FC = () => {
  const { getSocieties } = useSociety();
  const [societies, setSocieties] = useState<Society[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadSocieties();
  }, []);

  const loadSocieties = async () => {
    setIsLoading(true);
    try {
      const response = await getSocieties(1, 50);
      setSocieties(response.data);
    } catch (error) {
      console.error("Error loading societies:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const renderSocietyItem = ({ item }: { item: Society }) => (
    <TouchableOpacity style={styles.societyCard}>
      <Text style={styles.societyName}>{item.name}</Text>
      <Text style={styles.societyLocation}>
        {item.city}, {item.state}
      </Text>
      <Text style={styles.societyDetails}>
        {item.totalBusinesses || 0} businesses
      </Text>
    </TouchableOpacity>
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Select Your Society</Text>
      <FlatList
        data={societies}
        renderItem={renderSocietyItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginTop: 20,
    marginHorizontal: 20,
    marginBottom: 15,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  societyCard: {
    backgroundColor: "#fff",
    padding: 15,
    marginBottom: 12,
    borderRadius: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  societyName: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 5,
  },
  societyLocation: {
    fontSize: 14,
    color: "#666",
    marginBottom: 5,
  },
  societyDetails: {
    fontSize: 12,
    color: "#999",
  },
});

export default SocietySelectionScreen;
