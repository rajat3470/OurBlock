import React from "react";
import { View, StyleSheet } from "react-native";
import { Provider } from "react-redux";
import { store } from "@store/index";

interface AppProviderProps {
  children: React.ReactNode;
}

const AppProvider: React.FC<AppProviderProps> = ({ children }) => {
  return <Provider store={store}>{children}</Provider>;
};

export default AppProvider;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
