import { FlatList, StyleSheet, View } from "react-native";
import AddressCard from "@components/AddressCard";
import EmptyState from "@components/EmptyState";
import FloatingActionButton from "@components/FloatingActionButton";
import LoadingScreen from "@components/LoadingScreen";
import ScreenHeader from "@components/ScreenHeader";
import { useAddresses } from "@hooks/useAddresses";
import content from "@/content/addresses.json";

export default function AddressesScreen() {
  const {
    addresses,
    loading,
    refreshing,
    handleRefresh,
    handleSetDefault,
    handleDelete,
    goToAdd,
    goToEdit,
    goBack,
  } = useAddresses();

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <View style={styles.container}>
      <ScreenHeader title={content.list.title} onBack={goBack} />

      <FlatList
        data={addresses}
        renderItem={({ item }) => (
          <AddressCard
            address={item}
            onEdit={goToEdit}
            onDelete={handleDelete}
            onSetDefault={handleSetDefault}
          />
        )}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshing={refreshing}
        onRefresh={handleRefresh}
        ListEmptyComponent={
          <EmptyState
            icon="location-outline"
            title={content.list.empty.title}
            subtitle={content.list.empty.subtitle}
          />
        }
      />

      <FloatingActionButton onPress={goToAdd} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F7F8FA",
  },
  listContent: {
    padding: 16,
    paddingBottom: 24,
  },
});
