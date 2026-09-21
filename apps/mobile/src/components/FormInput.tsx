import {
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
} from "react-native";
import { colors, fonts } from "../constants/theme";

interface FormInputProps extends TextInputProps {
  label: string;
  error?: string;
  containerStyle?: ViewStyle;
  multilineHeight?: number;
}

export default function FormInput({
  label,
  error,
  containerStyle,
  multilineHeight,
  multiline,
  style,
  ...inputProps
}: FormInputProps) {
  return (
    <View style={[styles.fieldGroup, containerStyle]}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[
          styles.input,
          multiline && styles.multilineInput,
          multiline && multilineHeight ? { height: multilineHeight } : null,
          error ? styles.inputError : null,
          style,
        ]}
        multiline={multiline}
        placeholderTextColor={colors.textMuted}
        {...inputProps}
      />
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  fieldGroup: {
    marginBottom: 16,
    gap: 7,
  },
  label: {
    fontSize: 12,
    fontFamily: fonts.bold,
    color: colors.textSecondary,
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 14,
    color: colors.textPrimary,
    fontFamily: fonts.regular,
    minHeight: 48,
  },
  multilineInput: {
    height: 70,
    textAlignVertical: "top",
  },
  inputError: {
    borderColor: colors.red[500],
  },
  errorText: {
    fontSize: 12,
    color: colors.red[500],
    fontFamily: fonts.regular,
  },
});
