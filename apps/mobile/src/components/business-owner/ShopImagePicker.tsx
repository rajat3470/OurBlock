import { useCallback } from "react";
import { View, Text, Image, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { pickImageFromCamera, pickImageFromLibrary } from "@/utils/imagePicker";

interface ShopImagePickerProps {
  uri: string | null;
  onImageSelected: (dataUrl: string | null) => void;
  loading?: boolean;
  label?: string;
}

export function ShopImagePicker({
  uri,
  onImageSelected,
  loading,
  label = "Shop Image",
}: ShopImagePickerProps) {
  const handleGallery = useCallback(async () => {
    const picked = await pickImageFromLibrary();
    if (picked) onImageSelected(picked.dataUrl);
  }, [onImageSelected]);

  const handleCamera = useCallback(async () => {
    const picked = await pickImageFromCamera();
    if (picked) onImageSelected(picked.dataUrl);
  }, [onImageSelected]);

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.previewContainer}>
        {uri ? (
          <Image source={{ uri }} style={styles.preview} />
        ) : (
          <View style={styles.placeholder}>
            <Ionicons name="storefront-outline" size={40} color="#94A3B8" />
            <Text style={styles.placeholderText}>No image selected</Text>
          </View>
        )}
        {loading ? (
          <View style={styles.overlay}>
            <ActivityIndicator color="#2563EB" />
          </View>
        ) : null}
      </View>

      <View style={styles.buttonRow}>
        <TouchableOpacity style={styles.button} onPress={handleCamera} disabled={loading}>
          <Ionicons name="camera-outline" size={18} color="#2563EB" />
          <Text style={styles.buttonText}>Capture</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.button} onPress={handleGallery} disabled={loading}>
          <Ionicons name="images-outline" size={18} color="#2563EB" />
          <Text style={styles.buttonText}>Gallery</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: "600", color: "#374151", marginBottom: 8 },
  previewContainer: {
    width: "100%",
    height: 180,
    borderRadius: 12,
    backgroundColor: "#F1F5F9",
    overflow: "hidden",
    marginBottom: 10,
  },
  preview: { width: "100%", height: "100%", resizeMode: "cover" },
  placeholder: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  placeholderText: { marginTop: 8, color: "#64748B", fontSize: 13 },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255,255,255,0.7)",
    justifyContent: "center",
    alignItems: "center",
  },
  buttonRow: { flexDirection: "row", gap: 12 },
  button: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },
  buttonText: { color: "#2563EB", fontWeight: "600", fontSize: 14 },
});
