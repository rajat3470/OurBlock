import { View, StyleSheet } from "react-native";
import { brand } from "../../constants/theme";

interface MmProgressProps {
  total?: number;
  active: number;
}

export default function MmProgress({ total = 3, active }: MmProgressProps) {
  return (
    <View style={styles.row}>
      {Array.from({ length: total }).map((_, index) => (
        <View
          key={index}
          style={[
            styles.seg,
            { backgroundColor: index < active ? brand.accent : brand.progressTrack },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: 6,
    width: "100%",
  },
  seg: {
    flex: 1,
    height: 4,
    borderRadius: 4,
  },
});
