import { StyleSheet, Text, TouchableOpacity } from "react-native";
import { brand, colors, fonts } from "../../constants/theme";

interface MmChipProps {
  label: string;
  selected?: boolean;
  onPress: () => void;
}

export default function MmChip({ label, selected, onPress }: MmChipProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={[
        styles.chip,
        selected
          ? { backgroundColor: brand.primaryDark, borderColor: brand.primaryDark }
          : { backgroundColor: colors.surface, borderColor: colors.border },
      ]}
    >
      <Text style={[styles.label, { color: selected ? "#FFFFFF" : colors.textSecondary }]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  chip: {
    borderWidth: 1.5,
    borderRadius: 20,
    paddingHorizontal: 13,
    paddingVertical: 9,
  },
  label: {
    fontSize: 12,
    fontFamily: fonts.medium,
  },
});
