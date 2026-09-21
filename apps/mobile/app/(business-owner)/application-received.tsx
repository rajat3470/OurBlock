import { StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import MmScreen from "../../src/components/ui/MmScreen";
import MmButton from "../../src/components/ui/MmButton";
import { brand, colors, fonts } from "../../src/constants/theme";

export default function ApplicationReceivedScreen() {
  return (
    <MmScreen>
      <View style={styles.center}>
        <View style={styles.badge}>
          <Ionicons name="checkmark-circle" size={72} color={brand.accent} />
        </View>
        <Text style={styles.title}>Application Received!</Text>
        <Text style={styles.body}>
          Our team will verify your shop details within 24 hours. You can explore your dashboard while you wait.
        </Text>
        <MmButton label="Go to Dashboard" onPress={() => router.replace("/(business-owner)/dashboard")} />
      </View>
    </MmScreen>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: "center",
    gap: 16,
    paddingHorizontal: 8,
  },
  badge: {
    alignSelf: "center",
    marginBottom: 8,
  },
  title: {
    fontFamily: fonts.serif,
    fontSize: 32,
    lineHeight: 40,
    color: colors.textPrimary,
    textAlign: "center",
  },
  body: {
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 20,
    color: colors.textSecondary,
    textAlign: "center",
    marginBottom: 16,
  },
});
