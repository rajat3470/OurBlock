import { View, Text, Image, TouchableOpacity, StyleSheet } from "react-native";

interface ProfileImagePickerProps {
  uri: string | null;
  onPress: () => void;
}

export function ProfileImagePicker({ uri, onPress }: ProfileImagePickerProps) {
  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        {uri ? (
          <Image source={{ uri }} style={styles.headerImage} />
        ) : (
          <Text style={styles.headerIcon}>👤</Text>
        )}
      </View>
      <TouchableOpacity style={styles.imagePickerBtn} onPress={onPress}>
        <Text style={styles.imagePickerBtnText}>
          {uri ? "Change Photo" : "Add Profile Photo (Optional)"}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
  },
  iconContainer: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: "#DBEAFE",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
    borderWidth: 2,
    borderColor: "#93C5FD",
  },
  headerIcon: {
    fontSize: 40,
  },
  headerImage: {
    width: 84,
    height: 84,
    borderRadius: 42,
  },
  imagePickerBtn: {
    marginBottom: 12,
  },
  imagePickerBtnText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#2563EB",
  },
});
