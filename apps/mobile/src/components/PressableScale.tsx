import { useRef } from "react";
import { Animated, Pressable, PressableProps, ViewStyle, StyleProp } from "react-native";

type PressableScaleProps = PressableProps & {
  /** Scale value applied while pressed. Defaults to 0.96. */
  pressedScale?: number;
  style?: StyleProp<ViewStyle>;
};

/**
 * A Pressable that gently scales down while held, for tactile micro-feedback.
 * Drop-in replacement for TouchableOpacity on primary CTAs.
 */
export function PressableScale({
  pressedScale = 0.96,
  style,
  children,
  onPressIn,
  onPressOut,
  ...rest
}: PressableScaleProps) {
  const scale = useRef(new Animated.Value(1)).current;

  const animateTo = (value: number) => {
    Animated.spring(scale, {
      toValue: value,
      useNativeDriver: true,
      speed: 40,
      bounciness: 6,
    }).start();
  };

  return (
    <Pressable
      onPressIn={(e) => {
        animateTo(pressedScale);
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        animateTo(1);
        onPressOut?.(e);
      }}
      {...rest}
    >
      <Animated.View style={[style, { transform: [{ scale }] }]}>{children as any}</Animated.View>
    </Pressable>
  );
}
