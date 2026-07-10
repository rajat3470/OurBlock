import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Modal,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Image,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Product } from "@/types";
import { type ProductUnit } from "@utils/helpers";
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

  const renderItem = ({ item }: { item: Product }) => {
    const approval = item.approvalStatus ?? "pending";
    const isApproved = approval === "approved";
    const approvalMeta = getApprovalMeta(approval);

    const firstImage = item.imageUrls?.[0];
    const price = item.price ?? 0;
    const originalPrice = item.originalPrice;
    const discount = originalPrice && originalPrice > price
      ? Math.round(((originalPrice - price) / originalPrice) * 100)
      : null;

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          {/* Product image thumbnail */}
          <View style={styles.thumbWrap}>
            {firstImage ? (
              <Image source={{ uri: firstImage }} style={styles.thumb} />
            ) : (
              <View style={styles.thumbPlaceholder}>
                <Text style={styles.thumbPlaceholderText}>{content.empty.emoji}</Text>
              </View>
            )}
            {discount !== null && (
              <View style={styles.discountBadge}>
                <Text style={styles.discountBadgeText}>{discount}{content.card.discountSuffix}</Text>
              </View>
            )}
          </View>

          <View style={styles.cardInfo}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
              <Text style={styles.productName} numberOfLines={2}>{item.name ?? content.card.noName}</Text>
              {item.isVeg !== undefined && (
                <View style={item.isVeg ? styles.vegDot : styles.nonVegDot} />
              )}
            </View>
            <View style={{ flexDirection: "row", gap: 6, flexWrap: "wrap", marginTop: 4 }}>
              <View style={styles.categoryChip}>
                <Text style={styles.categoryChipText}>{item.category ?? content.card.fallbackCategory}</Text>
              </View>
              {item.menuSection ? (
                <View style={[styles.categoryChip, { backgroundColor: "#EFF6FF" }]}>
                  <Text style={[styles.categoryChipText, { color: "#1D4ED8" }]}>{item.menuSection}</Text>
                </View>
              ) : null}
            </View>
            <View style={styles.priceRow}>
              <Text style={styles.productPrice}>{content.currency}{price}</Text>
              {originalPrice && originalPrice > price ? (
                <Text style={styles.originalPrice}>{content.currency}{originalPrice}</Text>
              ) : null}
            </View>
            <Text style={styles.stockText}>
              {content.card.stockPrefix}<Text style={(item.stock ?? 0) > 0 ? styles.stockGood : styles.stockOut}>{item.stock ?? 0}</Text>
            </Text>
          </View>
        </View>

        {/* Admin approval status */}
        <View style={[styles.approvalBanner, { backgroundColor: approvalMeta.bg }]}>
          <Text style={[styles.approvalIcon, { color: approvalMeta.color }]}>{approvalMeta.icon}</Text>
          <View style={{ flex: 1 }}>
            <Text style={[styles.approvalLabel, { color: approvalMeta.color }]}>{approvalMeta.label}</Text>
            {approval === "rejected" && item.approvalNote ? (
              <Text style={styles.approvalNote}>{content.card.approvalNotes.reasonPrefix}{item.approvalNote}</Text>
            ) : null}
            {approval === "pending" ? (
              <Text style={styles.approvalNote}>{content.card.approvalNotes.pending}</Text>
            ) : null}
          </View>
        </View>

        {/* Daily availability toggle (only for approved products) */}
        {isApproved ? (
          <TouchableOpacity
            style={[styles.availBanner, item.availableToday ? styles.availOn : styles.availOff]}
            onPress={() => toggleAvailableToday(item)}
            activeOpacity={0.8}
          >
            <Text style={styles.availIcon}>{item.availableToday ? "✅" : "⏸️"}</Text>
            <View style={styles.availInfo}>
              <Text style={[styles.availLabel, { color: item.availableToday ? "#16A34A" : "#64748B" }]}>
                {item.availableToday ? content.card.availableToday : content.card.unavailableToday}
              </Text>
              <Text style={styles.availHint}>{content.card.toggleHint}</Text>
            </View>
            <View style={[styles.availPill, { backgroundColor: item.availableToday ? "#22C55E" : "#CBD5E1" }]}>
              <Text style={styles.availPillText}>{item.availableToday ? content.card.on : content.card.off}</Text>
            </View>
          </TouchableOpacity>
        ) : null}

        <View style={styles.actionsRow}>
          {isApproved ? (
            <TouchableOpacity
              style={[styles.actionBtn, styles.statusBtn]}
              onPress={() => toggleStatus(item)}
            >
              <Text style={styles.statusBtnText}>
                {item.status === "active" ? content.card.setInactive : content.card.setActive}
              </Text>
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity
            style={[styles.actionBtn, styles.deleteBtn]}
            onPress={() => handleDelete(item.id, item.name)}
          >
            <Text style={styles.deleteBtnText}>{content.card.delete}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

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
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyEmoji}>{content.empty.emoji}</Text>
              <Text style={styles.emptyTitle}>{content.empty.title}</Text>
              <Text style={styles.emptySubtitle}>
                {content.empty.subtitle}
              </Text>
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

      {/* ─── Add Product Modal ─── */}
      <Modal
        visible={showCreateModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={closeModal}
      >
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
        >
          <SafeAreaView style={styles.modalContainer}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <TouchableOpacity
                onPress={closeModal}
                style={styles.modalCloseBtn}
                disabled={isSubmitting}
              >
                <Text style={styles.modalCloseBtnText}>✕</Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle}>{content.modal.title}</Text>
              <TouchableOpacity
                style={[styles.modalSaveBtn, isSubmitting && styles.modalSaveBtnDisabled]}
                onPress={handleCreate}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalSaveBtnText}>{content.modal.save}</Text>
                )}
              </TouchableOpacity>
            </View>

            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={styles.modalScroll}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {/* Primary Image (required) */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>
                  {content.modal.photoLabel} <Text style={styles.required}>{content.modal.required}</Text>
                </Text>
                <TouchableOpacity
                  style={styles.imagePicker}
                  onPress={showImageOptions}
                  activeOpacity={0.8}
                >
                  {form.imageUri ? (
                    <>
                      <Image source={{ uri: form.imageUri }} style={styles.imagePreview} />
                      <View style={styles.imageOverlay}>
                        <Text style={styles.imageOverlayText}>{content.modal.changePhoto}</Text>
                      </View>
                    </>
                  ) : (
                    <View style={styles.imagePlaceholder}>
                      <Text style={styles.imagePlaceholderIcon}>📷</Text>
                      <Text style={styles.imagePlaceholderText}>{content.modal.addPhoto}</Text>
                      <Text style={styles.imagePlaceholderSub}>{content.modal.addPhotoSub}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>

              {/* Additional Images (optional, max 3) */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>
                  {content.modal.additionalPhotosLabel}{" "}
                  <Text style={styles.optional}>{content.modal.additionalPhotosOptional}</Text>
                </Text>
                <View style={styles.additionalImagesRow}>
                  {form.additionalImageUris.map((uri, idx) => (
                    <View key={idx} style={styles.additionalThumbWrap}>
                      <Image source={{ uri }} style={styles.additionalThumb} />
                      <TouchableOpacity
                        style={styles.additionalRemoveBtn}
                        onPress={() => removeAdditionalImage(idx)}
                      >
                        <Text style={styles.additionalRemoveBtnText}>{content.modal.additionalRemove}</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                  {form.additionalImageUris.length < 3 && (
                    <TouchableOpacity
                      style={styles.additionalAddSlot}
                      onPress={showAdditionalImageOptions}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.additionalAddIcon}>+</Text>
                      <Text style={styles.additionalAddText}>{content.modal.additionalAdd}</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              {/* Product Name */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>{content.modal.productName} <Text style={styles.required}>{content.modal.required}</Text></Text>
                <TextInput
                  style={styles.input}
                  value={form.name}
                  onChangeText={(v) => setFormField("name", v)}
                  placeholder={content.modal.productNamePlaceholder}
                  placeholderTextColor="#94A3B8"
                  returnKeyType="next"
                  maxLength={100}
                />
              </View>

              {/* Category dropdown */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>{content.modal.category}</Text>
                <TouchableOpacity
                  style={styles.dropdownTrigger}
                  onPress={() => setShowCategoryDropdown((v) => !v)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.dropdownTriggerText}>
                    {getCategoryLabel(form.category)}
                  </Text>
                  <Text style={styles.dropdownArrow}>{showCategoryDropdown ? "▲" : "▼"}</Text>
                </TouchableOpacity>
                {showCategoryDropdown && (
                  <View style={styles.dropdownList}>
                    {content.categories.map((cat, idx) => (
                      <TouchableOpacity
                        key={cat.value}
                        style={[
                          styles.dropdownItem,
                          form.category === cat.value && styles.dropdownItemSelected,
                          idx === content.categories.length - 1 && { borderBottomWidth: 0 },
                        ]}
                        onPress={() => setCategory(cat.value)}
                      >
                        <Text
                          style={[
                            styles.dropdownItemText,
                            form.category === cat.value && styles.dropdownItemTextSelected,
                          ]}
                        >
                          {cat.label}
                        </Text>
                        {form.category === cat.value && (
                          <Text style={styles.dropdownCheck}>✓</Text>
                        )}
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>

              {/* Unit / Sold In */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>{content.modal.unit}</Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                  {content.units.map((opt) => (
                    <TouchableOpacity
                      key={opt.value}
                      style={[
                        styles.dietChip,
                        form.unit === opt.value && styles.dietChipVegActive,
                      ]}
                      onPress={() => setUnit(opt.value as ProductUnit)}
                      activeOpacity={0.8}
                    >
                      <Text
                        style={[
                          styles.dietChipText,
                          form.unit === opt.value && { color: "#166534", fontWeight: "700" },
                        ]}
                      >
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Unit Step presets — only for non-piece units */}
              {form.unit !== "piece" && (
                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>
                    {content.modal.unitStep}{" "}
                    <Text style={styles.optional}>{content.modal.unitStepOptional}</Text>
                  </Text>
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                    {content.unitStepPresets[form.unit as Exclude<ProductUnit, "piece">].map((preset) => (
                      <TouchableOpacity
                        key={preset.value}
                        style={[
                          styles.quickAddBtn,
                          form.unitStep === preset.value && {
                            backgroundColor: "#16A34A",
                            borderColor: "#16A34A",
                          },
                        ]}
                        onPress={() => setUnitStep(preset.value)}
                        activeOpacity={0.7}
                      >
                        <Text
                          style={[
                            styles.quickAddBtnText,
                            form.unitStep === preset.value && { color: "#FFFFFF" },
                          ]}
                        >
                          {preset.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <Text style={styles.charCount}>
                    Price you enter = price per {
                      content.unitStepPresets[form.unit as Exclude<ProductUnit, "piece">].find(
                        (p) => p.value === form.unitStep
                      )?.label ?? form.unitStep + form.unit
                    }
                  </Text>
                </View>
              )}

              {/* Price row */}
              <View style={styles.priceFieldRow}>
                <View style={[styles.fieldGroup, { flex: 1 }]}>
                  <Text style={styles.fieldLabel}>{content.modal.priceLabel} <Text style={styles.required}>{content.modal.required}</Text></Text>
                  <View style={styles.priceInputWrap}>
                    <Text style={styles.pricePrefix}>{content.currency}</Text>
                    <TextInput
                      style={styles.priceInput}
                      value={form.price}
                      onChangeText={(v) => setFormField("price", v)}
                      placeholder={content.modal.pricePlaceholder}
                      placeholderTextColor="#94A3B8"
                      keyboardType="decimal-pad"
                      returnKeyType="next"
                    />
                  </View>
                </View>
                <View style={{ width: 12 }} />
                <View style={[styles.fieldGroup, { flex: 1 }]}>
                  <Text style={styles.fieldLabel}>{content.modal.mrpLabel}</Text>
                  <View style={styles.priceInputWrap}>
                    <Text style={styles.pricePrefix}>{content.currency}</Text>
                    <TextInput
                      style={styles.priceInput}
                      value={form.originalPrice}
                      onChangeText={(v) => setFormField("originalPrice", v)}
                      placeholder={content.modal.pricePlaceholder}
                      placeholderTextColor="#94A3B8"
                      keyboardType="decimal-pad"
                      returnKeyType="next"
                    />
                  </View>
                </View>
              </View>

              {/* Discount preview */}
              {form.originalPrice && form.price &&
                parseFloat(form.originalPrice) > parseFloat(form.price) ? (
                <View style={styles.discountPreview}>
                  <Text style={styles.discountPreviewText}>
                    {content.modal.discountPreview.replace("{discount}", String(Math.round(((parseFloat(form.originalPrice) - parseFloat(form.price)) / parseFloat(form.originalPrice)) * 100)))}
                  </Text>
                </View>
              ) : null}

              {/* Stock counter */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>
                  {form.unit === "piece" ? content.modal.stockPiece : `${content.modal.stockUnitPrefix}${form.unit}${content.modal.stockUnitSuffix}`}
                </Text>

                {form.unit === "piece" ? (
                  <>
                    {/* Integer counter for piece units */}
                    <View style={styles.counterRow}>
                      <TouchableOpacity
                        style={[styles.counterBtn, form.stock <= 0 && styles.counterBtnDisabled]}
                        onPress={decrementStock}
                        disabled={form.stock <= 0}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.counterBtnText}>−</Text>
                      </TouchableOpacity>
                      <TextInput
                        style={styles.counterInput}
                        value={String(form.stock)}
                        onChangeText={(v) => setStockFromText(v)}
                        keyboardType="number-pad"
                        selectTextOnFocus
                      />
                      <TouchableOpacity
                        style={styles.counterBtn}
                        onPress={incrementStock}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.counterBtnText}>+</Text>
                      </TouchableOpacity>
                    </View>
                    <View style={styles.quickAddRow}>
                      <Text style={styles.quickAddLabel}>{content.modal.quickAdd}</Text>
                      {content.quickAddValues.map((n) => (
                        <TouchableOpacity
                          key={n}
                          style={styles.quickAddBtn}
                          onPress={() => quickAddStock(n)}
                          activeOpacity={0.7}
                        >
                          <Text style={styles.quickAddBtnText}>+{n}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </>
                ) : (
                  <>
                    {/* Decimal input for weight units */}
                    <TextInput
                      style={styles.input}
                      value={form.stockText}
                      onChangeText={setStockText}
                      placeholder={content.modal.stockDecimalPlaceholder.replace("{unit}", form.unit)}
                      placeholderTextColor="#94A3B8"
                      keyboardType="decimal-pad"
                      selectTextOnFocus
                    />
                    <Text style={styles.charCount}>
                      {content.modal.stockTotalHint.replace("{unit}", form.unit)}
                    </Text>
                  </>
                )}
              </View>

              {/* Description */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>{content.modal.description}</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={form.description}
                  onChangeText={(v) => setFormField("description", v)}
                  placeholder={content.modal.descriptionPlaceholder}
                  placeholderTextColor="#94A3B8"
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                  maxLength={500}
                />
                <Text style={styles.charCount}>{form.description.length}/500</Text>
              </View>

              {/* Menu Section */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>{content.modal.menuSection}</Text>
                <TextInput
                  style={styles.input}
                  value={form.menuSection}
                  onChangeText={(v) => setFormField("menuSection", v)}
                  placeholder={content.modal.menuSectionPlaceholder}
                  placeholderTextColor="#94A3B8"
                  maxLength={40}
                />
              </View>

              {/* Veg / Non-Veg */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>{content.modal.dietary}</Text>
                <View style={{ flexDirection: "row", gap: 10 }}>
                  <TouchableOpacity
                    style={[styles.dietChip, form.isVeg && styles.dietChipVegActive]}
                    onPress={() => setFormField("isVeg", true)}
                    activeOpacity={0.8}
                  >
                    <View style={styles.vegDot} />
                    <Text style={[styles.dietChipText, form.isVeg && { color: "#166534", fontWeight: "700" }]}>{content.modal.veg}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.dietChip, !form.isVeg && styles.dietChipNonVegActive]}
                    onPress={() => setFormField("isVeg", false)}
                    activeOpacity={0.8}
                  >
                    <View style={styles.nonVegDot} />
                    <Text style={[styles.dietChipText, !form.isVeg && { color: "#991B1B", fontWeight: "700" }]}>{content.modal.nonVeg}</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Save button at bottom */}
              <TouchableOpacity
                style={[styles.saveBtn, isSubmitting && styles.saveBtnDisabled]}
                onPress={handleCreate}
                disabled={isSubmitting}
                activeOpacity={0.85}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.saveBtnText}>{content.modal.saveBtn}</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </SafeAreaView>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F7F8FA",
  },

  // ── Header
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

  // ─── Product Card ───
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 10,
  },
  thumbWrap: {
    width: 72,
    height: 72,
    borderRadius: 10,
    overflow: "hidden",
  },
  thumb: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  thumbPlaceholder: {
    width: "100%",
    height: "100%",
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 10,
  },
  thumbPlaceholderText: {
    fontSize: 28,
  },
  discountBadge: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#EF4444",
    paddingVertical: 2,
    alignItems: "center",
  },
  discountBadgeText: {
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: "700",
  },
  cardInfo: {
    flex: 1,
    justifyContent: "center",
  },
  productName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 4,
  },
  categoryChip: {
    alignSelf: "flex-start",
    backgroundColor: "#EFF6FF",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginBottom: 6,
  },
  categoryChipText: {
    fontSize: 11,
    color: "#3B82F6",
    fontWeight: "600",
    textTransform: "capitalize",
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 2,
  },
  productPrice: {
    fontSize: 16,
    fontWeight: "800",
    color: "#16A34A",
  },
  originalPrice: {
    fontSize: 12,
    color: "#94A3B8",
    textDecorationLine: "line-through",
  },
  stockText: {
    fontSize: 12,
    color: "#6B7280",
  },
  stockGood: {
    color: "#16A34A",
    fontWeight: "700",
  },
  stockOut: {
    color: "#EF4444",
    fontWeight: "700",
  },
  actionsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 10,
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
  // Admin approval banner
  approvalBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 8,
    gap: 8,
  },
  approvalIcon: { fontSize: 13, fontWeight: "800", marginTop: 1 },
  approvalLabel: { fontSize: 12, fontWeight: "700" },
  approvalNote: { fontSize: 10, color: "#64748B", marginTop: 2 },
  // Daily availability banner
  availBanner: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 10,
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
  availIcon: { fontSize: 16 },
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

  // ─── Modal ───
  modalContainer: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  modalCloseBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center",
  },
  modalCloseBtnText: {
    fontSize: 14,
    color: "#64748B",
    fontWeight: "700",
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#0F172A",
  },
  modalSaveBtn: {
    backgroundColor: "#16A34A",
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 8,
    minWidth: 60,
    alignItems: "center",
  },
  modalSaveBtnDisabled: {
    backgroundColor: "#86EFAC",
  },
  modalSaveBtnText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 14,
  },
  modalScroll: {
    padding: 16,
    paddingBottom: 40,
  },

  // Image picker
  imagePicker: {
    width: "100%",
    height: 180,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#FFFFFF",
    borderWidth: 2,
    borderColor: "#E2E8F0",
    borderStyle: "dashed",
  },
  imagePreview: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  imageOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(0,0,0,0.45)",
    paddingVertical: 8,
    alignItems: "center",
  },
  imageOverlayText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "600",
  },
  imagePlaceholder: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
  },
  imagePlaceholderIcon: {
    fontSize: 36,
  },
  imagePlaceholderText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#475569",
  },
  imagePlaceholderSub: {
    fontSize: 12,
    color: "#94A3B8",
    textAlign: "center",
  },

  // Form fields
  fieldGroup: {
    marginBottom: 18,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
  },
  required: {
    color: "#EF4444",
  },
  input: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: "#0F172A",
  },
  textArea: {
    height: 100,
    paddingTop: 12,
  },
  charCount: {
    textAlign: "right",
    fontSize: 11,
    color: "#94A3B8",
    marginTop: 4,
  },

  // Category dropdown
  dropdownTrigger: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  dropdownTriggerText: {
    fontSize: 15,
    color: "#0F172A",
    fontWeight: "500",
  },
  dropdownArrow: {
    fontSize: 11,
    color: "#94A3B8",
  },
  dropdownList: {
    marginTop: 4,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    overflow: "hidden",
  },
  dropdownItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  dropdownItemSelected: {
    backgroundColor: "#F0FDF4",
  },
  dropdownItemText: {
    fontSize: 14,
    color: "#374151",
  },
  dropdownItemTextSelected: {
    color: "#16A34A",
    fontWeight: "700",
  },
  dropdownCheck: {
    fontSize: 14,
    color: "#16A34A",
    fontWeight: "700",
  },

  // Price fields
  priceFieldRow: {
    flexDirection: "row",
    marginBottom: 18,
  },
  priceInputWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    paddingLeft: 12,
  },
  pricePrefix: {
    fontSize: 15,
    color: "#6B7280",
    fontWeight: "600",
    marginRight: 2,
  },
  priceInput: {
    flex: 1,
    paddingVertical: 12,
    paddingRight: 14,
    fontSize: 15,
    color: "#0F172A",
  },
  discountPreview: {
    backgroundColor: "#FEF9C3",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 18,
    marginTop: -10,
  },
  discountPreviewText: {
    color: "#854D0E",
    fontSize: 13,
    fontWeight: "600",
  },

  // Stock counter
  counterRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 14,
    overflow: "hidden",
    alignSelf: "stretch",
  },
  counterBtn: {
    width: 52,
    height: 52,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
  },
  counterBtnDisabled: {
    opacity: 0.35,
  },
  counterBtnText: {
    fontSize: 24,
    fontWeight: "700",
    color: "#16A34A",
    lineHeight: 28,
  },
  counterInput: {
    flex: 1,
    textAlign: "center",
    fontSize: 22,
    fontWeight: "800",
    color: "#0F172A",
    paddingVertical: 10,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: "#E2E8F0",
  },
  quickAddRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 10,
  },
  quickAddLabel: {
    fontSize: 12,
    color: "#94A3B8",
    fontWeight: "500",
  },
  quickAddBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: "#F0FDF4",
    borderWidth: 1,
    borderColor: "#BBF7D0",
  },
  quickAddBtnText: {
    fontSize: 13,
    color: "#16A34A",
    fontWeight: "700",
  },

  // Save button
  saveBtn: {
    backgroundColor: "#16A34A",
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 10,
    shadowColor: "#16A34A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  saveBtnDisabled: {
    backgroundColor: "#86EFAC",
    shadowOpacity: 0,
    elevation: 0,
  },
  saveBtnText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 0.3,
  },

  // Diet chips
  dietChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    backgroundColor: "#F8FAFC",
  },
  dietChipVegActive: {
    backgroundColor: "#DCFCE7",
    borderColor: "#16A34A",
  },
  dietChipNonVegActive: {
    backgroundColor: "#FEE2E2",
    borderColor: "#DC2626",
  },
  dietChipText: {
    fontSize: 13,
    color: "#64748B",
    fontWeight: "600",
  },
  vegDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#16A34A",
    borderWidth: 1.5,
    borderColor: "#15803D",
  },
  nonVegDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#DC2626",
    borderWidth: 1.5,
    borderColor: "#B91C1C",
  },

  // Additional images
  optional: {
    color: "#94A3B8",
    fontWeight: "400",
  },
  additionalImagesRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  additionalThumbWrap: {
    width: 88,
    height: 88,
    borderRadius: 12,
    overflow: "hidden",
    position: "relative",
  },
  additionalThumb: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  additionalRemoveBtn: {
    position: "absolute",
    top: 4,
    right: 4,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center",
    alignItems: "center",
  },
  additionalRemoveBtnText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
  },
  additionalAddSlot: {
    width: 88,
    height: 88,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    borderWidth: 2,
    borderColor: "#E2E8F0",
    borderStyle: "dashed",
    justifyContent: "center",
    alignItems: "center",
    gap: 2,
  },
  additionalAddIcon: {
    fontSize: 26,
    color: "#94A3B8",
    fontWeight: "300",
    lineHeight: 30,
  },
  additionalAddText: {
    fontSize: 11,
    color: "#94A3B8",
    fontWeight: "600",
  },
});
