import {
  View,
  Text,
  StyleSheet,
  Modal,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  TextInput,
} from "react-native";
import { Society } from "@/types";

interface SocietyPickerModalProps {
  visible: boolean;
  societies: Society[];
  loading: boolean;
  selectedId: string;
  searchQuery: string;
  onClose: () => void;
  onSelect: (society: Society) => void;
  onSearchChange: (value: string) => void;
}

export function SocietyPickerModal({
  visible,
  societies,
  loading,
  selectedId,
  searchQuery,
  onClose,
  onSelect,
  onSearchChange,
}: SocietyPickerModalProps) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Select Your Society</Text>
          <TouchableOpacity style={styles.modalCloseBtn} onPress={onClose}>
            <Text style={styles.modalCloseBtnText}>✕</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.modalSearch}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.modalSearchInput}
            placeholder="Search by name or city…"
            value={searchQuery}
            onChangeText={onSearchChange}
            autoCorrect={false}
            placeholderTextColor="#94A3B8"
          />
        </View>

        <FlatList
          data={societies}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => {
            const isSelected = item.id === selectedId;
            return (
              <TouchableOpacity
                style={[styles.societyItem, isSelected ? styles.societyItemSelected : null]}
                onPress={() => onSelect(item)}
              >
                <View style={styles.societyItemIcon}>
                  <Text>🏘️</Text>
                </View>
                <View style={styles.societyItemInfo}>
                  <Text
                    style={[
                      styles.societyItemName,
                      isSelected ? styles.societyItemNameSelected : null,
                    ]}
                  >
                    {item.name}
                  </Text>
                  <Text style={styles.societyItemMeta}>
                    {item.city}, {item.state} · {item.pincode}
                  </Text>
                </View>
                {isSelected && <Text style={styles.checkmark}>✓</Text>}
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyModal}>
              <Text style={styles.emptyModalText}>
                {loading ? "Loading…" : "No societies found"}
              </Text>
            </View>
          }
        />
      </SafeAreaView>
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
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0F172A",
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center",
  },
  modalCloseBtnText: {
    fontSize: 14,
    color: "#64748B",
  },
  modalSearch: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    marginHorizontal: 16,
    marginVertical: 12,
    borderRadius: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  searchIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  modalSearchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 15,
    color: "#0F172A",
  },
  societyItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 20,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  societyItemSelected: {
    backgroundColor: "#EFF6FF",
  },
  societyItemIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  societyItemInfo: {
    flex: 1,
  },
  societyItemName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#0F172A",
    marginBottom: 2,
  },
  societyItemNameSelected: {
    color: "#2563EB",
  },
  societyItemMeta: {
    fontSize: 12,
    color: "#64748B",
  },
  checkmark: {
    fontSize: 16,
    color: "#3B82F6",
    fontWeight: "700",
  },
  emptyModal: {
    padding: 40,
    alignItems: "center",
  },
  emptyModalText: {
    fontSize: 15,
    color: "#94A3B8",
  },
});
