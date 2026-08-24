import { Children, type ReactNode } from "react"
import { Pressable, Text, View } from "react-native"
import { SymbolView } from "expo-symbols"

import { colors } from "@/theme/colors"

type SettingsRowProps = {
  title: string
  subtitle?: string
  onPress?: () => void
  trailing?: ReactNode
  showChevron?: boolean
  destructive?: boolean
}

export function SettingsRow({
  title,
  subtitle,
  onPress,
  trailing,
  showChevron = true,
  destructive = false,
}: SettingsRowProps) {
  return (
    <Pressable
      accessibilityRole={onPress ? "button" : undefined}
      disabled={!onPress}
      className="min-h-[52px] flex-row items-center px-4 py-3"
      onPress={onPress}>
      <View className="flex-1 pr-3">
        <Text
          className="text-[17px]"
          style={{ color: destructive ? colors.danger : "#1C1C1E" }}>
          {title}
        </Text>
        {subtitle ? <Text className="mt-0.5 text-[13px] text-[#8E8E93]">{subtitle}</Text> : null}
      </View>
      {trailing}
      {showChevron && onPress ? (
        <SymbolView
          name="chevron.right"
          size={14}
          tintColor="#C7C7CC"
          fallback={<Text className="text-[17px] text-[#C7C7CC]">›</Text>}
        />
      ) : null}
    </Pressable>
  )
}

export function SettingsGroup({ children }: { children: ReactNode }) {
  const items = Children.toArray(children)
  return (
    <View className="overflow-hidden rounded-xl" style={{ backgroundColor: colors.parchment }}>
      {items.map((child, index) => (
        <View
          key={index}
          style={
            index > 0
              ? { borderTopWidth: 1, borderTopColor: "#E5E5EA" }
              : undefined
          }>
          {child}
        </View>
      ))}
    </View>
  )
}
