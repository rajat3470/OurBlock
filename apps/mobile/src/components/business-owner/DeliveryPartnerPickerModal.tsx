import {
  View,
  Text,
  StyleSheet,
  Modal,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export type PartnerOption = {
  id: string;
  firstName: string;
  lastName: string;
  phone?: string;
  status?: string;
};

interface DeliveryPartnerPickerModalProps {
  visible: boolean;
  partners: PartnerOption[];
  loading: boolean;
  preselectedId?: string | null;
  onSelect: (partnerId: string) => void;
  onClose: () => void;
}

export function DeliveryPartnerPickerModal({
  visible,
  partners,
  loading,
  preselectedId,
  onSelect,
  onClose,
}: DeliveryPartnerPickerModalProps) {
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
          <View style={styles.handle} />

          <View style={styles.header}>
            <Text style={styles.title}>Assign delivery partner</Text>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.subtitle}>
            Select who will deliver this order
          </Text>

          {loading ? (
            <ActivityIndicator
              size="large"
              color="#16A34A"
              style={styles.loader}
            />
          ) : partners.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyEmoji}>🛵</Text>
              <Text style={styles.emptyTitle}>No delivery partners</Text>
              <Text style={styles.emptySub}>
                Add a delivery partner from Profile → Delivery Partners.
              </Text>
            </View>
          ) : (
            <FlatList
              data={partners}
              keyExtractor={(item) => item.id}
              style={styles.list}
              renderItem={({ item }) => {
                const name =
                  `${item.firstName} ${item.lastName}`.trim() || "Partner";
                const isSelected = item.id === preselectedId;
                return (
                  <TouchableOpacity
                    style={[styles.row, isSelected && styles.rowSelected]}
                    activeOpacity={0.7}
                    onPress={() => onSelect(item.id)}
                  >
                    <View
                      style={[
                        styles.avatar,
                        isSelected && styles.avatarSelected,
                      ]}
                    >
                      <Text style={styles.avatarText}>
                        {item.firstName?.[0]?.toUpperCase() ?? "?"}
                      </Text>
                    </View>
                    <View style={styles.info}>
                      <Text
                        style={[
                          styles.name,
                          isSelected && styles.nameSelected,
                        ]}
                        numberOfLines={1}
                      >
                        {name}
                      </Text>
                      {item.phone ? (
                        <Text style={styles.phone}>{item.phone}</Text>
                      ) : null}
                    </View>
                    {isSelected ? (
                      <Text style={styles.check}>✓</Text>
                    ) : (
                      <View style={styles.radio} />
                    )}
                  </TouchableOpacity>
                );
              }}
            />
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "70%",
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#CBD5E1",
    alignSelf: "center",
    marginTop: 10,
    marginBottom: 8,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0F172A",
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center",
  },
  closeBtnText: {
    fontSize: 14,
    color: "#64748B",
  },
  subtitle: {
    fontSize: 13,
    color: "#64748B",
    paddingHorizontal: 20,
    marginTop: 4,
    marginBottom: 16,
  },
  loader: {
    paddingVertical: 40,
  },
  list: {
    paddingHorizontal: 12,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 12,
    marginBottom: 6,
    borderRadius: 14,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  rowSelected: {
    backgroundColor: "#ECFDF5",
    borderColor: "#16A34A",
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#E2E8F0",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  avatarSelected: {
    backgroundColor: "#DCFCE7",
  },
  avatarText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#475569",
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 15,
    fontWeight: "600",
    color: "#0F172A",
  },
  nameSelected: {
    color: "#166534",
  },
  phone: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: "#CBD5E1",
  },
  check: {
    fontSize: 18,
    fontWeight: "700",
    color: "#16A34A",
  },
  empty: {
    alignItems: "center",
    paddingVertical: 40,
    paddingHorizontal: 24,
  },
  emptyEmoji: {
    fontSize: 36,
    marginBottom: 10,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#334155",
  },
  emptySub: {
    marginTop: 6,
    fontSize: 13,
    color: "#94A3B8",
    textAlign: "center",
    lineHeight: 20,
  },
});
