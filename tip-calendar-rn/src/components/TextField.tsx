import { Text, TextInput, View, type KeyboardTypeOptions } from "react-native"

type TextFieldProps = {
  label: string
  value: string
  placeholder?: string
  onChangeText: (value: string) => void
  keyboardType?: KeyboardTypeOptions
  prefix?: string
  suffix?: string
  accessibilityLabel?: string
  variant?: "filled" | "outline"
}

export function TextField({
  label,
  value,
  placeholder,
  onChangeText,
  keyboardType = "default",
  prefix,
  suffix,
  accessibilityLabel,
  variant = "filled",
}: TextFieldProps) {
  const fieldClass =
    variant === "outline"
      ? "flex-row items-center rounded-[10px] border border-[#E5E5EA] bg-white px-4 py-3"
      : "flex-row items-center rounded-[10px] bg-[#F2F2F7] px-4 py-3"

  return (
    <View className="w-full gap-2">
      <Text className="text-[13px] font-semibold uppercase text-[#8E8E93]">{label}</Text>
      <View className={fieldClass}>
        {prefix ? <Text className="mr-1 text-[16px] text-[#8E8E93]">{prefix}</Text> : null}
        <TextInput
          accessibilityLabel={accessibilityLabel ?? label}
          className="min-h-[22px] flex-1 text-[16px] text-[#1C1C1E]"
          keyboardType={keyboardType}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#8E8E93"
          value={value}
        />
        {suffix ? <Text className="ml-1 text-[14px] text-[#8E8E93]">{suffix}</Text> : null}
      </View>
    </View>
  )
}
