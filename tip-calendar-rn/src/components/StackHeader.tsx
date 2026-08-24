import { router } from "expo-router"
import type { ReactNode } from "react"
import { Pressable, Text, View } from "react-native"

import { colors } from "@/theme/colors"

type StackHeaderProps = {
  title: string
  backLabel?: string
  onBack?: () => void
  right?: ReactNode
}

export function StackHeader({
  title,
  backLabel = "Me",
  onBack,
  right,
}: StackHeaderProps) {
  return (
    <View className="flex-row items-center border-b border-[#E5E5EA] px-1 py-1">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Back to ${backLabel}`}
        className="min-h-[44px] min-w-[72px] justify-center px-3"
        onPress={onBack ?? (() => router.back())}>
        <Text className="text-[17px]" style={{ color: colors.action }}>
          {backLabel}
        </Text>
      </Pressable>
      <Text className="flex-1 text-center text-[17px] font-semibold text-[#1C1C1E]">{title}</Text>
      <View className="min-h-[44px] min-w-[72px] items-end justify-center px-3">{right}</View>
    </View>
  )
}
