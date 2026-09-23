import { Modal, StyleSheet, Text, TouchableOpacity, View } from "react-native";

interface AppAlertModalProps {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel?: () => void;
}

export function AppAlertModal({
  visible,
  title,
  message,
  confirmLabel = "OK",
  cancelLabel = "Cancel",
  destructive = false,
  onConfirm,
  onCancel,
}: AppAlertModalProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel ?? onConfirm}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>
          <View style={styles.actions}>
            {onCancel ? (
              <TouchableOpacity style={[styles.button, styles.cancelButton]} onPress={onCancel}>
                <Text style={styles.cancelText}>{cancelLabel}</Text>
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity
              style={[styles.button, destructive ? styles.destructiveButton : styles.confirmButton]}
              onPress={onConfirm}
            >
              <Text style={styles.confirmText}>{confirmLabel}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.55)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  card: { width: "100%", maxWidth: 420, backgroundColor: "#FFFFFF", borderRadius: 18, padding: 20 },
  title: { color: "#0F172A", fontSize: 18, fontWeight: "700", marginBottom: 8 },
  message: { color: "#475569", fontSize: 14, lineHeight: 21 },
  actions: { flexDirection: "row", justifyContent: "flex-end", gap: 10, marginTop: 20 },
  button: { minWidth: 88, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 11, alignItems: "center" },
  cancelButton: { backgroundColor: "#F1F5F9" },
  confirmButton: { backgroundColor: "#084C3D" },
  destructiveButton: { backgroundColor: "#B91C1C" },
  cancelText: { color: "#334155", fontSize: 13, fontWeight: "700" },
  confirmText: { color: "#FFFFFF", fontSize: 13, fontWeight: "700" },
});
