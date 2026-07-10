import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Address } from "@/types";
import content from "@/content/addresses.json";

interface AddressCardProps {
  address: Address;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onSetDefault: (id: string) => void;
}

export default function AddressCard({
  address,
  onEdit,
  onDelete,
  onSetDefault,
}: AddressCardProps) {
  const typeLabel = content.list.types[address.type];

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.typeContainer}>
          <Text style={styles.type}>{typeLabel}</Text>
          {address.isDefault && (
            <View style={styles.defaultBadge}>
              <Text style={styles.defaultText}>{content.list.defaultBadge}</Text>
            </View>
          )}
        </View>
        <View style={styles.actions}>
          <TouchableOpacity style={styles.actionBtn} onPress={() => onEdit(address.id)}>
            <Ionicons name="pencil-outline" size={16} color="#FFFFFF" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={() => onDelete(address.id)}>
            <Ionicons name="trash-outline" size={16} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>

      {address.name ? <Text style={styles.name}>{address.name}</Text> : null}
      <Text style={styles.text}>
        {address.street}
        {address.landmark ? `, ${address.landmark}` : ""}
      </Text>
      <Text style={styles.text}>
        {address.city}, {address.state} - {address.pincode}
      </Text>
      <Text style={styles.phone}>{address.phone}</Text>

      {!address.isDefault && (
        <TouchableOpacity
          style={styles.setDefaultBtn}
          onPress={() => onSetDefault(address.id)}
        >
          <Text style={styles.setDefaultText}>{content.list.setDefault}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  typeContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  type: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },
  defaultBadge: {
    backgroundColor: "#0E9F6E",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  defaultText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  actions: {
    flexDirection: "row",
    gap: 8,
  },
  actionBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: "#0E9F6E",
    justifyContent: "center",
    alignItems: "center",
  },
  name: {
    fontSize: 15,
    color: "#111827",
    fontWeight: "600",
    marginBottom: 4,
  },
  text: {
    fontSize: 13,
    color: "#6B7280",
    marginBottom: 2,
    lineHeight: 20,
  },
  phone: {
    fontSize: 14,
    color: "#374151",
    marginTop: 4,
    fontWeight: "600",
  },
  setDefaultBtn: {
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: "#ECFDF5",
    borderRadius: 8,
    alignSelf: "flex-start",
  },
  setDefaultText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#0E9F6E",
  },
});
