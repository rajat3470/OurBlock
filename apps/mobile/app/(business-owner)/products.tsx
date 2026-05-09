import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Modal,
} from "react-native";
import AppSectionHeader from "../../src/components/AppSectionHeader";
import { useBusinessOwner } from "../../src/hooks/useBusinessOwner";
import { Product } from "../../src/types";

interface ProductForm {
  name: string;
  category: string;
  price: string;
  stock: string;
  description: string;
}

const EMPTY_FORM: ProductForm = {
  name: "",
  category: "general",
  price: "",
  stock: "",
  description: "",
};

export default function BusinessOwnerProducts() {
  const {
    products,
    isLoading,
    loadProducts,
    createProduct,
    editProduct,
    removeProductById,
  } = useBusinessOwner();

  const [searchQuery, setSearchQuery] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [form, setForm] = useState<ProductForm>(EMPTY_FORM);

  useEffect(() => {
    loadProducts().catch(() => null);
  }, [loadProducts]);

  const filteredProducts = useMemo(
    () =>
      products.filter(
        (item) =>
          item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.category.toLowerCase().includes(searchQuery.toLowerCase())
      ),
    [products, searchQuery]
  );

  const resetForm = () => {
    setForm(EMPTY_FORM);
  };

  const handleCreate = async () => {
    if (!form.name.trim() || !form.price.trim() || !form.stock.trim()) {
      Alert.alert("Missing fields", "Name, price, and stock are required.");
      return;
    }

    const price = Number(form.price);
    const stock = Number(form.stock);
    if (Number.isNaN(price) || Number.isNaN(stock)) {
      Alert.alert("Invalid input", "Price and stock must be numbers.");
      return;
    }

    try {
      await createProduct({
        name: form.name.trim(),
        category: form.category.trim() || "general",
        description: form.description.trim(),
        price,
        stock,
        status: "active",
        imageUrls: [],
      });
      setShowCreateModal(false);
      resetForm();
    } catch {
      Alert.alert("Error", "Failed to create product.");
    }
  };

  const handleDelete = (productId: string, productName: string) => {
    Alert.alert("Delete Product", `Delete ${productName}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await removeProductById(productId);
          } catch {
            Alert.alert("Error", "Failed to delete product.");
          }
        },
      },
    ]);
  };

  const toggleStatus = async (item: Product) => {
    const nextStatus = item.status === "active" ? "inactive" : "active";
    try {
      await editProduct(item.id, { status: nextStatus });
    } catch {
      Alert.alert("Error", "Failed to update product status.");
    }
  };

  const toggleAvailableToday = async (item: Product) => {
    try {
      await editProduct(item.id, { availableToday: !item.availableToday });
    } catch {
      Alert.alert("Error", "Failed to update availability.");
    }
  };

  const renderItem = ({ item }: { item: Product }) => (
    <View style={styles.card}>
      {/* Daily availability toggle */}
      <TouchableOpacity
        style={[styles.availBanner, item.availableToday ? styles.availOn : styles.availOff]}
        onPress={() => toggleAvailableToday(item)}
        activeOpacity={0.8}
      >
        <Text style={styles.availIcon}>{item.availableToday ? "\u2705" : "\u23f8\ufe0f"}</Text>
        <View style={styles.availInfo}>
          <Text style={[styles.availLabel, { color: item.availableToday ? "#16A34A" : "#64748B" }]}>
            {item.availableToday ? "Available Today" : "Unavailable Today"}
          </Text>
          <Text style={styles.availHint}>Tap to toggle for today</Text>
        </View>
        <View style={[styles.availPill, { backgroundColor: item.availableToday ? "#22C55E" : "#CBD5E1" }]}>
          <Text style={styles.availPillText}>{item.availableToday ? "ON" : "OFF"}</Text>
        </View>
      </TouchableOpacity>

      <View style={styles.cardTop}>
        <View style={styles.cardLeft}>
          <Text style={styles.productName}>{item.name}</Text>
          <Text style={styles.productMeta}>{item.category}</Text>
          <Text style={styles.productMeta}>Stock: {item.stock}</Text>
        </View>
        <Text style={styles.productPrice}>Rs {item.price}</Text>
      </View>

      <View style={styles.actionsRow}>
        <TouchableOpacity
          style={[styles.actionBtn, styles.statusBtn]}
          onPress={() => toggleStatus(item)}
        >
          <Text style={styles.statusBtnText}>
            {item.status === "active" ? "Set Inactive" : "Set Active"}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionBtn, styles.deleteBtn]}
          onPress={() => handleDelete(item.id, item.name)}
        >
          <Text style={styles.deleteBtnText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <AppSectionHeader
        title="Products"
        subtitle="Manage your product catalog"
      />

      <View style={styles.searchRow}>
        <TextInput
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search products"
          placeholderTextColor="#94A3B8"
          style={styles.searchInput}
        />
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => setShowCreateModal(true)}
        >
          <Text style={styles.addBtnText}>+ Add</Text>
        </TouchableOpacity>
      </View>

      {isLoading && products.length === 0 ? (
        <View style={styles.loaderWrap}>
          <ActivityIndicator size="large" color="#16A34A" />
        </View>
      ) : (
        <FlatList
          data={filteredProducts}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyTitle}>No products found</Text>
              <Text style={styles.emptySubtitle}>
                Add your first product to start receiving orders.
              </Text>
            </View>
          }
        />
      )}

      <Modal
        transparent
        visible={showCreateModal}
        animationType="slide"
        onRequestClose={() => setShowCreateModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Create Product</Text>

            <TextInput
              style={styles.input}
              value={form.name}
              onChangeText={(value) => setForm((prev) => ({ ...prev, name: value }))}
              placeholder="Product name"
              placeholderTextColor="#94A3B8"
            />
            <TextInput
              style={styles.input}
              value={form.category}
              onChangeText={(value) =>
                setForm((prev) => ({ ...prev, category: value }))
              }
              placeholder="Category"
              placeholderTextColor="#94A3B8"
            />
            <TextInput
              style={styles.input}
              value={form.price}
              onChangeText={(value) => setForm((prev) => ({ ...prev, price: value }))}
              placeholder="Price"
              keyboardType="numeric"
              placeholderTextColor="#94A3B8"
            />
            <TextInput
              style={styles.input}
              value={form.stock}
              onChangeText={(value) => setForm((prev) => ({ ...prev, stock: value }))}
              placeholder="Stock"
              keyboardType="numeric"
              placeholderTextColor="#94A3B8"
            />
            <TextInput
              style={[styles.input, styles.textArea]}
              value={form.description}
              onChangeText={(value) =>
                setForm((prev) => ({ ...prev, description: value }))
              }
              placeholder="Description"
              placeholderTextColor="#94A3B8"
              multiline
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.cancelBtn]}
                onPress={() => {
                  setShowCreateModal(false);
                  resetForm();
                }}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.createBtn]}
                onPress={handleCreate}
              >
                <Text style={styles.createBtnText}>Create</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  searchRow: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 14,
    paddingTop: 14,
  },
  searchInput: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: "#0F172A",
  },
  addBtn: {
    backgroundColor: "#16A34A",
    borderRadius: 12,
    paddingHorizontal: 14,
    justifyContent: "center",
  },
  addBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  loaderWrap: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  listContent: {
    padding: 14,
    paddingBottom: 22,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
  },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardLeft: {
    flex: 1,
  },
  productName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
  },
  productMeta: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 2,
  },
  productPrice: {
    fontSize: 15,
    fontWeight: "800",
    color: "#16A34A",
  },
  actionsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 12,
  },
  actionBtn: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 8,
    alignItems: "center",
  },
  statusBtn: {
    backgroundColor: "#ECFDF5",
    borderWidth: 1,
    borderColor: "#BBF7D0",
  },
  statusBtnText: {
    color: "#166534",
    fontSize: 12,
    fontWeight: "700",
  },
  deleteBtn: {
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  deleteBtnText: {
    color: "#B91C1C",
    fontSize: 12,
    fontWeight: "700",
  },
  // Daily availability banner
  availBanner: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
    gap: 10,
  },
  availOn: {
    backgroundColor: "#F0FDF4",
    borderWidth: 1,
    borderColor: "#86EFAC",
  },
  availOff: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  availIcon: { fontSize: 18 },
  availInfo: { flex: 1 },
  availLabel: { fontSize: 13, fontWeight: "700" },
  availHint: { fontSize: 10, color: "#94A3B8", marginTop: 1 },
  availPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  availPillText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "800",
  },
  emptyWrap: {
    alignItems: "center",
    paddingVertical: 50,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#334155",
  },
  emptySubtitle: {
    marginTop: 6,
    fontSize: 13,
    color: "#94A3B8",
    textAlign: "center",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.3)",
    justifyContent: "flex-end",
  },
  modalCard: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    padding: 16,
    paddingBottom: 30,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 12,
  },
  input: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: "#0F172A",
    marginBottom: 10,
  },
  textArea: {
    minHeight: 70,
    textAlignVertical: "top",
  },
  modalActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 4,
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
  },
  cancelBtn: {
    backgroundColor: "#F1F5F9",
  },
  cancelBtnText: {
    color: "#475569",
    fontSize: 13,
    fontWeight: "700",
  },
  createBtn: {
    backgroundColor: "#16A34A",
  },
  createBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
});
