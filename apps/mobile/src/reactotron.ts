import AsyncStorage from "@react-native-async-storage/async-storage";
import Reactotron from "reactotron-react-native";

if (__DEV__) {
  Reactotron.setAsyncStorageHandler(AsyncStorage)
    .configure({
      name: "mohallaMitr",
      host: process.env.EXPO_PUBLIC_REACTOTRON_HOST || "localhost",
      port: 9090,
    })
    .useReactNative({
      asyncStorage: true,
      networking: false,
    })
    .connect();
}

export default Reactotron;
