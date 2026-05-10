import { useEffect, useMemo, useState, useCallback } from "react";
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
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Image,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import AppSectionHeader from "../../src/components/AppSectionHeader";
import { useBusinessOwner } from "../../src/hooks/useBusinessOwner";
import { Product } from "../../src/types";

interface ProductForm {
  name: string;
  category: string;
  price: string;
  originalPrice: string;
  stock: number;
  description: string;
  imageUri: string | null;
  additionalImageUris: string[];
}

function toDataUrl(base64?: string | null, mimeType?: string | null) {
  if (!base64) return null;
  return `data:${mimeType || "image/jpeg"};base64,${base64}`;
}

function extractRequestError(err: unknown, fallback: string) {
  if (err && typeof err === "object") {
    const axiosErr = err as any;
    return (
      axiosErr?.response?.data?.error ||
      axiosErr?.response?.data?.message ||
      axiosErr?.message ||
      fallback
    );
  }
  return err instanceof Error ? err.message : fallback;
}

const CATEGORIES = [
  { label: "General", value: "general" },
  { label: "Grocery", value: "grocery" },
  { label: "Fruits & Veg", value: "fruits_veg" },
  { label: "Dairy", value: "dairy" },
  { label: "Bakery", value: "bakery" },
  { label: "Beverages", value: "beverages" },
  { label: "Snacks", value: "snacks" },
  { label: "Personal Care", value: "personal_care" },
  { label: "Household", value: "household" },
  { label: "Medicines", value: "medicines" },
  { label: "Electronics", value: "electronics" },
  { label: "Clothing", value: "clothing" },
  { label: "Other", value: "other" },
];

const EMPTY_FORM: ProductForm = {
  name: "",
  category: "general",
  price: "",
  originalPrice: "",
  stock: 1,
  description: "",
  imageUri: null,
  additionalImageUris: [],
};

const MAX_TOTAL_IMAGE_CHARS = 850_000;

async function compressAssetToDataUrl(
  asset: ImagePicker.ImagePickerAsset,
  kind: "primary" | "additional"
): Promise<string | null> {
  const targetWidth = kind === "primary" ? 720 : 600;
  const compress = kind === "primary" ? 0.32 : 0.26;

  const manipResult = await ImageManipulator.manipulateAsync(
    asset.uri,
    [{ resize: { width: targetWidth } }],
    {
      compress,
      format: ImageManipulator.SaveFormat.JPEG,
      base64: true,
    }
  );

  return toDataUrl(manipResult.base64, "image/jpeg");
}

function getTotalImageChars(values: string[]) {
  return values.reduce((sum, value) => sum + value.length, 0);
}

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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);

  useEffect(() => {
    loadProducts().catch(() => null);
  }, [loadProducts]);

  const filteredProducts = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return products.filter(
      (item) =>
        (item.name ?? "").toLowerCase().includes(q) ||
        (item.category ?? "").toLowerCase().includes(q)
    );
  }, [products, searchQuery]);

  const resetForm = useCallback(() => {
    setForm(EMPTY_FORM);
  }, []);

  const pickImage = useCallback(async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission Required", "Please allow access to your photo library to add a product image.");
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.9,
      });
      if (!result.canceled && result.assets.length > 0) {
        const asset = result.assets[0];
        const compressedDataUrl = await compressAssetToDataUrl(asset, "primary");
        if (!compressedDataUrl) {
          Alert.alert("Image Error", "Could not process this image. Please try another photo.");
          return;
        }
        setForm((prev) => ({
          ...prev,
          imageUri: compressedDataUrl,
        }));
      }
    } catch {
      Alert.alert("Error", "Failed to pick image.");
    }
  }, []);

  const takePhoto = useCallback(async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission Required", "Please allow camera access to take a photo.");
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.9,
      });
      if (!result.canceled && result.assets.length > 0) {
        const asset = result.assets[0];
        const compressedDataUrl = await compressAssetToDataUrl(asset, "primary");
        if (!compressedDataUrl) {
          Alert.alert("Image Error", "Could not process this image. Please try another photo.");
          return;
        }
        setForm((prev) => ({
          ...prev,
          imageUri: compressedDataUrl,
        }));
      }
    } catch {
      Alert.alert("Error", "Failed to take photo.");
    }
  }, []);

  const showImageOptions = useCallback(() => {
    Alert.alert("Add Product Image", "Choose an option", [
      { text: "Camera", onPress: takePhoto },
      { text: "Photo Library", onPress: pickImage },
      { text: "Cancel", style: "cancel" },
    ]);
  }, [pickImage, takePhoto]);

  const pickAdditionalImage = useCallback(async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission Required", "Please allow access to your photo library.");
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.9,
      });
      if (!result.canceled && result.assets.length > 0) {
        const asset = result.assets[0];
        const compressedDataUrl = await compressAssetToDataUrl(asset, "additional");
        if (!compressedDataUrl) {
          Alert.alert("Image Error", "Could not process this image. Please try another photo.");
          return;
        }
        setForm((prev) => {
          const nextImages = [
            ...prev.additionalImageUris,
            compressedDataUrl,
          ].slice(0, 3);
          return {
            ...prev,
            additionalImageUris: nextImages,
          };
        });
      }
    } catch {
      Alert.alert("Error", "Failed to pick image.");
    }
  }, []);

  const takeAdditionalPhoto = useCallback(async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission Required", "Please allow camera access.");
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.9,
      });
      if (!result.canceled && result.assets.length > 0) {
        const asset = result.assets[0];
        const compressedDataUrl = await compressAssetToDataUrl(asset, "additional");
        if (!compressedDataUrl) {
          Alert.alert("Image Error", "Could not process this image. Please try another photo.");
          return;
        }
        setForm((prev) => {
          const nextImages = [
            ...prev.additionalImageUris,
            compressedDataUrl,
          ].slice(0, 3);
          return {
            ...prev,
            additionalImageUris: nextImages,
          };
        });
      }
    } catch {
      Alert.alert("Error", "Failed to take photo.");
    }
  }, []);

  const showAdditionalImageOptions = useCallback(() => {
    Alert.alert("Add Additional Photo", "Choose an option", [
      { text: "Camera", onPress: takeAdditionalPhoto },
      { text: "Photo Library", onPress: pickAdditionalImage },
      { text: "Cancel", style: "cancel" },
    ]);
  }, [pickAdditionalImage, takeAdditionalPhoto]);

  const removeAdditionalImage = useCallback((index: number) => {
    setForm((prev) => ({
      ...prev,
      additionalImageUris: prev.additionalImageUris.filter((_, i) => i !== index),
    }));
  }, []);

  const handleCreate = useCallback(async () => {
    if (!form.imageUri) {
      Alert.alert("Missing Image", "Please add a product photo.");
      return;
    }
    if (!form.name.trim()) {
      Alert.alert("Missing Field", "Product name is required.");
      return;
    }
    if (!form.price.trim()) {
      Alert.alert("Missing Field", "Price is required.");
      return;
    }

    const price = parseFloat(form.price);
    const originalPrice = form.originalPrice.trim() ? parseFloat(form.originalPrice) : undefined;

    if (Number.isNaN(price) || price <= 0) {
      Alert.alert("Invalid Input", "Please enter a valid price.");
      return;
    }
    if (originalPrice !== undefined && (Number.isNaN(originalPrice) || originalPrice <= 0)) {
      Alert.alert("Invalid Input", "Please enter a valid original price.");
      return;
    }
    if (form.stock < 0) {
      Alert.alert("Invalid Input", "Stock cannot be negative.");
      return;
    }

    setIsSubmitting(true);
    try {
      const imageUrls = form.imageUri ? [form.imageUri, ...form.additionalImageUris] : [];
      const totalImageChars = getTotalImageChars(imageUrls);
      if (totalImageChars > MAX_TOTAL_IMAGE_CHARS) {
        Alert.alert(
          "Image Too Large",
          "Selected photos are too heavy. Please keep one image or choose lower-resolution photos."
        );
        setIsSubmitting(false);
        return;
      }

      await createProduct({
        name: form.name.trim(),
        category: form.category || "general",
        description: form.description.trim() || undefined,
        price,
        originalPrice,
        stock: form.stock,
        status: "active",
        imageUrls,
      });
      setShowCreateModal(false);
      resetForm();
    } catch (err) {
      const msg = extractRequestError(err, "Failed to create product. Please try again.");
      Alert.alert("Create Failed", msg);
    } finally {
      setIsSubmitting(false);
    }
  }, [form, createProduct, resetForm]);

  const handleDelete = useCallback((productId: string | undefined, productName: string) => {
    if (!productId) {
      Alert.alert("Error", "Cannot delete this product — it has no valid ID. Please refresh the page and try again.");
      return;
    }
    Alert.alert("Delete Product", `Are you sure you want to delete "${productName}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await removeProductById(productId);
          } catch (err) {
            const msg =
              err instanceof Error ? err.message : "Failed to delete product.";
            Alert.alert("Delete Failed", msg);
          }
        },
      },
    ]);
  }, [removeProductById]);

  const toggleStatus = useCallback(async (item: Product) => {
    const nextStatus = item.status === "active" ? "inactive" : "active";
    try {
      await editProduct(item.id, { status: nextStatus });
    } catch {
      Alert.alert("Error", "Failed to update product status.");
    }
  }, [editProduct]);

  const toggleAvailableToday = useCallback(async (item: Product) => {
    try {
      await editProduct(item.id, { availableToday: !item.availableToday });
    } catch {
      Alert.alert("Error", "Failed to update availability.");
    }
  }, [editProduct]);

  const renderItem = ({ item }: { item: Product }) => {
    const approval = item.approvalStatus ?? "pending";
    const isApproved = approval === "approved";

    const approvalBg =
      approval === "approved" ? "#DCFCE7" :
      approval === "rejected" ? "#FEE2E2" : "#FEF9C3";
    const approvalColor =
      approval === "approved" ? "#16A34A" :
      approval === "rejected" ? "#DC2626" : "#B45309";
    const approvalIcon =
      approval === "approved" ? "✓" :
      approval === "rejected" ? "✗" : "⏳";
    const approvalLabel =
      approval === "approved" ? "Admin Approved" :
      approval === "rejected" ? "Rejected by Admin" : "Pending Approval";

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
                <Text style={styles.thumbPlaceholderText}>📦</Text>
              </View>
            )}
            {discount !== null && (
              <View style={styles.discountBadge}>
                <Text style={styles.discountBadgeText}>{discount}% off</Text>
              </View>
            )}
          </View>

          <View style={styles.cardInfo}>
            <Text style={styles.productName} numberOfLines={2}>{item.name ?? "—"}</Text>
            <View style={styles.categoryChip}>
              <Text style={styles.categoryChipText}>{item.category ?? "general"}</Text>
            </View>
            <View style={styles.priceRow}>
              <Text style={styles.productPrice}>₹{price}</Text>
              {originalPrice && originalPrice > price ? (
                <Text style={styles.originalPrice}>₹{originalPrice}</Text>
              ) : null}
            </View>
            <Text style={styles.stockText}>
              Stock: <Text style={(item.stock ?? 0) > 0 ? styles.stockGood : styles.stockOut}>{item.stock ?? 0}</Text>
            </Text>
          </View>
        </View>

        {/* Admin approval status */}
        <View style={[styles.approvalBanner, { backgroundColor: approvalBg }]}>
          <Text style={[styles.approvalIcon, { color: approvalColor }]}>{approvalIcon}</Text>
          <View style={{ flex: 1 }}>
            <Text style={[styles.approvalLabel, { color: approvalColor }]}>{approvalLabel}</Text>
            {approval === "rejected" && item.approvalNote ? (
              <Text style={styles.approvalNote}>Reason: {item.approvalNote}</Text>
            ) : null}
            {approval === "pending" ? (
              <Text style={styles.approvalNote}>Waiting for admin review</Text>
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
                {item.availableToday ? "Available Today" : "Unavailable Today"}
              </Text>
              <Text style={styles.availHint}>Tap to toggle for today</Text>
            </View>
            <View style={[styles.availPill, { backgroundColor: item.availableToday ? "#22C55E" : "#CBD5E1" }]}>
              <Text style={styles.availPillText}>{item.availableToday ? "ON" : "OFF"}</Text>
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
                {item.status === "active" ? "Set Inactive" : "Set Active"}
              </Text>
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity
            style={[styles.actionBtn, styles.deleteBtn]}
            onPress={() => handleDelete(item.id, item.name)}
          >
            <Text style={styles.deleteBtnText}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

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
          placeholder="Search products…"
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
              <Text style={styles.emptyEmoji}>📦</Text>
              <Text style={styles.emptyTitle}>No products yet</Text>
              <Text style={styles.emptySubtitle}>
                Tap "+ Add" to add your first product.
              </Text>
              <TouchableOpacity
                style={styles.emptyAddBtn}
                onPress={() => setShowCreateModal(true)}
              >
                <Text style={styles.emptyAddBtnText}>+ Add Product</Text>
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
        onRequestClose={() => {
          if (!isSubmitting) {
            setShowCreateModal(false);
            resetForm();
          }
        }}
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
                onPress={() => {
                  if (!isSubmitting) {
                    setShowCreateModal(false);
                    resetForm();
                  }
                }}
                style={styles.modalCloseBtn}
                disabled={isSubmitting}
              >
                <Text style={styles.modalCloseBtnText}>✕</Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Add Product</Text>
              <TouchableOpacity
                style={[styles.modalSaveBtn, isSubmitting && styles.modalSaveBtnDisabled]}
                onPress={handleCreate}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalSaveBtnText}>Save</Text>
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
                  Product Photo <Text style={styles.required}>*</Text>
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
                        <Text style={styles.imageOverlayText}>Change Photo</Text>
                      </View>
                    </>
                  ) : (
                    <View style={styles.imagePlaceholder}>
                      <Text style={styles.imagePlaceholderIcon}>📷</Text>
                      <Text style={styles.imagePlaceholderText}>Add Product Photo</Text>
                      <Text style={styles.imagePlaceholderSub}>Required · tap to choose from library or camera</Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>

              {/* Additional Images (optional, max 3) */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>
                  Additional Photos{" "}
                  <Text style={styles.optional}>(optional, max 3)</Text>
                </Text>
                <View style={styles.additionalImagesRow}>
                  {form.additionalImageUris.map((uri, idx) => (
                    <View key={idx} style={styles.additionalThumbWrap}>
                      <Image source={{ uri }} style={styles.additionalThumb} />
                      <TouchableOpacity
                        style={styles.additionalRemoveBtn}
                        onPress={() => removeAdditionalImage(idx)}
                      >
                        <Text style={styles.additionalRemoveBtnText}>✕</Text>
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
                      <Text style={styles.additionalAddText}>Add</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              {/* Product Name */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Product Name <Text style={styles.required}>*</Text></Text>
                <TextInput
                  style={styles.input}
                  value={form.name}
                  onChangeText={(v) => setForm((p) => ({ ...p, name: v }))}
                  placeholder="e.g. Amul Butter 500g"
                  placeholderTextColor="#94A3B8"
                  returnKeyType="next"
                  maxLength={100}
                />
              </View>

              {/* Category dropdown */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Category</Text>
                <TouchableOpacity
                  style={styles.dropdownTrigger}
                  onPress={() => setShowCategoryDropdown((v) => !v)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.dropdownTriggerText}>
                    {CATEGORIES.find((c) => c.value === form.category)?.label ?? "Select category"}
                  </Text>
                  <Text style={styles.dropdownArrow}>{showCategoryDropdown ? "▲" : "▼"}</Text>
                </TouchableOpacity>
                {showCategoryDropdown && (
                  <View style={styles.dropdownList}>
                    {CATEGORIES.map((cat, idx) => (
                      <TouchableOpacity
                        key={cat.value}
                        style={[
                          styles.dropdownItem,
                          form.category === cat.value && styles.dropdownItemSelected,
                          idx === CATEGORIES.length - 1 && { borderBottomWidth: 0 },
                        ]}
                        onPress={() => {
                          setForm((p) => ({ ...p, category: cat.value }));
                          setShowCategoryDropdown(false);
                        }}
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

              {/* Price row */}
              <View style={styles.priceFieldRow}>
                <View style={[styles.fieldGroup, { flex: 1 }]}>
                  <Text style={styles.fieldLabel}>Price (₹) <Text style={styles.required}>*</Text></Text>
                  <View style={styles.priceInputWrap}>
                    <Text style={styles.pricePrefix}>₹</Text>
                    <TextInput
                      style={styles.priceInput}
                      value={form.price}
                      onChangeText={(v) => setForm((p) => ({ ...p, price: v }))}
                      placeholder="0.00"
                      placeholderTextColor="#94A3B8"
                      keyboardType="decimal-pad"
                      returnKeyType="next"
                    />
                  </View>
                </View>
                <View style={{ width: 12 }} />
                <View style={[styles.fieldGroup, { flex: 1 }]}>
                  <Text style={styles.fieldLabel}>MRP (₹)</Text>
                  <View style={styles.priceInputWrap}>
                    <Text style={styles.pricePrefix}>₹</Text>
                    <TextInput
                      style={styles.priceInput}
                      value={form.originalPrice}
                      onChangeText={(v) => setForm((p) => ({ ...p, originalPrice: v }))}
                      placeholder="0.00"
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
                    🏷️ {Math.round(((parseFloat(form.originalPrice) - parseFloat(form.price)) / parseFloat(form.originalPrice)) * 100)}% off — customers see a deal badge!
                  </Text>
                </View>
              ) : null}

              {/* Stock counter */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Stock Quantity</Text>
                {/* Main −1 / value / +1 row */}
                <View style={styles.counterRow}>
                  <TouchableOpacity
                    style={[styles.counterBtn, form.stock <= 0 && styles.counterBtnDisabled]}
                    onPress={() => setForm((p) => ({ ...p, stock: Math.max(0, p.stock - 1) }))}
                    disabled={form.stock <= 0}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.counterBtnText}>−</Text>
                  </TouchableOpacity>
                  <TextInput
                    style={styles.counterInput}
                    value={String(form.stock)}
                    onChangeText={(v) => {
                      const n = parseInt(v, 10);
                      setForm((p) => ({ ...p, stock: Number.isNaN(n) ? 0 : Math.max(0, n) }));
                    }}
                    keyboardType="number-pad"
                    selectTextOnFocus
                  />
                  <TouchableOpacity
                    style={styles.counterBtn}
                    onPress={() => setForm((p) => ({ ...p, stock: p.stock + 1 }))}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.counterBtnText}>+</Text>
                  </TouchableOpacity>
                </View>
                {/* Quick-add jump buttons */}
                <View style={styles.quickAddRow}>
                  <Text style={styles.quickAddLabel}>Quick add:</Text>
                  {[5, 10, 25, 50].map((n) => (
                    <TouchableOpacity
                      key={n}
                      style={styles.quickAddBtn}
                      onPress={() => setForm((p) => ({ ...p, stock: p.stock + n }))}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.quickAddBtnText}>+{n}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Description */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Description</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={form.description}
                  onChangeText={(v) => setForm((p) => ({ ...p, description: v }))}
                  placeholder="Describe your product (optional)"
                  placeholderTextColor="#94A3B8"
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                  maxLength={500}
                />
                <Text style={styles.charCount}>{form.description.length}/500</Text>
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
                  <Text style={styles.saveBtnText}>Save Product</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </SafeAreaView>
        </KeyboardAvoidingView>
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
    paddingBottom: 30,
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
