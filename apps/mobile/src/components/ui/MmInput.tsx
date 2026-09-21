import {
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
  type ViewStyle,
} from "react-native";
import { colors, fonts } from "../../constants/theme";

interface MmInputProps extends TextInputProps {
  label: string;
  error?: string;
  prefix?: string;
  containerStyle?: ViewStyle;
}

export default function MmInput({
  label,
  error,
  prefix,
  containerStyle,
  style,
  ...inputProps
}: MmInputProps) {
  return (
    <View style={[styles.field, containerStyle]}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.inputWrap, error ? styles.inputError : null]}>
        {prefix ? <Text style={styles.prefix}>{prefix}</Text> : null}
        <TextInput
          style={[styles.input, style]}
          placeholderTextColor={colors.textMuted}
          {...inputProps}
        />
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    width: "100%",
    gap: 7,
  },
  label: {
    fontSize: 12,
    color: colors.textSecondary,
    fontFamily: fonts.bold,
    letterSpacing: 0.4,
  },
  inputWrap: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    height: 48,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  inputError: {
    borderColor: colors.red[500],
  },
  prefix: {
    fontSize: 14,
    color: colors.textSecondary,
    fontFamily: fonts.semiBold,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: colors.textPrimary,
    letterSpacing: -0.14,
    fontFamily: fonts.regular,
    paddingVertical: 0,
  },
  error: {
    fontSize: 12,
    color: colors.red[500],
    fontFamily: fonts.regular,
  },
});
