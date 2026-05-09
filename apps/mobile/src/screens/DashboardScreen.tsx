import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { Business } from "@/types";
import { businessService } from "@services/businessService";
import { useAppSelector } from "@hooks/useRedux";

const DashboardScreen: React.FC = () => {
  const selectedSociety = useAppSelector((state) => state.society.selectedSociety);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  useEffect(() => {
    if (selectedSociety) {
      loadBusinesses();
    }
  }, [selectedSociety]);

  const loadBusinesses = async () => {
    if (!selectedSociety) return;
    
    setIsLoading(true);
    try {
      const response = await businessService.getBusinesses(selectedSociety.id);
      setBusinesses(response.data);
    } catch (error) {
      console.error("Error loading businesses:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const renderBusinessCard = ({ item }: { item: Business }) => (
    <TouchableOpacity style={styles.businessCard}>
      <View style={styles.businessHeader}>
        <Text style={styles.businessName}>{item.name}</Text>
        <View style={styles.ratingBadge}>
          <Text style={styles.rating}>⭐ {item.rating || "N/A"}</Text>
        </View>
      </View>
      <Text style={styles.category}>{item.category}</Text>
      <Text style={styles.address}>{item.address}</Text>
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
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Marketplace</Text>
        <Text style={styles.headerSubtitle}>
          {selectedSociety?.name}
        </Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoryScroll}
      >
        <TouchableOpacity
          style={[
            styles.categoryChip,
            selectedCategory === null && styles.categoryChipActive,
          ]}
          onPress={() => setSelectedCategory(null)}
        >
          <Text
            style={[
              styles.categoryChipText,
              selectedCategory === null && styles.categoryChipTextActive,
            ]}
          >
            All
          </Text>
        </TouchableOpacity>
      </ScrollView>

      <FlatList
        data={businesses}
        renderItem={renderBusinessCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        scrollEnabled={false}
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
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 15,
    backgroundColor: "#fff",
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "bold",
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#666",
    marginTop: 5,
  },
  categoryScroll: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: "#fff",
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#f0f0f0",
    marginRight: 10,
  },
  categoryChipActive: {
    backgroundColor: "#007AFF",
  },
  categoryChipText: {
    fontSize: 14,
    color: "#333",
  },
  categoryChipTextActive: {
    color: "#fff",
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  businessCard: {
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
  businessHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  businessName: {
    fontSize: 16,
    fontWeight: "600",
    flex: 1,
  },
  ratingBadge: {
    backgroundColor: "#fff3cd",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  rating: {
    fontSize: 12,
    fontWeight: "600",
  },
  category: {
    fontSize: 12,
    color: "#007AFF",
    marginBottom: 5,
  },
  address: {
    fontSize: 13,
    color: "#666",
  },
});

export default DashboardScreen;
