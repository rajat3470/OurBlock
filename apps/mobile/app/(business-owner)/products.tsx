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
import { useFocusEffect, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { ProductCard } from "@/components/business-owner/products/ProductCard";
import { ProductFormModal } from "@/components/business-owner/products/ProductFormModal";
import { AppAlertModal } from "@/components/ui/AppAlertModal";
import { useBusinessOwnerProducts } from "@hooks/useBusinessOwnerProducts";
import { useAppSelector } from "@hooks/useRedux";
import content from "@/content/boProducts.json";
import bankContent from "@/content/boBankDetails.json";
import registerContent from "@/content/boRegister.json";
import { colors, fonts, brand } from "@/constants/theme";

export default function BusinessOwnerProducts() {
  const {
    isLoading,
    filteredProducts,
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    showCreateModal,
    openCreateModal,
    openEditModal,
    editingProductId,
    formError,
    deleteTarget,
    cancelDelete,
    confirmDelete,
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
    setCategory,
    setUnit,
    setUnitStep,
    decrementStock,
    incrementStock,
    setStockFromText,
    setStockText,
    quickAddStock,
    setFormField,
    addAttribute,
    removeAttribute,
    setAttributeName,
    addAttributeValue,
    removeAttributeValue,
    setAttributeValue,
    businessCategory,
    getCategoryMetadata,
    getCategoriesForBusinessType,
    getApprovalMeta,
    businessProfile,
  } = useBusinessOwnerProducts();

  const user = useAppSelector((s) => s.auth.user);
  const nameAdded = !!user?.firstName;
  const bankVerified = (businessProfile as any)?.bankDetails?.verificationStatus === "verified";
  const bankStatus = (businessProfile as any)?.bankDetails?.verificationStatus ?? null;
  const canAddProduct = nameAdded && bankVerified;

  useFocusEffect(
    useCallback(() => {
      refreshIfStale();
    }, [refreshIfStale])
  );

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <Text style={styles.headerTitle}>{content.header.title}</Text>
        <Text style={styles.headerSub}>{content.header.subtitle}</Text>
      </View>

      <View style={styles.searchRow}>
        <TextInput
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder={content.searchPlaceholder}
          placeholderTextColor="#94A3B8"
          style={styles.searchInput}
        />
        <TouchableOpacity
          style={[styles.addBtn, !canAddProduct && styles.addBtnDisabled]}
          onPress={canAddProduct ? openCreateModal : !nameAdded ? () => router.push("/(business-owner)/profile") : () => router.push("/(business-owner)/bank-details")}
        >
          <Text style={styles.addBtnText}>{content.add}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.filterRow}>
        {(["all", "active", "inactive"] as const).map((filter) => (
          <TouchableOpacity
            key={filter}
            style={[styles.filterChip, statusFilter === filter && styles.filterChipActive]}
            onPress={() => setStatusFilter(filter)}
          >
            <Text style={[styles.filterChipText, statusFilter === filter && styles.filterChipTextActive]}>
              {filter === "all" ? "All" : filter === "active" ? "Active" : "Inactive"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {!nameAdded && (
        <TouchableOpacity
          style={styles.bankGate}
          activeOpacity={0.8}
          onPress={() => router.push("/(business-owner)/profile")}
        >
          <Ionicons name="person-outline" size={24} color={brand.accentDark} />
          <View style={styles.bankGateText}>
            <Text style={styles.bankGateTitle}>{registerContent.gate.nameTitle}</Text>
            <Text style={styles.bankGateSub}>{registerContent.gate.nameMessage}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </TouchableOpacity>
      )}

      {nameAdded && !bankVerified && (
        <TouchableOpacity
          style={styles.bankGate}
          activeOpacity={0.8}
          onPress={() => router.push("/(business-owner)/bank-details")}
        >
          <Ionicons name="card-outline" size={24} color={brand.accentDark} />
          <View style={styles.bankGateText}>
            <Text style={styles.bankGateTitle}>{bankContent.gate.title}</Text>
            <Text style={styles.bankGateSub}>
              {bankStatus === "pending"
                ? bankContent.status.pendingSub
                : bankStatus === "rejected"
                  ? bankContent.status.rejectedSub
                  : bankContent.gate.message}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </TouchableOpacity>
      )}

      {isLoading && filteredProducts.length === 0 ? (
        <View style={styles.loaderWrap}>
          <ActivityIndicator size="large" color="#084C3D" />
        </View>
      ) : (
        <FlatList
          data={filteredProducts}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#084C3D" />
          }
          renderItem={({ item }) => (
            <ProductCard
              product={item}
              getApprovalMeta={getApprovalMeta}
              onEdit={openEditModal}
              onToggleStatus={toggleStatus}
              onDelete={handleDelete}
            />
          )}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyEmoji}>{content.empty.emoji}</Text>
              <Text style={styles.emptyTitle}>{content.empty.title}</Text>
              <Text style={styles.emptySubtitle}>
                {canAddProduct ? content.empty.subtitle : "Complete the steps above to start adding products."}
              </Text>
              {canAddProduct && (
                <TouchableOpacity
                  style={styles.emptyAddBtn}
                  onPress={openCreateModal}
                >
                  <Text style={styles.emptyAddBtnText}>{content.empty.addBtn}</Text>
                </TouchableOpacity>
              )}
            </View>
          }
        />
      )}

      <AppAlertModal
        visible={Boolean(deleteTarget)}
        title={content.alerts.deleteConfirmTitle}
        message={content.alerts.deleteConfirmMsg.replace("{name}", deleteTarget?.name ?? "")}
        confirmLabel={content.alerts.delete}
        cancelLabel={content.alerts.cancel}
        destructive
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
      />

      <ProductFormModal
        visible={showCreateModal}
        isSubmitting={isSubmitting}
        form={form}
        formError={formError}
        isEditing={Boolean(editingProductId)}
        showCategoryDropdown={showCategoryDropdown}
        businessCategory={businessCategory}
        getCategoryMetadata={getCategoryMetadata}
        getCategoriesForBusinessType={getCategoriesForBusinessType}
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
        onAddAttribute={addAttribute}
        onRemoveAttribute={removeAttribute}
        onSetAttributeName={setAttributeName}
        onAddAttributeValue={addAttributeValue}
        onRemoveAttributeValue={removeAttributeValue}
        onSetAttributeValue={setAttributeValue}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FBF6EC",
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  headerTitle: {
    fontSize: 26,
    fontFamily: fonts.display,
    color: colors.textPrimary,
  },
  headerSub: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
    fontFamily: fonts.regular,
  },
  searchRow: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 4,
  },
  filterRow: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  filterChipActive: { backgroundColor: "#084C3D", borderColor: "#084C3D" },
  filterChipText: { color: "#64748B", fontSize: 12, fontFamily: fonts.uiBold },
  filterChipTextActive: { color: "#FFFFFF" },
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
    backgroundColor: "#F6B853",
    borderRadius: 12,
    paddingHorizontal: 16,
    justifyContent: "center",
  },
  addBtnDisabled: {
    opacity: 0.5,
  },
  addBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  bankGate: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFBEB",
    borderWidth: 1,
    borderColor: "#FDE68A",
    borderRadius: 12,
    marginHorizontal: 14,
    marginBottom: 4,
    padding: 14,
    gap: 12,
  },
  bankGateText: { flex: 1 },
  bankGateTitle: {
    fontFamily: fonts.bold,
    fontSize: 14,
    color: "#92400E",
    marginBottom: 2,
  },
  bankGateSub: {
    fontFamily: fonts.regular,
    fontSize: 12,
    lineHeight: 16,
    color: "#78350F",
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
    backgroundColor: "#F6B853",
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
