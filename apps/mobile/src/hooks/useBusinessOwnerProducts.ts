import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert } from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBusinessOwner } from "@hooks/useBusinessOwner";
import { Product, ProductAttribute } from "@/types";
import { type ProductUnit } from "@utils/helpers";
import {
  type CategoryMetadata,
  getCategoryMetadata,
  getCategoriesForBusinessType,
} from "@utils/categoryMetadata";
import content from "@/content/boProducts.json";

export interface ProductAttributeForm {
  name: string;
  values: string[];
}

export interface ProductForm {
  name: string;
  category: string;
  menuSection: string;
  isVeg: boolean;
  price: string;
  originalPrice: string;
  stock: number;
  stockText: string;
  unit: ProductUnit;
  unitStep: string;
  description: string;
  imageUri: string | null;
  additionalImageUris: string[];
  attributes: ProductAttributeForm[];
}

const EMPTY_FORM: ProductForm = {
  name: "",
  category: "general",
  menuSection: "",
  isVeg: true,
  price: "",
  originalPrice: "",
  stock: 1,
  stockText: "0",
  unit: "piece",
  unitStep: "1",
  description: "",
  imageUri: null,
  additionalImageUris: [],
  attributes: [],
};

const MAX_TOTAL_IMAGE_CHARS = 850_000;

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

export type { CategoryMetadata };

function getDefaultFormForBusinessType(businessCategory?: string): ProductForm {
  const categories = getCategoriesForBusinessType(businessCategory);
  const firstCategory = categories.find((c) => c.value !== "general" && c.value !== "other") ?? categories[0];
  if (!firstCategory) return EMPTY_FORM;
  return applyCategoryDefaults(EMPTY_FORM, firstCategory);
}

function applyCategoryDefaults(form: ProductForm, metadata: CategoryMetadata): ProductForm {
  return {
    ...form,
    category: metadata.value,
    unit: metadata.defaultUnit,
    unitStep: content.defaultUnitSteps[metadata.defaultUnit],
    isVeg: metadata.supportsDietary ? form.isVeg : true,
    menuSection: metadata.supportsMenuSection ? form.menuSection : "",
    attributes: metadata.supportsAttributes ? (metadata.defaultAttributes ? [...metadata.defaultAttributes] : []) : [],
  };
}

function getApprovalMeta(status: string) {
  const bg =
    status === "approved" ? "#E4F3EA" :
    status === "rejected" ? "#FEE2E2" : "#FEF9C3";
  const color =
    status === "approved" ? "#084C3D" :
    status === "rejected" ? "#DC2626" : "#B45309";
  const icon =
    status === "approved" ? "✓" :
    status === "rejected" ? "✗" : "⏳";
  const label =
    status === "approved" ? content.card.approvalLabels.approved :
    status === "rejected" ? content.card.approvalLabels.rejected : content.card.approvalLabels.pending;

  return { bg, color, icon, label };
}

/**
 * Encapsulates all logic for the business owner products screen: product list,
 * search, create modal, image compression, form state, and product lifecycle
 * actions.
 */
export const useBusinessOwnerProducts = () => {
  const {
    products,
    businessProfile,
    isLoading,
    loadProducts,
    createProduct,
    editProduct,
    removeProductById,
  } = useBusinessOwner();

  const businessCategory = businessProfile?.category;

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [form, setForm] = useState<ProductForm>(EMPTY_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Clear validation error as soon as the user starts editing any field.
  useEffect(() => {
    if (formError) setFormError(null);
  }, [form]);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const lastRefreshedAt = useRef<number>(0);
  const insets = useSafeAreaInsets();

  const markRefreshed = useCallback(() => {
    lastRefreshedAt.current = Date.now();
  }, []);

  const refreshIfStale = useCallback(
    async (staleMs = 30000) => {
      if (Date.now() - lastRefreshedAt.current > staleMs) {
        try {
          await loadProducts();
          markRefreshed();
        } catch {
          /* error already handled in loadProducts */
        }
      }
    },
    [loadProducts, markRefreshed]
  );

  useEffect(() => {
    loadProducts()
      .then(markRefreshed)
      .catch(() => null);
  }, [loadProducts, markRefreshed]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadProducts();
      markRefreshed();
    } catch {
      /* error already handled in loadProducts */
    } finally {
      setRefreshing(false);
    }
  }, [loadProducts, markRefreshed]);

  const filteredProducts = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return products.filter(
      (item) =>
        (statusFilter === "all" || item.status === statusFilter) &&
        ((item.name ?? "").toLowerCase().includes(q) ||
          (item.category ?? "").toLowerCase().includes(q))
    );
  }, [products, searchQuery, statusFilter]);

  const resetForm = useCallback(() => {
    setForm(getDefaultFormForBusinessType(businessCategory));
    setEditingProductId(null);
    setFormError(null);
  }, [businessCategory]);

  const openCreateModal = useCallback(() => {
    resetForm();
    setShowCreateModal(true);
  }, [resetForm]);

  const openEditModal = useCallback((product: Product) => {
    const categoryMeta = getCategoryMetadata(product.category ?? "general");
    setEditingProductId(product.id);
    setFormError(null);
    setForm({
      name: product.name ?? "",
      category: product.category ?? "general",
      menuSection: product.menuSection ?? "",
      isVeg: product.isVeg !== false,
      price: String(product.price ?? ""),
      originalPrice: product.originalPrice ? String(product.originalPrice) : "",
      stock: product.stock ?? 0,
      stockText: String(product.stock ?? 0),
      unit: (product.unit as ProductUnit) ?? categoryMeta?.defaultUnit ?? "piece",
      unitStep: String(product.unitStep ?? content.defaultUnitSteps[(product.unit as ProductUnit) ?? "piece"] ?? 1),
      description: product.description ?? "",
      imageUri: product.imageUrls?.[0] ?? null,
      additionalImageUris: product.imageUrls?.slice(1, 4) ?? [],
      attributes: groupProductAttributes(product.attributes),
    });
    setShowCreateModal(true);
  }, []);

  function groupProductAttributes(attrs?: ProductAttribute[]): ProductAttributeForm[] {
    if (!attrs) return [];
    const map = new Map<string, string[]>();
    for (const attr of attrs) {
      const values = map.get(attr.name) ?? [];
      values.push(attr.value);
      map.set(attr.name, values);
    }
    return Array.from(map.entries()).map(([name, values]) => ({ name, values }));
  }

  const closeModal = useCallback(() => {
    if (!isSubmitting) {
      setShowCreateModal(false);
      resetForm();
    }
  }, [isSubmitting, resetForm]);

  const pickImage = useCallback(async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(content.alerts.permissionLibraryTitle, content.alerts.permissionLibraryMsg);
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
          Alert.alert(content.alerts.imageErrorTitle, content.alerts.imageErrorMsg);
          return;
        }
        setForm((prev) => ({ ...prev, imageUri: compressedDataUrl }));
      }
    } catch {
      Alert.alert(content.alerts.errorTitle, content.alerts.genericImageError);
    }
  }, []);

  const takePhoto = useCallback(async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(content.alerts.permissionCameraTitle, content.alerts.permissionCameraMsg);
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
          Alert.alert(content.alerts.imageErrorTitle, content.alerts.imageErrorMsg);
          return;
        }
        setForm((prev) => ({ ...prev, imageUri: compressedDataUrl }));
      }
    } catch {
      Alert.alert(content.alerts.errorTitle, content.alerts.genericPhotoError);
    }
  }, []);

  const showImageOptions = useCallback(() => {
    Alert.alert(content.alerts.imageOptionsTitle, content.alerts.imageOptionsMsg, [
      { text: content.alerts.camera, onPress: takePhoto },
      { text: content.alerts.photoLibrary, onPress: pickImage },
      { text: content.alerts.cancel, style: "cancel" },
    ]);
  }, [pickImage, takePhoto]);

  const pickAdditionalImage = useCallback(async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(content.alerts.permissionLibraryTitle, content.alerts.permissionAdditionalLibraryMsg);
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
          Alert.alert(content.alerts.imageErrorTitle, content.alerts.imageErrorMsg);
          return;
        }
        setForm((prev) => ({
          ...prev,
          additionalImageUris: [...prev.additionalImageUris, compressedDataUrl].slice(0, 3),
        }));
      }
    } catch {
      Alert.alert(content.alerts.errorTitle, content.alerts.genericImageError);
    }
  }, []);

  const takeAdditionalPhoto = useCallback(async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(content.alerts.permissionCameraTitle, content.alerts.permissionAdditionalCameraMsg);
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
          Alert.alert(content.alerts.imageErrorTitle, content.alerts.imageErrorMsg);
          return;
        }
        setForm((prev) => ({
          ...prev,
          additionalImageUris: [...prev.additionalImageUris, compressedDataUrl].slice(0, 3),
        }));
      }
    } catch {
      Alert.alert(content.alerts.errorTitle, content.alerts.genericPhotoError);
    }
  }, []);

  const showAdditionalImageOptions = useCallback(() => {
    Alert.alert(content.alerts.additionalImageOptionsTitle, content.alerts.imageOptionsMsg, [
      { text: content.alerts.camera, onPress: takeAdditionalPhoto },
      { text: content.alerts.photoLibrary, onPress: pickAdditionalImage },
      { text: content.alerts.cancel, style: "cancel" },
    ]);
  }, [pickAdditionalImage, takeAdditionalPhoto]);

  const removeAdditionalImage = useCallback((index: number) => {
    setForm((prev) => ({
      ...prev,
      additionalImageUris: prev.additionalImageUris.filter((_, i) => i !== index),
    }));
  }, []);

  const setCategory = useCallback((value: string) => {
    const meta = getCategoryMetadata(value);
    if (!meta) {
      setForm((p) => ({ ...p, category: value }));
      setShowCategoryDropdown(false);
      return;
    }
    setForm((p) => applyCategoryDefaults({ ...p, category: value }, meta));
    setShowCategoryDropdown(false);
  }, []);

  const setUnit = useCallback((unit: ProductUnit) => {
    const newStep = content.defaultUnitSteps[unit];
    setForm((p) => ({
      ...p,
      unit,
      unitStep: newStep,
      stockText: "0",
    }));
  }, []);

  const setUnitStep = useCallback((value: string) => {
    setForm((p) => ({ ...p, unitStep: value }));
  }, []);

  const decrementStock = useCallback(() => {
    setForm((p) => ({ ...p, stock: Math.max(0, p.stock - 1) }));
  }, []);

  const incrementStock = useCallback(() => {
    setForm((p) => ({ ...p, stock: p.stock + 1 }));
  }, []);

  const setStockFromText = useCallback((value: string) => {
    const n = parseInt(value, 10);
    setForm((p) => ({ ...p, stock: Number.isNaN(n) ? 0 : Math.max(0, n) }));
  }, []);

  const setStockText = useCallback((value: string) => {
    setForm((p) => ({ ...p, stockText: value, stock: parseFloat(value) || 0 }));
  }, []);

  const quickAddStock = useCallback((amount: number) => {
    setForm((p) => ({ ...p, stock: p.stock + amount }));
  }, []);

  const addAttribute = useCallback(() => {
    setForm((p) => ({ ...p, attributes: [...p.attributes, { name: "", values: [""] }] }));
  }, []);

  const removeAttribute = useCallback((index: number) => {
    setForm((p) => ({ ...p, attributes: p.attributes.filter((_, i) => i !== index) }));
  }, []);

  const setAttributeName = useCallback((index: number, name: string) => {
    setForm((p) => {
      const next = [...p.attributes];
      next[index] = { ...next[index], name };
      return { ...p, attributes: next };
    });
  }, []);

  const addAttributeValue = useCallback((index: number) => {
    setForm((p) => {
      const next = [...p.attributes];
      next[index] = { ...next[index], values: [...next[index].values, ""] };
      return { ...p, attributes: next };
    });
  }, []);

  const removeAttributeValue = useCallback((attrIndex: number, valueIndex: number) => {
    setForm((p) => {
      const next = [...p.attributes];
      next[attrIndex] = {
        ...next[attrIndex],
        values: next[attrIndex].values.filter((_, i) => i !== valueIndex),
      };
      return { ...p, attributes: next };
    });
  }, []);

  const setAttributeValue = useCallback((attrIndex: number, valueIndex: number, value: string) => {
    setForm((p) => {
      const next = [...p.attributes];
      const values = [...next[attrIndex].values];
      values[valueIndex] = value;
      next[attrIndex] = { ...next[attrIndex], values };
      return { ...p, attributes: next };
    });
  }, []);

  const handleCreate = useCallback(async () => {
    if (!form.imageUri && form.additionalImageUris.length === 0) {
      setFormError(content.alerts.missingImageMsg);
      return;
    }
    if (!form.name.trim()) {
      setFormError(content.alerts.missingNameMsg);
      return;
    }
    if (!form.price.trim()) {
      setFormError(content.alerts.missingPriceMsg);
      return;
    }

    if (form.unit !== "piece") {
      const step = parseFloat(form.unitStep);
      if (!step || step <= 0) {
        setFormError(content.alerts.missingUnitStepMsg);
        return;
      }
    }

    const price = parseFloat(form.price);
    const originalPrice = form.originalPrice.trim() ? parseFloat(form.originalPrice) : undefined;

    if (Number.isNaN(price) || price <= 0) {
      setFormError(content.alerts.invalidPriceMsg);
      return;
    }
    if (originalPrice !== undefined && (Number.isNaN(originalPrice) || originalPrice <= 0)) {
      setFormError(content.alerts.invalidOriginalPriceMsg);
      return;
    }

    const stockNum = form.unit === "piece" ? form.stock : parseFloat(form.stockText) || 0;
    if (stockNum < 0) {
      setFormError(content.alerts.invalidStockMsg);
      return;
    }

    setFormError(null);
    setIsSubmitting(true);
    try {
      const imageUrls = form.imageUri
        ? [form.imageUri, ...form.additionalImageUris]
        : [...form.additionalImageUris];
      const totalImageChars = getTotalImageChars(imageUrls);
      if (totalImageChars > MAX_TOTAL_IMAGE_CHARS) {
        Alert.alert(content.alerts.imageTooLargeTitle, content.alerts.imageTooLargeMsg);
        setIsSubmitting(false);
        return;
      }

      const attributes: ProductAttribute[] = [];
      const meta = getCategoryMetadata(form.category);
      if (meta?.supportsAttributes) {
        for (const attr of form.attributes) {
          const name = attr.name.trim();
          if (!name) continue;
          for (const value of attr.values) {
            if (value.trim()) attributes.push({ name, value: value.trim() });
          }
        }
      }

      const productData: Partial<Product> = {
        name: form.name.trim(),
        category: form.category || "general",
        menuSection: meta?.supportsMenuSection ? form.menuSection.trim() || undefined : undefined,
        isVeg: meta?.supportsDietary ? form.isVeg : undefined,
        description: form.description.trim() || undefined,
        price,
        originalPrice,
        stock: stockNum,
        unit: form.unit !== "piece" ? form.unit : undefined,
        unitStep: form.unit !== "piece" ? parseFloat(form.unitStep) || undefined : undefined,
        status: "active" as const,
        imageUrls,
        attributes: attributes.length > 0 ? attributes : undefined,
      };
      if (editingProductId) {
        await editProduct(editingProductId, productData);
      } else {
        await createProduct(productData);
      }
      setShowCreateModal(false);
      resetForm();
    } catch (err) {
      const msg = extractRequestError(err, content.alerts.createFailedFallback);
      setFormError(msg);
    } finally {
      setIsSubmitting(false);
    }
  }, [form, createProduct, editProduct, editingProductId, resetForm]);

  const handleDelete = useCallback((productId: string | undefined, productName: string) => {
    if (!productId) {
      Alert.alert(content.alerts.deleteErrorTitle, content.alerts.deleteNoIdMsg);
      return;
    }
    setDeleteTarget({ id: productId, name: productName });
  }, []);

  const confirmDelete = useCallback(async () => {
    if (!deleteTarget) return;
    try {
      await removeProductById(deleteTarget.id);
      setDeleteTarget(null);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : content.alerts.deleteFailedFallback);
      setDeleteTarget(null);
    }
  }, [deleteTarget, removeProductById]);

  const toggleStatus = useCallback(async (item: Product) => {
    const nextStatus = item.status === "active" ? "inactive" : "active";
    try {
      await editProduct(item.id, { status: nextStatus });
    } catch {
      Alert.alert(content.alerts.errorTitle, content.alerts.toggleStatusFailed);
    }
  }, [editProduct]);

  const toggleAvailableToday = useCallback(async (item: Product) => {
    try {
      await editProduct(item.id, { availableToday: !item.availableToday });
    } catch {
      Alert.alert(content.alerts.errorTitle, content.alerts.toggleAvailabilityFailed);
    }
  }, [editProduct]);

  const setFormField = useCallback(<K extends keyof ProductForm>(field: K, value: ProductForm[K]) => {
    setForm((p) => ({ ...p, [field]: value }));
  }, []);

  return {
    products,
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
    cancelDelete: () => setDeleteTarget(null),
    confirmDelete,
    form,
    isSubmitting,
    showCategoryDropdown,
    setShowCategoryDropdown,
    insets,
    refreshing,
    onRefresh,
    refreshIfStale,
    loadProducts,
    content,
    businessCategory,
    closeModal,
    resetForm,
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
    addAttribute,
    removeAttribute,
    setAttributeName,
    addAttributeValue,
    removeAttributeValue,
    setAttributeValue,
    getCategoryMetadata,
    getCategoriesForBusinessType,
    getApprovalMeta,
  };
};
