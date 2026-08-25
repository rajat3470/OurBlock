import { useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect } from "expo-router";
import { ProductCard } from "@/components/business-owner/products/ProductCard";
import { ProductFormModal } from "@/components/business-owner/products/ProductFormModal";
import { useBusinessOwnerProducts } from "@hooks/useBusinessOwnerProducts";
import content from "@/content/boProducts.json";

export default function BusinessOwnerProducts() {
  const {
    isLoading,
    filteredProducts,
    searchQuery,
    setSearchQuery,
    showCreateModal,
    setShowCreateModal,
    form,
    isSubmitting,
    showCategoryDropdown,
    setShowCategoryDropdown,
    insets,
    refreshing,
    onRefresh,
    refreshIfStale,
    closeModal,
    showImageOptions,
    showAdditionalImageOptions,
    removeAdditionalImage,
    handleCreate,
    handleDelete,
    toggleStatus,
    toggleAvailableToday,
    setCategory,
    setUnit,
    setUnitStep,
    decrementStock,
    incrementStock,
    setStockFromText,
    setStockText,
    quickAddStock,
    setFormField,
    getCategoryLabel,
    getApprovalMeta,
  } = useBusinessOwnerProducts();

  useFocusEffect(
    useCallback(() => {
      refreshIfStale();
    }, [refreshIfStale])
  );

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={["#16A34A", "#0A7D55"]}
        style={[styles.header, { paddingTop: insets.top + 16 }]}
      >
        <Text style={styles.headerTitle}>{content.header.title}</Text>
        <Text style={styles.headerSub}>{content.header.subtitle}</Text>
      </LinearGradient>

      <View style={styles.searchRow}>
        <TextInput
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder={content.searchPlaceholder}
          placeholderTextColor="#94A3B8"
          style={styles.searchInput}
        />
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => setShowCreateModal(true)}
        >
          <Text style={styles.addBtnText}>{content.add}</Text>
        </TouchableOpacity>
      </View>

      {isLoading && filteredProducts.length === 0 ? (
        <View style={styles.loaderWrap}>
          <ActivityIndicator size="large" color="#16A34A" />
        </View>
      ) : (
        <FlatList
          data={filteredProducts}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#16A34A" />
          }
          renderItem={({ item }) => (
            <ProductCard
              product={item}
              getApprovalMeta={getApprovalMeta}
              onToggleAvailableToday={toggleAvailableToday}
              onToggleStatus={toggleStatus}
              onDelete={handleDelete}
            />
          )}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyEmoji}>{content.empty.emoji}</Text>
              <Text style={styles.emptyTitle}>{content.empty.title}</Text>
              <Text style={styles.emptySubtitle}>{content.empty.subtitle}</Text>
              <TouchableOpacity
                style={styles.emptyAddBtn}
                onPress={() => setShowCreateModal(true)}
              >
                <Text style={styles.emptyAddBtnText}>{content.empty.addBtn}</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}

      <ProductFormModal
        visible={showCreateModal}
        isSubmitting={isSubmitting}
        form={form}
        showCategoryDropdown={showCategoryDropdown}
        getCategoryLabel={getCategoryLabel}
        onClose={closeModal}
        onSave={handleCreate}
        onShowImageOptions={showImageOptions}
        onShowAdditionalImageOptions={showAdditionalImageOptions}
        onRemoveAdditionalImage={removeAdditionalImage}
        onToggleCategoryDropdown={() => setShowCategoryDropdown((v) => !v)}
        onSetCategory={setCategory}
        onSetUnit={setUnit}
        onSetUnitStep={setUnitStep}
        onDecrementStock={decrementStock}
        onIncrementStock={incrementStock}
        onSetStockFromText={setStockFromText}
        onSetStockText={setStockText}
        onQuickAddStock={quickAddStock}
        onSetFormField={setFormField}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F7F8FA",
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: -0.5,
  },
  headerSub: {
    fontSize: 13,
    color: "rgba(255,255,255,0.75)",
    marginTop: 2,
    fontWeight: "500",
  },
  searchRow: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 4,
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
    paddingHorizontal: 16,
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
    paddingBottom: 130,
  },
  emptyWrap: {
    alignItems: "center",
    paddingVertical: 60,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#334155",
  },
  emptySubtitle: {
    marginTop: 6,
    fontSize: 13,
    color: "#94A3B8",
    textAlign: "center",
  },
  emptyAddBtn: {
    marginTop: 20,
    backgroundColor: "#16A34A",
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  emptyAddBtnText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 14,
  },
});
