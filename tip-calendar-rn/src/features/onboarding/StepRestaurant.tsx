import { Text, View } from "react-native"

import { TextField } from "@/components/TextField"
import type { OnboardingDraft } from "./onboardingDraft"

type StepRestaurantProps = {
  draft: OnboardingDraft
  onChangeName: (name: string) => void
}

export function StepRestaurant({ draft, onChangeName }: StepRestaurantProps) {
  return (
    <View className="w-full gap-5">
      <TextField
        label="Restaurant name"
        placeholder="e.g., The Olive Garden"
        value={draft.name}
        onChangeText={onChangeName}
      />
      <Text className="text-[14px] text-[#8E8E93]">This will be set as your default restaurant.</Text>
    </View>
  )
}
