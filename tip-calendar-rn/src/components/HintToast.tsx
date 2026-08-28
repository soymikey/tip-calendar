import { Text, View, type ViewStyle } from "react-native"

type HintToastProps = {
  message: string
  style?: ViewStyle
}

export function HintToast({ message, style }: HintToastProps) {
  return (
    <View
      accessibilityLiveRegion="polite"
      className="absolute bottom-3 left-5 right-5 rounded-lg px-4 py-3"
      style={[{ backgroundColor: "#333333" }, style]}>
      <Text className="text-center text-[15px] text-white">{message}</Text>
    </View>
  )
}
