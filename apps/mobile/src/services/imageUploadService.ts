import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { getStorageInstance } from "./firebase";

export interface UploadProgress {
  bytesTransferred: number;
  totalBytes: number;
  percentage: number;
}

export const imageUploadService = {
  /**
   * Delivery proofs are uploaded by `POST /delivery/orders/:id/complete`
   * via Admin SDK (mobile is not signed into Firebase Auth).
   */
  async uploadDeliveryProof(_uri: string, _orderId: string, _partnerId: string): Promise<string> {
    throw new Error(
      "Use deliveryPartnerService.completeDelivery with a camera data URL; client Storage uploads are not supported."
    );
  },

  /**
   * Upload a profile image for a user
   * @param uri - Local file URI from image picker
   * @param userId - User ID
   * @returns Download URL of the uploaded image
   */
  async uploadProfileImage(uri: string, userId: string): Promise<string> {
    try {
      const storage = getStorageInstance();
      const response = await fetch(uri);
      const blob = await response.blob();

      const timestamp = Date.now();
      const filename = `profile_${userId}_${timestamp}.jpg`;
      const storageRef = ref(storage, `users/${userId}/profile/${filename}`);

      await uploadBytes(storageRef, blob);
      const downloadURL = await getDownloadURL(storageRef);
      return downloadURL;
    } catch (error) {
      console.error("Error uploading profile image:", error);
      throw new Error("Failed to upload profile image");
    }
  },

  /**
   * Delete a profile image from storage
   * @param imageUrl - Full download URL of the image
   */
  async deleteProfileImage(imageUrl: string): Promise<void> {
    try {
      const storage = getStorageInstance();
      const path = this.getPathFromUrl(imageUrl);
      if (!path) throw new Error("Invalid image URL");

      const storageRef = ref(storage, path);
      await deleteObject(storageRef);
    } catch (error) {
      console.error("Error deleting profile image:", error);
      throw new Error("Failed to delete profile image");
    }
  },

  /**
   * Extract storage path from Firebase download URL
   * @param url - Firebase download URL
   * @returns Storage path or null
   */
  getPathFromUrl(url: string): string | null {
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;
      // Extract path after /o/
      const match = pathname.match(/\/o\/(.+)/);
      if (match && match[1]) {
        return decodeURIComponent(match[1].split("?")[0]);
      }
      return null;
    } catch {
      return null;
    }
  },

  /**
   * Validate image before upload
   * @param uri - Local file URI
   * @param maxSizeMB - Maximum file size in MB (default 5MB)
   * @returns true if valid, throws error otherwise
   */
  async validateImage(uri: string, maxSizeMB: number = 5): Promise<boolean> {
    try {
      const response = await fetch(uri);
      const blob = await response.blob();

      // Check file size
      const sizeMB = blob.size / (1024 * 1024);
      if (sizeMB > maxSizeMB) {
        throw new Error(`Image size must be less than ${maxSizeMB}MB`);
      }

      // Check file type
      if (!blob.type.startsWith("image/")) {
        throw new Error("File must be an image");
      }

      return true;
    } catch (error: any) {
      throw error;
    }
  },
};
