import { apiClient } from "./apiClient";

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
  async uploadProfileImage(uri: string, _userId: string): Promise<string> {
    try {
      // Fetch the local file as a blob
      const response = await fetch(uri);
      const blob = await response.blob();

      // Build multipart form data
      const formData = new FormData();
      formData.append("image", {
        uri,
        type: blob.type || "image/jpeg",
        name: `profile.${blob.type?.includes("png") ? "png" : "jpg"}`,
      } as any);

      // POST to the backend upload endpoint
      const result = await apiClient.post<{ success: boolean; data: { url: string } }>(
        "/upload/profile",
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
        }
      );

      return result.data.url;
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
      await apiClient.post("/upload/delete", { url: imageUrl });
    } catch (error) {
      console.error("Error deleting profile image:", error);
      throw new Error("Failed to delete profile image");
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
