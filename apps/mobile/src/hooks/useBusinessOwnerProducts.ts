import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert } from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBusinessOwner } from "@hooks/useBusinessOwner";
import { Product } from "@/types";
import { type ProductUnit } from "@utils/helpers";
import content from "@/content/boProducts.json";

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

function getCategoryLabel(value: string) {
  return content.categories.find((c) => c.value === value)?.label ?? content.modal.categoryPlaceholder;
}

function getApprovalMeta(status: string) {
  const bg =
    status === "approved" ? "#DCFCE7" :
    status === "rejected" ? "#FEE2E2" : "#FEF9C3";
  const color =
    status === "approved" ? "#16A34A" :
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
        (item.name ?? "").toLowerCase().includes(q) ||
        (item.category ?? "").toLowerCase().includes(q)
    );
  }, [products, searchQuery]);

  const resetForm = useCallback(() => {
    setForm(EMPTY_FORM);
  }, []);

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
    setForm((p) => ({ ...p, category: value }));
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

  const handleCreate = useCallback(async () => {
    if (!form.imageUri && form.additionalImageUris.length === 0) {
      Alert.alert(content.alerts.missingImageTitle, content.alerts.missingImageMsg);
      return;
    }
    if (!form.name.trim()) {
      Alert.alert(content.alerts.missingNameTitle, content.alerts.missingNameMsg);
      return;
    }
    if (!form.price.trim()) {
      Alert.alert(content.alerts.missingPriceTitle, content.alerts.missingPriceMsg);
      return;
    }

    if (form.unit !== "piece") {
      const step = parseFloat(form.unitStep);
      if (!step || step <= 0) {
        Alert.alert(content.alerts.missingUnitStepTitle, content.alerts.missingUnitStepMsg);
        return;
      }
    }

    const price = parseFloat(form.price);
    const originalPrice = form.originalPrice.trim() ? parseFloat(form.originalPrice) : undefined;

    if (Number.isNaN(price) || price <= 0) {
      Alert.alert(content.alerts.invalidPriceTitle, content.alerts.invalidPriceMsg);
      return;
    }
    if (originalPrice !== undefined && (Number.isNaN(originalPrice) || originalPrice <= 0)) {
      Alert.alert(content.alerts.invalidPriceTitle, content.alerts.invalidOriginalPriceMsg);
      return;
    }

    const stockNum = form.unit === "piece" ? form.stock : parseFloat(form.stockText) || 0;
    if (stockNum < 0) {
      Alert.alert(content.alerts.invalidPriceTitle, content.alerts.invalidStockMsg);
      return;
    }

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

      await createProduct({
        name: form.name.trim(),
        category: form.category || "general",
        menuSection: form.menuSection.trim() || undefined,
        isVeg: form.isVeg,
        description: form.description.trim() || undefined,
        price,
        originalPrice,
        stock: stockNum,
        unit: form.unit !== "piece" ? form.unit : undefined,
        unitStep: form.unit !== "piece" ? parseFloat(form.unitStep) || undefined : undefined,
        status: "active",
        imageUrls,
      });
      setShowCreateModal(false);
      resetForm();
    } catch (err) {
      const msg = extractRequestError(err, content.alerts.createFailedFallback);
      Alert.alert(content.alerts.createFailedTitle, msg);
    } finally {
      setIsSubmitting(false);
    }
  }, [form, createProduct, resetForm]);

  const handleDelete = useCallback((productId: string | undefined, productName: string) => {
    if (!productId) {
      Alert.alert(content.alerts.deleteErrorTitle, content.alerts.deleteNoIdMsg);
      return;
    }
    Alert.alert(
      content.alerts.deleteConfirmTitle,
      content.alerts.deleteConfirmMsg.replace("{name}", productName),
      [
        { text: content.alerts.cancel, style: "cancel" },
        {
          text: content.alerts.delete,
          style: "destructive",
          onPress: async () => {
            try {
              await removeProductById(productId);
            } catch (err) {
              const msg = err instanceof Error ? err.message : content.alerts.deleteFailedFallback;
              Alert.alert(content.alerts.deleteFailedTitle, msg);
            }
          },
        },
      ]
    );
  }, [removeProductById]);

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
    loadProducts,
    content,
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
    getCategoryLabel,
    getApprovalMeta,
  };
};
