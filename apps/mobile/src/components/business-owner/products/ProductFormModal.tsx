import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  type LayoutChangeEvent,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { ProductForm, type CategoryMetadata } from "@hooks/useBusinessOwnerProducts";
import { isCategoryRecommended } from "@utils/categoryMetadata";
import { type ProductUnit } from "@utils/helpers";
import content from "@/content/boProducts.json";

type ErrorField = "photo" | "name" | "price" | "mrp" | "unitStep";

const ERROR_FIELDS: Record<string, ErrorField> = {
  [content.alerts.missingImageMsg]: "photo",
  [content.alerts.missingNameMsg]: "name",
  [content.alerts.missingPriceMsg]: "price",
  [content.alerts.invalidPriceMsg]: "price",
  [content.alerts.invalidOriginalPriceMsg]: "mrp",
  [content.alerts.missingUnitStepMsg]: "unitStep",
};

interface ProductFormModalProps {
  visible: boolean;
  isSubmitting: boolean;
  form: ProductForm;
  formError: string | null;
  isEditing: boolean;
  showCategoryDropdown: boolean;
  businessCategory?: string;
  getCategoryMetadata: (value: string) => CategoryMetadata | undefined;
  getCategoriesForBusinessType: (businessCategory?: string) => CategoryMetadata[];
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
  onAddAttribute: () => void;
  onRemoveAttribute: (index: number) => void;
  onSetAttributeName: (index: number, name: string) => void;
  onAddAttributeValue: (index: number) => void;
  onRemoveAttributeValue: (attrIndex: number, valueIndex: number) => void;
  onSetAttributeValue: (attrIndex: number, valueIndex: number, value: string) => void;
}

export function ProductFormModal({
  visible,
  isSubmitting,
  form,
  formError,
  isEditing,
  showCategoryDropdown,
  businessCategory,
  getCategoryMetadata,
  getCategoriesForBusinessType,
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
  onAddAttribute,
  onRemoveAttribute,
  onSetAttributeName,
  onAddAttributeValue,
  onRemoveAttributeValue,
  onSetAttributeValue,
}: ProductFormModalProps) {
  const insets = useSafeAreaInsets();
  const scrollViewRef = useRef<ScrollView>(null);
  const [fieldLayouts, setFieldLayouts] = useState<Record<ErrorField, number>>({} as Record<ErrorField, number>);

  const errorField = useMemo<ErrorField | null>(() => {
    if (!formError) return null;
    return ERROR_FIELDS[formError] ?? null;
  }, [formError]);

  useEffect(() => {
    if (!errorField) return;
    const y = fieldLayouts[errorField];
    if (y !== undefined && scrollViewRef.current) {
      scrollViewRef.current.scrollTo({ y: y - 20, animated: true });
    }
  }, [errorField, fieldLayouts]);

  const onFieldLayout = (field: ErrorField) => (event: LayoutChangeEvent) => {
    const y = event.nativeEvent?.layout?.y;
    if (y === undefined) return;
    setFieldLayouts((prev) => ({ ...prev, [field]: y }));
  };

  const renderFieldError = (field: ErrorField) => {
    if (errorField !== field || !formError) return null;
    return (
      <View style={styles.inlineError}>
        <Text style={styles.inlineErrorText}>{formError}</Text>
      </View>
    );
  };

  const categoryMeta = getCategoryMetadata(form.category);
  const supportsDietaryType = categoryMeta?.supportsDietary ?? false;
  const supportsMenuSection = categoryMeta?.supportsMenuSection ?? false;
  const requiresUnitStep = categoryMeta?.requiresUnitStep ?? false;
  const unitStepPresets = categoryMeta?.unitStepPresets ?? content.unitStepPresets;
  const quickAddValues = categoryMeta?.quickAddStockValues ?? content.quickAddValues;
  const supportsAttributes = categoryMeta?.supportsAttributes ?? false;


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
      presentationStyle="fullScreen"
      onRequestClose={() => undefined}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={[styles.modalHeader, { paddingTop: insets.top + 2 }]}>
            <TouchableOpacity
              onPress={onClose}
              style={styles.modalCloseBtn}
              disabled={isSubmitting}
            >
              <Text style={styles.modalCloseBtnText}>✕</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>{isEditing ? "Edit Product" : content.modal.title}</Text>
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
            ref={scrollViewRef}
            style={{ flex: 1 }}
            contentContainerStyle={styles.modalScroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.fieldGroup} onLayout={onFieldLayout("photo")}>
              <Text style={styles.fieldLabel}>
                {content.modal.photoLabel}{" "}
                <Text style={styles.required}>{content.modal.required}</Text>
              </Text>
              <TouchableOpacity
                style={[styles.imagePicker, errorField === "photo" && styles.imagePickerError]}
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
              {renderFieldError("photo")}
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

            <View style={styles.fieldGroup} onLayout={onFieldLayout("name")}>
              <Text style={styles.fieldLabel}>
                {content.modal.productName}{" "}
                <Text style={styles.required}>{content.modal.required}</Text>
              </Text>
              <TextInput
                style={[styles.input, errorField === "name" && styles.inputError]}
                value={form.name}
                onChangeText={(v) => onSetFormField("name", v)}
                placeholder={content.modal.productNamePlaceholder}
                placeholderTextColor="#94A3B8"
                returnKeyType="next"
                maxLength={100}
              />
              {renderFieldError("name")}
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>{content.modal.category}</Text>
              <TouchableOpacity
                style={styles.dropdownTrigger}
                onPress={onToggleCategoryDropdown}
                activeOpacity={0.8}
              >
                <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
                  <Text style={styles.categoryEmoji}>{getCategoryMetadata(form.category)?.emoji ?? "🏷️"}</Text>
                  <Text style={styles.dropdownTriggerText}>
                    {getCategoryMetadata(form.category)?.label ?? form.category}
                  </Text>
                </View>
                <Text style={styles.dropdownArrow}>▼</Text>
              </TouchableOpacity>
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
                          form.unit === opt.value && { color: "#0B2E22", fontWeight: "700" },
                        ]}
                      >
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
              </View>
            </View>

            {form.unit !== "piece" && requiresUnitStep && (
              <View style={styles.fieldGroup} onLayout={onFieldLayout("unitStep")}>
                <Text style={styles.fieldLabel}>
                  {content.modal.unitStep}{" "}
                  <Text style={styles.optional}>{content.modal.unitStepOptional}</Text>
                </Text>
                <View style={[styles.unitStepRow, errorField === "unitStep" && styles.unitStepError]}>
                  {(unitStepPresets[
                    form.unit as Exclude<ProductUnit, "piece">
                  ] ?? []).map((preset) => (
                    <TouchableOpacity
                      key={preset.value}
                      style={[
                        styles.quickAddBtn,
                        form.unitStep === preset.value && {
                          backgroundColor: "#084C3D",
                          borderColor: "#084C3D",
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
                {renderFieldError("unitStep")}
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

            <View style={styles.priceFieldRow} onLayout={onFieldLayout("price")}>
              <View style={[styles.fieldGroup, { flex: 1 }]}>
                <Text style={styles.fieldLabel}>
                  {content.modal.priceLabel}{" "}
                  <Text style={styles.required}>{content.modal.required}</Text>
                </Text>
                <View style={[styles.priceInputWrap, errorField === "price" && styles.inputError]}>
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
                {renderFieldError("price")}
              </View>
              <View style={{ width: 12 }} />
              <View style={[styles.fieldGroup, { flex: 1 }]} onLayout={onFieldLayout("mrp")}>
                <Text style={styles.fieldLabel}>{content.modal.mrpLabel}</Text>
                <View style={[styles.priceInputWrap, errorField === "mrp" && styles.inputError]}>
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
                {renderFieldError("mrp")}
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
                {form.unit === "piece" || form.unit === undefined
                  ? content.modal.stockPiece
                  : `${content.modal.stockUnitPrefix}${form.unit}${content.modal.stockUnitSuffix}`}
              </Text>

              {form.unit === "piece" || form.unit === undefined ? (
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
                    {quickAddValues.map((n) => (
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

            {supportsMenuSection ? (
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
            ) : null}

            {supportsDietaryType ? (
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
                        form.isVeg && { color: "#0B2E22", fontWeight: "700" },
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
            ) : null}

            {supportsAttributes && (
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>
                  {content.modal.attributes}{" "}
                  <Text style={styles.optional}>{content.modal.attributesOptional}</Text>
                </Text>
                {form.attributes.map((attr, attrIdx) => (
                  <View key={attrIdx} style={styles.attributeCard}>
                    <View style={styles.attributeHeader}>
                      <TextInput
                        style={styles.attributeNameInput}
                        value={attr.name}
                        onChangeText={(v) => onSetAttributeName(attrIdx, v)}
                        placeholder={content.modal.attributeNamePlaceholder}
                        placeholderTextColor="#94A3B8"
                      />
                      <TouchableOpacity
                        style={styles.attributeRemoveBtn}
                        onPress={() => onRemoveAttribute(attrIdx)}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.attributeRemoveBtnText}>✕</Text>
                      </TouchableOpacity>
                    </View>
                    <View style={styles.attributeValuesRow}>
                      {attr.values.map((value, valueIdx) => (
                        <View key={valueIdx} style={styles.attributeValueChip}>
                          <TextInput
                            style={styles.attributeValueInput}
                            value={value}
                            onChangeText={(v) => onSetAttributeValue(attrIdx, valueIdx, v)}
                            placeholder={content.modal.attributeValuePlaceholder}
                            placeholderTextColor="#94A3B8"
                          />
                          {attr.values.length > 1 && (
                            <TouchableOpacity
                              style={styles.attributeValueRemoveBtn}
                              onPress={() => onRemoveAttributeValue(attrIdx, valueIdx)}
                              activeOpacity={0.7}
                            >
                              <Text style={styles.attributeValueRemoveBtnText}>✕</Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      ))}
                      <TouchableOpacity
                        style={styles.addAttributeValueBtn}
                        onPress={() => onAddAttributeValue(attrIdx)}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.addAttributeValueBtnText}>{content.modal.addValue}</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
                <TouchableOpacity
                  style={styles.addAttributeBtn}
                  onPress={onAddAttribute}
                  activeOpacity={0.7}
                >
                  <Text style={styles.addAttributeBtnText}>{content.modal.addAttribute}</Text>
                </TouchableOpacity>
              </View>
            )}

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

      <CategoryPickerModal
        visible={showCategoryDropdown}
        onClose={onToggleCategoryDropdown}
        selectedValue={form.category}
        businessCategory={businessCategory}
        getCategoriesForBusinessType={getCategoriesForBusinessType}
        onSelect={onSetCategory}
      />
    </Modal>
  );
}

interface CategoryPickerModalProps {
  visible: boolean;
  onClose: () => void;
  selectedValue: string;
  businessCategory?: string;
  getCategoriesForBusinessType: (businessCategory?: string) => CategoryMetadata[];
  onSelect: (value: string) => void;
}

function CategoryPickerModal({
  visible,
  onClose,
  selectedValue,
  businessCategory,
  getCategoriesForBusinessType,
  onSelect,
}: CategoryPickerModalProps) {
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState("");
  const allOptions = useMemo(() => getCategoriesForBusinessType(businessCategory), [businessCategory, getCategoriesForBusinessType]);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return allOptions;
    return allOptions.filter((cat) => cat.label.toLowerCase().includes(q));
  }, [allOptions, query]);

  const recommended = useMemo(() => filtered.filter((c) => isCategoryRecommended(c.value, businessCategory)), [filtered, businessCategory]);
  const others = useMemo(() => filtered.filter((c) => !isCategoryRecommended(c.value, businessCategory)), [filtered, businessCategory]);
  const showSections = Boolean(businessCategory) && recommended.length > 0 && others.length > 0;

  const handleSelect = useCallback(
    (value: string) => {
      onSelect(value);
      onClose();
    },
    [onSelect, onClose]
  );

  const renderItem = (cat: CategoryMetadata, isLast: boolean) => {
    const selected = selectedValue === cat.value;
    return (
      <TouchableOpacity
        key={cat.value}
        style={[styles.categoryModalItem, selected && styles.categoryModalItemSelected, isLast && { borderBottomWidth: 0 }]}
        onPress={() => handleSelect(cat.value)}
        activeOpacity={0.7}
      >
        <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
          <Text style={styles.categoryModalEmoji}>{cat.emoji ?? "🏷️"}</Text>
          <View style={{ flex: 1 }}>
            <Text style={[styles.categoryModalItemText, selected && styles.categoryModalItemTextSelected]}>{cat.label}</Text>
            {!isCategoryRecommended(cat.value, businessCategory) && (
              <Text style={styles.categoryModalHint}>Not typical for your shop type</Text>
            )}
          </View>
        </View>
        {selected && <Text style={styles.categoryModalCheck}>✓</Text>}
      </TouchableOpacity>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: "#F8FAFC" }}>
        <View style={[styles.categoryModalHeader, { paddingTop: insets.top + 8 }]}>
          <TouchableOpacity style={styles.modalCloseBtn} onPress={onClose} activeOpacity={0.7}>
            <Text style={styles.modalCloseBtnText}>✕</Text>
          </TouchableOpacity>
          <Text style={styles.categoryModalTitle}>Select Category</Text>
          <View style={{ width: 34 }} />
        </View>
        <View style={styles.categoryModalSearchWrap}>
          <TextInput
            style={styles.categoryModalSearch}
            value={query}
            onChangeText={setQuery}
            placeholder="Search categories…"
            placeholderTextColor="#94A3B8"
            autoFocus
          />
        </View>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: insets.bottom + 16 }}>
          {showSections && (
            <View style={styles.categoryModalSectionHeader}>
              <Text style={styles.categoryModalSectionHeaderText}>Recommended for your shop</Text>
            </View>
          )}
          {recommended.map((cat, idx) => renderItem(cat, !showSections && idx === recommended.length - 1 && others.length === 0))}
          {showSections && (
            <View style={styles.categoryModalSectionHeader}>
              <Text style={styles.categoryModalSectionHeaderText}>All Categories</Text>
            </View>
          )}
          {others.map((cat, idx) => renderItem(cat, idx === others.length - 1))}
          {!showSections && filtered.map((cat, idx) => renderItem(cat, idx === filtered.length - 1))}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  formError: {
    backgroundColor: "#FEF2F2",
    borderColor: "#FECACA",
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginBottom: 14,
  },
  formErrorText: { color: "#B91C1C", fontSize: 13, fontWeight: "600" },
  inlineError: {
    marginTop: 8,
  },
  inlineErrorText: {
    color: "#B91C1C",
    fontSize: 12,
    fontWeight: "600",
  },
  inputError: {
    borderColor: "#EF4444",
    backgroundColor: "#FEF2F2",
  },
  unitStepRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  unitStepError: {
    padding: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#EF4444",
    backgroundColor: "#FEF2F2",
  },
  attributeCard: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  attributeHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 10,
  },
  attributeNameInput: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: "#0F172A",
  },
  attributeRemoveBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
    alignItems: "center",
    justifyContent: "center",
  },
  attributeRemoveBtnText: {
    color: "#DC2626",
    fontSize: 12,
    fontWeight: "700",
  },
  attributeValuesRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    alignItems: "center",
  },
  attributeValueChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 10,
    paddingLeft: 10,
  },
  attributeValueInput: {
    width: 90,
    paddingVertical: 8,
    fontSize: 13,
    color: "#0F172A",
  },
  attributeValueRemoveBtn: {
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  attributeValueRemoveBtnText: {
    color: "#DC2626",
    fontSize: 12,
    fontWeight: "700",
  },
  addAttributeValueBtn: {
    backgroundColor: "#F0FDF4",
    borderWidth: 1,
    borderColor: "#BBF7D0",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  addAttributeValueBtnText: {
    color: "#084C3D",
    fontSize: 12,
    fontWeight: "700",
  },
  addAttributeBtn: {
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderStyle: "dashed",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    backgroundColor: "#F8FAFC",
  },
  addAttributeBtnText: {
    color: "#084C3D",
    fontSize: 13,
    fontWeight: "700",
  },
  categorySearch: {
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  categoryEmoji: {
    fontSize: 16,
    marginRight: 10,
  },
  categoryModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  categoryModalTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#0F172A",
  },
  categoryModalSearchWrap: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  categoryModalSearch: {
    backgroundColor: "#F1F5F9",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: "#0F172A",
  },
  categoryModalSectionHeader: {
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  categoryModalSectionHeaderText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#64748B",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  categoryModalItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  categoryModalItemSelected: {
    backgroundColor: "#F0FDF4",
  },
  categoryModalEmoji: {
    fontSize: 20,
    marginRight: 14,
  },
  categoryModalItemText: {
    fontSize: 15,
    color: "#374151",
    fontWeight: "500",
  },
  categoryModalItemTextSelected: {
    color: "#084C3D",
    fontWeight: "700",
  },
  categoryModalHint: {
    fontSize: 12,
    color: "#94A3B8",
    marginTop: 2,
  },
  categoryModalCheck: {
    fontSize: 16,
    color: "#084C3D",
    fontWeight: "700",
  },
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
    backgroundColor: "#084C3D",
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
  imagePickerError: {
    borderColor: "#EF4444",
    backgroundColor: "#FEF2F2",
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
    color: "#084C3D",
    fontWeight: "700",
  },
  dropdownCheck: {
    fontSize: 14,
    color: "#084C3D",
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
    color: "#084C3D",
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
    color: "#084C3D",
    fontWeight: "700",
  },
  saveBtn: {
    backgroundColor: "#084C3D",
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 10,
    shadowColor: "#084C3D",
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
    backgroundColor: "#E4F3EA",
    borderColor: "#084C3D",
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
    backgroundColor: "#084C3D",
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
