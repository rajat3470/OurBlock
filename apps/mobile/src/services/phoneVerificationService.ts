import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import { getCompatAuthInstance } from './firebase';
import { userAppService } from './userAppService';

export interface PhoneVerificationState {
  verificationId: string | null;
  phoneNumber: string;
  isVerifying: boolean;
  error: string | null;
}

export const phoneVerificationService = {
  /**
   * Send OTP to phone number
   * @param phoneNumber - Phone number with country code (e.g., +911234567890)
   * @param recaptchaVerifier - Recaptcha verifier instance
   * @returns Verification ID
   */
  async sendVerificationCode(
    phoneNumber: string,
    recaptchaVerifier: any
  ): Promise<string> {
    try {
      const auth = getCompatAuthInstance();
      const phoneProvider = new firebase.auth.PhoneAuthProvider(auth);
      const verificationId = await phoneProvider.verifyPhoneNumber(
        phoneNumber,
        recaptchaVerifier
      );
      return verificationId;
    } catch (error: any) {
      console.error('Error sending verification code:', error);
      throw this.handleFirebaseError(error);
    }
  },

  /**
   * Verify OTP code
   * @param verificationId - Verification ID from sendVerificationCode
   * @param code - 6-digit OTP code
   * @returns Success status
   */
  async verifyCode(verificationId: string, code: string): Promise<boolean> {
    try {
      const auth = getCompatAuthInstance();
      const credential = firebase.auth.PhoneAuthProvider.credential(verificationId, code);
      await auth.signInWithCredential(credential);
      await userAppService.verifyPhone(code, verificationId);
      return true;
    } catch (error: any) {
      console.error('Error verifying code:', error);
      throw this.handleFirebaseError(error);
    }
  },

  /**
   * Format phone number to E.164 format for India
   * @param phone - 10-digit phone number
   * @returns Formatted phone number with +91 prefix
   */
  formatPhoneNumber(phone: string): string {
    // Remove all non-digit characters
    const cleaned = phone.replace(/\D/g, '');

    // If it already has country code, return as is
    if (cleaned.startsWith('91') && cleaned.length === 12) {
      return `+${cleaned}`;
    }

    // Add +91 for Indian numbers
    if (cleaned.length === 10) {
      return `+91${cleaned}`;
    }

    throw new Error('Invalid phone number. Please enter a 10-digit number.');
  },

  /**
   * Validate OTP code format
   * @param code - OTP code
   * @returns true if valid
   */
  validateOTP(code: string): boolean {
    return /^\d{6}$/.test(code);
  },

  /**
   * Handle Firebase errors and return user-friendly messages
   * @param error - Firebase error
   * @returns Error with user-friendly message
   */
  handleFirebaseError(error: any): Error {
    let message = 'An error occurred during phone verification';

    switch (error.code) {
      case 'auth/invalid-phone-number':
        message = 'Invalid phone number format';
        break;
      case 'auth/missing-phone-number':
        message = 'Phone number is required';
        break;
      case 'auth/quota-exceeded':
        message = 'SMS quota exceeded. Please try again later.';
        break;
      case 'auth/invalid-verification-code':
        message = 'Invalid verification code. Please try again.';
        break;
      case 'auth/code-expired':
        message = 'Verification code has expired. Please request a new one.';
        break;
      case 'auth/missing-verification-code':
        message = 'Verification code is required';
        break;
      case 'auth/credential-already-in-use':
        message = 'This phone number is already in use by another account';
        break;
      case 'auth/too-many-requests':
        message = 'Too many attempts. Please try again later.';
        break;
      default:
        message = error.message || message;
    }

    return new Error(message);
  },
};
