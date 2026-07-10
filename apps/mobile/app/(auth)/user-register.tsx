import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useUserRegistration } from "../../src/hooks/useUserRegistration";
import { ProfileImagePicker } from "../../src/components/auth/ProfileImagePicker";
import { SocietyPickerModal } from "../../src/components/auth/SocietyPickerModal";
import { colors } from "../../src/constants/theme";
import BackButton from "../../src/components/BackButton";

export default function UserRegisterScreen() {
  const {
    form,
    errors,
    setField,
    showPassword,
    setShowPassword,
    showConfirm,
    setShowConfirm,
    isLoading,
    profileImageUri,
    handlePickProfileImage,
    loadingSocieties,
    selectedSocietyId,
    selectedSocietyName,
    showSocietyPicker,
    setShowSocietyPicker,
    societySearch,
    setSocietySearch,
    filteredSocieties,
    selectSociety,
    handleRegister,
  } = useUserRegistration();

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          keyboardDismissMode="interactive"
        >
          <View style={styles.headerSection}>
            <ProfileImagePicker uri={profileImageUri} onPress={handlePickProfileImage} />
            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>
              Join your community and discover local businesses
            </Text>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Your Society *</Text>
            <TouchableOpacity
              style={[styles.selectorBtn, errors.societyId ? styles.inputError : null]}
              onPress={() => setShowSocietyPicker(true)}
              activeOpacity={0.8}
            >
              <Text
                style={
                  selectedSocietyName ? styles.selectorBtnText : styles.selectorBtnPlaceholder
                }
              >
                {loadingSocieties
                  ? "Loading societies…"
                  : selectedSocietyName
                  ? `🏘️  ${selectedSocietyName}`
                  : "Select your society…"}
              </Text>
              <Text style={styles.selectorChevron}>▼</Text>
            </TouchableOpacity>
            {errors.societyId ? <Text style={styles.errorText}>{errors.societyId}</Text> : null}
          </View>

          <View style={styles.row}>
            <View style={[styles.fieldGroup, styles.halfField]}>
              <Text style={styles.label}>First Name *</Text>
              <TextInput
                style={[styles.input, errors.firstName ? styles.inputError : null]}
                placeholder="e.g. Priya"
                value={form.firstName}
                onChangeText={(v) => setField("firstName", v)}
                autoCapitalize="words"
                autoCorrect={false}
                placeholderTextColor={colors.textMuted}
              />
              {errors.firstName ? <Text style={styles.errorText}>{errors.firstName}</Text> : null}
            </View>
            <View style={[styles.fieldGroup, styles.halfField]}>
              <Text style={styles.label}>Last Name *</Text>
              <TextInput
                style={[styles.input, errors.lastName ? styles.inputError : null]}
                placeholder="e.g. Sharma"
                value={form.lastName}
                onChangeText={(v) => setField("lastName", v)}
                autoCapitalize="words"
                autoCorrect={false}
                placeholderTextColor={colors.textMuted}
              />
              {errors.lastName ? <Text style={styles.errorText}>{errors.lastName}</Text> : null}
            </View>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Email Address *</Text>
            <TextInput
              style={[styles.input, errors.email ? styles.inputError : null]}
              placeholder="you@example.com"
              value={form.email}
              onChangeText={(v) => setField("email", v)}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              placeholderTextColor={colors.textMuted}
            />
            {errors.email ? <Text style={styles.errorText}>{errors.email}</Text> : null}
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Mobile Number *</Text>
            <TextInput
              style={[styles.input, errors.phone ? styles.inputError : null]}
              placeholder="10-digit mobile number"
              value={form.phone}
              onChangeText={(v) => setField("phone", v)}
              keyboardType="phone-pad"
              placeholderTextColor={colors.textMuted}
            />
            {errors.phone ? <Text style={styles.errorText}>{errors.phone}</Text> : null}
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Address *</Text>
            <TextInput
              style={[styles.input, errors.addressLine ? styles.inputError : null]}
              placeholder="Flat/House, Street, Landmark"
              value={form.addressLine}
              onChangeText={(v) => setField("addressLine", v)}
              autoCapitalize="words"
              autoCorrect={false}
              placeholderTextColor={colors.textMuted}
            />
            {errors.addressLine ? <Text style={styles.errorText}>{errors.addressLine}</Text> : null}
          </View>

          <View style={styles.row}>
            <View style={[styles.fieldGroup, styles.halfField]}>
              <Text style={styles.label}>City *</Text>
              <TextInput
                style={[styles.input, errors.city ? styles.inputError : null]}
                placeholder="e.g. Noida"
                value={form.city}
                onChangeText={(v) => setField("city", v)}
                autoCapitalize="words"
                autoCorrect={false}
                placeholderTextColor={colors.textMuted}
              />
              {errors.city ? <Text style={styles.errorText}>{errors.city}</Text> : null}
            </View>
            <View style={[styles.fieldGroup, styles.halfField]}>
              <Text style={styles.label}>State *</Text>
              <TextInput
                style={[styles.input, errors.state ? styles.inputError : null]}
                placeholder="e.g. UP"
                value={form.state}
                onChangeText={(v) => setField("state", v)}
                autoCapitalize="words"
                autoCorrect={false}
                placeholderTextColor={colors.textMuted}
              />
              {errors.state ? <Text style={styles.errorText}>{errors.state}</Text> : null}
            </View>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Pincode *</Text>
            <TextInput
              style={[styles.input, errors.pincode ? styles.inputError : null]}
              placeholder="6-digit pincode"
              value={form.pincode}
              onChangeText={(v) => setField("pincode", v)}
              keyboardType="number-pad"
              maxLength={6}
              placeholderTextColor={colors.textMuted}
            />
            {errors.pincode ? <Text style={styles.errorText}>{errors.pincode}</Text> : null}
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Password *</Text>
            <View
              style={[
                styles.passwordContainer,
                errors.password ? styles.inputError : null,
              ]}
            >
              <TextInput
                style={styles.passwordInput}
                placeholder="Minimum 8 characters"
                value={form.password}
                onChangeText={(v) => setField("password", v)}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="off"
                textContentType="none"
                placeholderTextColor={colors.textMuted}
              />
              <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowPassword((v) => !v)}>
                <Text style={styles.eyeIcon}>{showPassword ? "🙈" : "👁️"}</Text>
              </TouchableOpacity>
            </View>
            {errors.password ? <Text style={styles.errorText}>{errors.password}</Text> : null}
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Confirm Password *</Text>
            <View
              style={[
                styles.passwordContainer,
                errors.confirmPassword ? styles.inputError : null,
              ]}
            >
              <TextInput
                style={styles.passwordInput}
                placeholder="Re-enter your password"
                value={form.confirmPassword}
                onChangeText={(v) => setField("confirmPassword", v)}
                secureTextEntry={!showConfirm}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="off"
                textContentType="none"
                placeholderTextColor={colors.textMuted}
              />
              <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowConfirm((v) => !v)}>
                <Text style={styles.eyeIcon}>{showConfirm ? "🙈" : "👁️"}</Text>
              </TouchableOpacity>
            </View>
            {errors.confirmPassword ? (
              <Text style={styles.errorText}>{errors.confirmPassword}</Text>
            ) : null}
          </View>

          <TouchableOpacity
            style={[styles.registerBtn, isLoading ? styles.registerBtnDisabled : null]}
            onPress={handleRegister}
            disabled={isLoading}
            activeOpacity={0.85}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.registerBtnText}>Create Account</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.loginLink}
            onPress={() => {
              if (router.canGoBack()) {
                router.back();
              } else {
                router.replace("/(auth)/user-login");
              }
            }}
          >
            <Text style={styles.loginLinkText}>
              Already have an account? <Text style={styles.loginLinkBold}>Sign In</Text>
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      <SocietyPickerModal
        visible={showSocietyPicker}
        societies={filteredSocieties}
        loading={loadingSocieties}
        selectedId={selectedSocietyId}
        searchQuery={societySearch}
        onClose={() => setShowSocietyPicker(false)}
        onSelect={selectSociety}
        onSearchChange={setSocietySearch}
      />

      <BackButton top={12} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: {
    flex: 1,
    backgroundColor: colors.authBackground,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  headerSection: {
    alignItems: "center",
    paddingVertical: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: colors.textPrimary,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 22,
    paddingHorizontal: 16,
  },
  row: {
    flexDirection: "row",
    gap: 12,
  },
  halfField: {
    flex: 1,
  },
  fieldGroup: {
    marginBottom: 18,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textPrimary,
    marginBottom: 8,
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
    color: colors.textPrimary,
  },
  inputError: {
    borderColor: "#EF4444",
  },
  errorText: {
    fontSize: 12,
    color: "#EF4444",
    marginTop: 4,
  },
  passwordContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 12,
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
    color: colors.textPrimary,
  },
  eyeBtn: {
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  eyeIcon: {
    fontSize: 18,
  },
  selectorBtn: {
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    flexDirection: "row",
    alignItems: "center",
  },
  selectorBtnText: {
    flex: 1,
    fontSize: 15,
    color: colors.textPrimary,
  },
  selectorBtnPlaceholder: {
    flex: 1,
    fontSize: 15,
    color: colors.textMuted,
  },
  selectorChevron: {
    fontSize: 11,
    color: colors.textMuted,
  },
  registerBtn: {
    backgroundColor: "#3B82F6",
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 4,
    marginBottom: 16,
  },
  registerBtnDisabled: {
    opacity: 0.6,
  },
  registerBtnText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  loginLink: {
    alignItems: "center",
    paddingVertical: 8,
  },
  loginLinkText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  loginLinkBold: {
    fontWeight: "700",
    color: "#3B82F6",
  },
});
