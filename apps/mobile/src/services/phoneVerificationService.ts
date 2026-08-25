import { apiClient } from './apiClient';

export interface PhoneVerificationState {
  verificationId: string | null;
  phoneNumber: string;
  isVerifying: boolean;
  error: string | null;
}

export interface ConfirmationResult {
  phone: string;
  confirm: (code: string) => Promise<boolean>;
}

export const phoneVerificationService = {
  /**
   * Send OTP to phone number via backend
   * @param phoneNumber - Phone number with country code (e.g., +911234567890)
   * @returns ConfirmationResult-like object for verifyCode compatibility
   */
  async sendVerificationCode(phoneNumber: string): Promise<ConfirmationResult> {
    const formatted = this.formatPhoneNumber(phoneNumber);
    const res = await apiClient.post('/otp/send', { phone: formatted });
    if (!res.data?.success) {
      throw new Error(res.data?.error || 'Failed to send OTP');
    }
    return {
      phone: formatted,
      confirm: async (code: string) => {
        return this.verifyCode({ phone: formatted } as any, code);
      },
    };
  },

  /**
   * Verify OTP code via backend
   * @param confirmation - Object with phone property
   * @param code - 6-digit OTP code
   * @returns Success status
   */
  async verifyCode(confirmation: { phone: string }, code: string): Promise<boolean> {
    const res = await apiClient.post('/otp/verify', { phone: confirmation.phone, code });
    if (!res.data?.success) {
      throw new Error(res.data?.error || 'Verification failed');
    }
    return true;
  },

  /**
   * Format phone number to E.164 format for India
   */
  formatPhoneNumber(phone: string): string {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.startsWith('91') && cleaned.length === 12) {
      return `+${cleaned}`;
    }
    if (cleaned.length === 10) {
      return `+91${cleaned}`;
    }
    throw new Error('Invalid phone number. Please enter a 10-digit number.');
  },

  /**
   * Validate OTP code format
   */
  validateOTP(code: string): boolean {
    return /^\d{6}$/.test(code);
  },
};
