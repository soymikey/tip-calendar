import { Pressable, Text } from "react-native"

import { colors } from "@/theme/colors"
import { space } from "@/theme/tokens"

type PrimaryButtonProps = {
  label: string
  disabled?: boolean
  onPress: () => void
}

export function PrimaryButton({ label, disabled = false, onPress }: PrimaryButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      className="w-full items-center justify-center rounded-full"
      style={{
        height: 50,
        backgroundColor: colors.action,
        opacity: disabled ? 0.4 : 1,
        minHeight: space.tap,
      }}>
      <Text className="text-[17px] font-semibold text-white">{label}</Text>
    </Pressable>
  )
}
