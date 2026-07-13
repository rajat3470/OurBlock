import { View, StyleSheet } from "react-native";
import RoleLoginForm from "../../src/components/RoleLoginForm";
import LoginRoleSwitcher from "../../src/components/LoginRoleSwitcher";
import BackButton from "../../src/components/BackButton";
import { colors } from "../../src/constants/theme";

export default function DeliveryPartnerLoginScreen() {
  return (
    <View style={styles.wrapper}>
      <RoleLoginForm
        role="deliveryPartner"
        icon="🛵"
        title="Delivery Partner"
        subtitle="Sign in to deliver orders and collect payment"
        emailPlaceholder="partner@business.com"
        successRoute="/(delivery-partner)/dashboard"
        footer={
          <View style={styles.footer}>
            <LoginRoleSwitcher currentRole="deliveryPartner" compact />
          </View>
        }
      />
      <BackButton top={12} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
  },
  footer: {
    alignItems: "center",
  },
});
