import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ProductForm } from "@hooks/useBusinessOwnerProducts";
import { type ProductUnit } from "@utils/helpers";
import content from "@/content/boProducts.json";

interface ProductFormModalProps {
  visible: boolean;
  isSubmitting: boolean;
  form: ProductForm;
  showCategoryDropdown: boolean;
  getCategoryLabel: (value: string) => string;
  onClose: () => void;
  onSave: () => void;
  onShowImageOptions: () => void;
  onShowAdditionalImageOptions: () => void;
  onRemoveAdditionalImage: (index: number) => void;
  onToggleCategoryDropdown: () => void;
  onSetCategory: (value: string) => void;
  onSetUnit: (unit: ProductUnit) => void;
  onSetUnitStep: (value: string) => void;
  onDecrementStock: () => void;
  onIncrementStock: () => void;
  onSetStockFromText: (value: string) => void;
  onSetStockText: (value: string) => void;
  onQuickAddStock: (amount: number) => void;
  onSetFormField: <K extends keyof ProductForm>(field: K, value: ProductForm[K]) => void;
}

export function ProductFormModal({
  visible,
  isSubmitting,
  form,
  showCategoryDropdown,
  getCategoryLabel,
  onClose,
  onSave,
  onShowImageOptions,
  onShowAdditionalImageOptions,
  onRemoveAdditionalImage,
  onToggleCategoryDropdown,
  onSetCategory,
  onSetUnit,
  onSetUnitStep,
  onDecrementStock,
  onIncrementStock,
  onSetStockFromText,
  onSetStockText,
  onQuickAddStock,
  onSetFormField,
}: ProductFormModalProps) {
  const discountPercent =
    form.originalPrice && form.price &&
    parseFloat(form.originalPrice) > parseFloat(form.price)
      ? Math.round(
          ((parseFloat(form.originalPrice) - parseFloat(form.price)) /
            parseFloat(form.originalPrice)) *
            100
        )
      : null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              onPress={onClose}
              style={styles.modalCloseBtn}
              disabled={isSubmitting}
            >
              <Text style={styles.modalCloseBtnText}>✕</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>{content.modal.title}</Text>
            <TouchableOpacity
              style={[
                styles.modalSaveBtn,
                isSubmitting && styles.modalSaveBtnDisabled,
              ]}
              onPress={onSave}
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
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>
                {content.modal.photoLabel}{" "}
                <Text style={styles.required}>{content.modal.required}</Text>
              </Text>
              <TouchableOpacity
                style={styles.imagePicker}
                onPress={onShowImageOptions}
                activeOpacity={0.8}
              >
                {form.imageUri ? (
                  <>
                    <Image
                      source={{ uri: form.imageUri }}
                      style={styles.imagePreview}
                    />
                    <View style={styles.imageOverlay}>
                      <Text style={styles.imageOverlayText}>
                        {content.modal.changePhoto}
                      </Text>
                    </View>
                  </>
                ) : (
                  <View style={styles.imagePlaceholder}>
                    <Text style={styles.imagePlaceholderIcon}>📷</Text>
                    <Text style={styles.imagePlaceholderText}>
                      {content.modal.addPhoto}
                    </Text>
                    <Text style={styles.imagePlaceholderSub}>
                      {content.modal.addPhotoSub}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>
                {content.modal.additionalPhotosLabel}{" "}
                <Text style={styles.optional}>
                  {content.modal.additionalPhotosOptional}
                </Text>
              </Text>
              <View style={styles.additionalImagesRow}>
                {form.additionalImageUris.map((uri, idx) => (
                  <View key={idx} style={styles.additionalThumbWrap}>
                    <Image source={{ uri }} style={styles.additionalThumb} />
                    <TouchableOpacity
                      style={styles.additionalRemoveBtn}
                      onPress={() => onRemoveAdditionalImage(idx)}
                    >
                      <Text style={styles.additionalRemoveBtnText}>
                        {content.modal.additionalRemove}
                      </Text>
                    </TouchableOpacity>
                  </View>
                ))}
                {form.additionalImageUris.length < 3 && (
                  <TouchableOpacity
                    style={styles.additionalAddSlot}
                    onPress={onShowAdditionalImageOptions}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.additionalAddIcon}>+</Text>
                    <Text style={styles.additionalAddText}>
                      {content.modal.additionalAdd}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>
                {content.modal.productName}{" "}
                <Text style={styles.required}>{content.modal.required}</Text>
              </Text>
              <TextInput
                style={styles.input}
                value={form.name}
                onChangeText={(v) => onSetFormField("name", v)}
                placeholder={content.modal.productNamePlaceholder}
                placeholderTextColor="#94A3B8"
                returnKeyType="next"
                maxLength={100}
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>{content.modal.category}</Text>
              <TouchableOpacity
                style={styles.dropdownTrigger}
                onPress={onToggleCategoryDropdown}
                activeOpacity={0.8}
              >
                <Text style={styles.dropdownTriggerText}>
                  {getCategoryLabel(form.category)}
                </Text>
                <Text style={styles.dropdownArrow}>
                  {showCategoryDropdown ? "▲" : "▼"}
                </Text>
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
                      onPress={() => onSetCategory(cat.value)}
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
                    onPress={() => onSetUnit(opt.value as ProductUnit)}
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

            {form.unit !== "piece" && (
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>
                  {content.modal.unitStep}{" "}
                  <Text style={styles.optional}>{content.modal.unitStepOptional}</Text>
                </Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                  {content.unitStepPresets[
                    form.unit as Exclude<ProductUnit, "piece">
                  ].map((preset) => (
                    <TouchableOpacity
                      key={preset.value}
                      style={[
                        styles.quickAddBtn,
                        form.unitStep === preset.value && {
                          backgroundColor: "#16A34A",
                          borderColor: "#16A34A",
                        },
                      ]}
                      onPress={() => onSetUnitStep(preset.value)}
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
                  Price you enter = price per{" "}
                  {
                    content.unitStepPresets[
                      form.unit as Exclude<ProductUnit, "piece">
                    ].find((p) => p.value === form.unitStep)?.label ??
                      form.unitStep + form.unit
                  }
                </Text>
              </View>
            )}

            <View style={styles.priceFieldRow}>
              <View style={[styles.fieldGroup, { flex: 1 }]}>
                <Text style={styles.fieldLabel}>
                  {content.modal.priceLabel}{" "}
                  <Text style={styles.required}>{content.modal.required}</Text>
                </Text>
                <View style={styles.priceInputWrap}>
                  <Text style={styles.pricePrefix}>{content.currency}</Text>
                  <TextInput
                    style={styles.priceInput}
                    value={form.price}
                    onChangeText={(v) => onSetFormField("price", v)}
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
                    onChangeText={(v) => onSetFormField("originalPrice", v)}
                    placeholder={content.modal.pricePlaceholder}
                    placeholderTextColor="#94A3B8"
                    keyboardType="decimal-pad"
                    returnKeyType="next"
                  />
                </View>
              </View>
            </View>

            {discountPercent !== null && (
              <View style={styles.discountPreview}>
                <Text style={styles.discountPreviewText}>
                  {content.modal.discountPreview.replace(
                    "{discount}",
                    String(discountPercent)
                  )}
                </Text>
              </View>
            )}

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>
                {form.unit === "piece"
                  ? content.modal.stockPiece
                  : `${content.modal.stockUnitPrefix}${form.unit}${content.modal.stockUnitSuffix}`}
              </Text>

              {form.unit === "piece" ? (
                <>
                  <View style={styles.counterRow}>
                    <TouchableOpacity
                      style={[
                        styles.counterBtn,
                        form.stock <= 0 && styles.counterBtnDisabled,
                      ]}
                      onPress={onDecrementStock}
                      disabled={form.stock <= 0}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.counterBtnText}>−</Text>
                    </TouchableOpacity>
                    <TextInput
                      style={styles.counterInput}
                      value={String(form.stock)}
                      onChangeText={(v) => onSetStockFromText(v)}
                      keyboardType="number-pad"
                      selectTextOnFocus
                    />
                    <TouchableOpacity
                      style={styles.counterBtn}
                      onPress={onIncrementStock}
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
                        onPress={() => onQuickAddStock(n)}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.quickAddBtnText}>+{n}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              ) : (
                <>
                  <TextInput
                    style={styles.input}
                    value={form.stockText}
                    onChangeText={onSetStockText}
                    placeholder={content.modal.stockDecimalPlaceholder.replace(
                      "{unit}",
                      form.unit
                    )}
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

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>{content.modal.description}</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={form.description}
                onChangeText={(v) => onSetFormField("description", v)}
                placeholder={content.modal.descriptionPlaceholder}
                placeholderTextColor="#94A3B8"
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                maxLength={500}
              />
              <Text style={styles.charCount}>{form.description.length}/500</Text>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>{content.modal.menuSection}</Text>
              <TextInput
                style={styles.input}
                value={form.menuSection}
                onChangeText={(v) => onSetFormField("menuSection", v)}
                placeholder={content.modal.menuSectionPlaceholder}
                placeholderTextColor="#94A3B8"
                maxLength={40}
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>{content.modal.dietary}</Text>
              <View style={{ flexDirection: "row", gap: 10 }}>
                <TouchableOpacity
                  style={[styles.dietChip, form.isVeg && styles.dietChipVegActive]}
                  onPress={() => onSetFormField("isVeg", true)}
                  activeOpacity={0.8}
                >
                  <View style={styles.vegDot} />
                  <Text
                    style={[
                      styles.dietChipText,
                      form.isVeg && { color: "#166534", fontWeight: "700" },
                    ]}
                  >
                    {content.modal.veg}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.dietChip,
                    !form.isVeg && styles.dietChipNonVegActive,
                  ]}
                  onPress={() => onSetFormField("isVeg", false)}
                  activeOpacity={0.8}
                >
                  <View style={styles.nonVegDot} />
                  <Text
                    style={[
                      styles.dietChipText,
                      !form.isVeg && { color: "#991B1B", fontWeight: "700" },
                    ]}
                  >
                    {content.modal.nonVeg}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.saveBtn, isSubmitting && styles.saveBtnDisabled]}
              onPress={onSave}
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
  );
}

const styles = StyleSheet.create({
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
  optional: {
    color: "#94A3B8",
    fontWeight: "400",
  },
});
