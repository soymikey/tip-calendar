import { Pressable, Text, View } from "react-native"

type SegmentedControlProps<T extends string> = {
  options: { value: T; label: string }[]
  value: T
  onChange: (value: T) => void
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: SegmentedControlProps<T>) {
  return (
    <View className="w-full flex-row gap-0.5 rounded-lg bg-[#E5E5EA] p-0.5">
      {options.map((option) => {
        const selected = option.value === value
        return (
          <Pressable
            key={option.value}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            hitSlop={8}
            onPress={() => onChange(option.value)}
            className={`h-7 flex-1 items-center justify-center rounded-md ${
              selected ? "bg-white" : ""
            }`}>
            <Text
              className={`text-[13px] ${
                selected ? "font-semibold text-[#1C1C1E]" : "font-medium text-[#8E8E93]"
              }`}>
              {option.label}
            </Text>
          </Pressable>
        )
      })}
    </View>
  )
}
