import * as ImagePicker from "expo-image-picker";

interface PickedImage {
  uri: string;
  dataUrl: string;
}

const PICKER_OPTIONS: ImagePicker.ImagePickerOptions = {
  mediaTypes: ImagePicker.MediaTypeOptions.Images,
  allowsEditing: true,
  aspect: [4, 3],
  quality: 0.5,
  base64: true,
};

async function toDataUrl(asset: ImagePicker.ImagePickerAsset): Promise<PickedImage | null> {
  if (!asset.base64) return null;
  const mimeType = asset.mimeType || "image/jpeg";
  return { uri: asset.uri, dataUrl: `data:${mimeType};base64,${asset.base64}` };
}

export async function pickImageFromLibrary(): Promise<PickedImage | null> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) return null;

  const result = await ImagePicker.launchImageLibraryAsync(PICKER_OPTIONS);
  if (result.canceled || result.assets.length === 0) return null;
  return toDataUrl(result.assets[0]);
}

export async function pickImageFromCamera(): Promise<PickedImage | null> {
  const permission = await ImagePicker.requestCameraPermissionsAsync();
  if (!permission.granted) return null;

  const result = await ImagePicker.launchCameraAsync(PICKER_OPTIONS);
  if (result.canceled || result.assets.length === 0) return null;
  return toDataUrl(result.assets[0]);
}
