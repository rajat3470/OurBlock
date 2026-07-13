import { Alert, AlertButton } from "react-native";

export type DeliveryPartnerChoice = {
  id: string;
  firstName: string;
  lastName: string;
  status?: string;
};

/**
 * Shows a native alert so the owner must pick a delivery partner
 * before sending an order out. Returns null if cancelled or no partners exist.
 */
export function promptDeliveryPartnerSelection(
  partners: DeliveryPartnerChoice[],
  options?: {
    title?: string;
    message?: string;
    preselectedId?: string | null;
  }
): Promise<string | null> {
  const active = partners.filter((p) => !p.status || p.status === "active");

  return new Promise((resolve) => {
    if (active.length === 0) {
      Alert.alert(
        "No delivery partners",
        "Add a delivery partner from Profile → Delivery Partners before sending orders out."
      );
      resolve(null);
      return;
    }

    const buttons: AlertButton[] = active.map((partner) => {
      const name = `${partner.firstName} ${partner.lastName}`.trim();
      const selected = options?.preselectedId === partner.id;
      return {
        text: selected ? `✓ ${name}` : name,
        onPress: () => resolve(partner.id),
      };
    });

    buttons.push({
      text: "Cancel",
      style: "cancel",
      onPress: () => resolve(null),
    });

    Alert.alert(
      options?.title ?? "Assign delivery partner",
      options?.message ?? "Select who will deliver this order to continue.",
      buttons,
      { cancelable: true, onDismiss: () => resolve(null) }
    );
  });
}
