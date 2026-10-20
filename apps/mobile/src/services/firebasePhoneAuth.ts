import { getAuth, signInWithPhoneNumber, type ConfirmationResult } from "@react-native-firebase/auth";

let confirmResult: ConfirmationResult | null = null;

export const firebasePhoneAuth = {
  async sendOTP(phone: string): Promise<void> {
    const auth = getAuth();
    confirmResult = await signInWithPhoneNumber(auth, phone);
  },

  async verifyOTP(code: string): Promise<string> {
    if (!confirmResult) {
      throw new Error("No OTP request in progress. Please request a new code.");
    }
    const userCredential = await confirmResult.confirm(code);
    if (!userCredential?.user) {
      throw new Error("Verification failed");
    }
    const idToken = await userCredential.user.getIdToken();
    const auth = getAuth();
    await auth.signOut();
    confirmResult = null;
    return idToken;
  },

  reset() {
    confirmResult = null;
  },

  formatPhone(phone: string): string {
    const cleaned = phone.replace(/\D/g, "");
    if (cleaned.startsWith("91") && cleaned.length === 12) return `+${cleaned}`;
    if (cleaned.length === 10) return `+91${cleaned}`;
    throw new Error("Invalid phone number");
  },
};
