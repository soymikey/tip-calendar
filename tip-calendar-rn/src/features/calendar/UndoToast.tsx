import { Pressable, Text, View } from "react-native"

import { colors } from "@/theme/colors"

type UndoToastProps = {
  onUndo: () => void
}

export function UndoToast({ onUndo }: UndoToastProps) {
  return (
    <View
      className="absolute bottom-3 left-5 right-5 flex-row items-center rounded-lg px-4 py-3"
      style={{ backgroundColor: "#333333" }}>
      <Text className="flex-1 text-[15px] text-white">Shift deleted</Text>
      <Pressable accessibilityRole="button" accessibilityLabel="Undo" hitSlop={12} onPress={onUndo}>
        <Text className="text-[15px] font-semibold" style={{ color: colors.action }}>
          Undo
        </Text>
      </Pressable>
    </View>
  )
}
