import { Text, TextInput, View, type KeyboardTypeOptions } from "react-native"

import { colors } from "@/theme/colors"

type TextFieldProps = {
  label: string
  value: string
  placeholder?: string
  onChangeText: (value: string) => void
  keyboardType?: KeyboardTypeOptions
  prefix?: string
  suffix?: string
  accessibilityLabel?: string
  testID?: string
  variant?: "filled" | "outline"
  tone?: "default" | "error" | "warning"
  message?: string
  editable?: boolean
  multiline?: boolean
  labelRight?: string
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
  testID,
  variant = "filled",
  tone = "default",
  message,
  editable = true,
  multiline = false,
  labelRight,
}: TextFieldProps) {
  const borderColor =
    tone === "error" ? colors.danger : tone === "warning" ? colors.warning : "#E5E5EA"
  const labelColor =
    tone === "error" ? colors.danger : tone === "warning" ? colors.warning : "#8E8E93"
  const backgroundColor = variant === "filled" ? "#F2F2F7" : colors.canvas

  return (
    <View className="w-full gap-1.5">
      <View className="flex-row items-center justify-between">
        <Text className="text-[12px] font-semibold uppercase" style={{ color: labelColor }}>
          {label}
        </Text>
        {labelRight ? <Text className="text-[12px] text-[#8E8E93]">{labelRight}</Text> : null}
      </View>
      <View
        className={`flex-row items-start rounded-[10px] px-3.5 ${multiline ? "py-3" : "items-center py-3"}`}
        style={{
          borderWidth: 1,
          borderColor,
          backgroundColor: editable ? backgroundColor : colors.parchment,
          opacity: editable ? 1 : 0.5,
        }}>
        {prefix ? <Text className="mr-1 text-[16px] text-[#8E8E93]">{prefix}</Text> : null}
        <TextInput
          accessibilityLabel={accessibilityLabel ?? label}
          testID={testID}
          className="min-h-[22px] flex-1 text-[16px] text-[#1C1C1E]"
          editable={editable}
          keyboardType={keyboardType}
          multiline={multiline}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#8E8E93"
          value={value}
        />
        {suffix ? <Text className="ml-1 text-[14px] text-[#8E8E93]">{suffix}</Text> : null}
      </View>
      {message ? (
        <Text className="text-[12px]" style={{ color: labelColor }}>
          {message}
        </Text>
      ) : null}
    </View>
  )
}
