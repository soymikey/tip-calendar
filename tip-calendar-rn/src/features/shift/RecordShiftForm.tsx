import { useState, type ReactNode } from "react"
import {
  ActionSheetIOS,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Switch,
  Text,
  View,
} from "react-native"
import DateTimePicker from "@react-native-community/datetimepicker"
import { SafeAreaView } from "react-native-safe-area-context"
import { SymbolView } from "expo-symbols"

import { PrimaryButton } from "@/components/PrimaryButton"
import { SegmentedControl } from "@/components/SegmentedControl"
import { TextField } from "@/components/TextField"
import { parseLocalDate } from "@/domain/calendar"
import { centsToDollars, dollarsToCents, formatUsd } from "@/domain/money"
import type { PayType, Restaurant, ShiftTag, TipOutRule } from "@/domain/restaurant"
import { colors } from "@/theme/colors"

import { calculationBreakdown } from "./calculationBreakdown"
import {
  canSaveShift,
  previewShiftIncome,
  resolveShiftHours,
  type ShiftDraft,
} from "./shiftDraft"
import { validateShiftDraft } from "./shiftValidation"

type RecordShiftFormProps = {
  localDate: string
  restaurant: Restaurant
  restaurants?: Restaurant[]
  mode?: "create" | "edit"
  initialDraft?: ShiftDraft
  saving?: boolean
  timeFormat?: "12h" | "24h"
  onRestaurantChange?: (restaurant: Restaurant) => void
  onCancel: () => void
  onSave: (draft: ShiftDraft) => Promise<void>
}

function formatShiftDateTitle(localDate: string, weekday: "short" | "long"): string {
  return parseLocalDate(localDate).toLocaleDateString("en-US", {
    weekday,
    month: "long",
    day: "numeric",
  })
}

function hoursToField(hours: number): string {
  return hours > 0 ? String(hours) : ""
}

function centsToField(cents: number): string {
  return cents > 0 ? String(centsToDollars(cents)) : ""
}

function parseHours(value: string): number {
  const amount = Number(value.trim())
  return Number.isFinite(amount) && amount >= 0 ? amount : 0
}

function parseMoney(value: string): number {
  const trimmed = value.trim()
  if (!trimmed) {
    return 0
  }
  const amount = Number(trimmed)
  if (!Number.isFinite(amount) || amount < 0) {
    return 0
  }
  return dollarsToCents(amount)
}

function parsePercent(value: string): number {
  const amount = Number(value.trim())
  return Number.isFinite(amount) && amount >= 0 ? amount : 0
}

function pad(value: number): string {
  return String(value).padStart(2, "0")
}

function hhmmToDate(hhmm: string): Date {
  const [hours, minutes] = hhmm.split(":").map(Number)
  const date = new Date()
  date.setHours(hours || 0, minutes || 0, 0, 0)
  return date
}

function dateToHHmm(date: Date): string {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function formatClockDisplay(hhmm: string, timeFormat: "12h" | "24h"): string {
  const date = hhmmToDate(hhmm)
  if (timeFormat === "24h") {
    return `${pad(date.getHours())}:${pad(date.getMinutes())}`
  }
  return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
}

function formatHoursLabel(hours: number): string {
  return Number.isInteger(hours) ? String(hours) : String(hours)
}

function fieldMessage(
  messages: ReturnType<typeof validateShiftDraft>,
  field: "hours" | "cashTips" | "cardTips" | "tipOut" | "unpaidBreak",
) {
  return messages.find((item) => item.field === field)
}

export function RecordShiftForm({
  localDate,
  restaurant,
  restaurants = [],
  mode = "create",
  initialDraft,
  saving = false,
  timeFormat = "12h",
  onRestaurantChange,
  onCancel,
  onSave,
}: RecordShiftFormProps) {
  const [hoursText, setHoursText] = useState(() => hoursToField(initialDraft?.hours ?? 0))
  const [cashText, setCashText] = useState(() => centsToField(initialDraft?.cashTipsCents ?? 0))
  const [cardText, setCardText] = useState(() => centsToField(initialDraft?.cardTipsCents ?? 0))
  const [basePayOpen, setBasePayOpen] = useState(false)
  const [tipOutOpen, setTipOutOpen] = useState(false)
  const [moreOpen, setMoreOpen] = useState(() =>
    Boolean(initialDraft?.tag || initialDraft?.useClock || initialDraft?.note || (initialDraft?.otherIncomeCents ?? 0) > 0),
  )
  const [showBreakdown, setShowBreakdown] = useState(false)
  const [payType, setPayType] = useState<PayType>(initialDraft?.payType ?? restaurant.payType)
  const [payAmountText, setPayAmountText] = useState(() =>
    centsToField(initialDraft?.payAmountCents ?? restaurant.payAmountCents),
  )
  const [tipOutRule, setTipOutRule] = useState<TipOutRule>(
    initialDraft?.tipOutRule ?? restaurant.defaultTipOutRule,
  )
  const [tipAmountText, setTipAmountText] = useState(() =>
    initialDraft?.tipOutRule?.type === "fixed"
      ? centsToField(initialDraft.tipOutRule.amountCents)
      : restaurant.defaultTipOutRule.type === "fixed"
        ? centsToField(restaurant.defaultTipOutRule.amountCents)
        : "",
  )
  const [tipPercentText, setTipPercentText] = useState(() => {
    const rule = initialDraft?.tipOutRule ?? restaurant.defaultTipOutRule
    return rule.type === "sales_percent" || rule.type === "tips_percent" ? String(rule.percent) : ""
  })
  const [salesText, setSalesText] = useState(() => centsToField(initialDraft?.salesCents ?? 0))
  const [tag, setTag] = useState<ShiftTag | undefined>(initialDraft?.tag)
  const [useClock, setUseClock] = useState(Boolean(initialDraft?.useClock))
  const [clockIn, setClockIn] = useState(initialDraft?.clockIn ?? "18:00")
  const [clockOut, setClockOut] = useState(initialDraft?.clockOut ?? "00:30")
  const [picking, setPicking] = useState<"in" | "out" | null>(null)
  const [breakMinutesText, setBreakMinutesText] = useState(() => {
    const hours = initialDraft?.unpaidBreakHours ?? 0
    return hours > 0 ? String(Math.round(hours * 60)) : ""
  })
  const [otherText, setOtherText] = useState(() => centsToField(initialDraft?.otherIncomeCents ?? 0))
  const [note, setNote] = useState(initialDraft?.note ?? "")
  const isEdit = mode === "edit"
  const canPickRestaurant = restaurants.length > 1 && Boolean(onRestaurantChange)

  const unpaidBreakHours = (parseHours(breakMinutesText) || 0) / 60
  const draft: ShiftDraft = {
    localDate,
    restaurantId: restaurant.id,
    hours: parseHours(hoursText),
    cashTipsCents: parseMoney(cashText),
    cardTipsCents: parseMoney(cardText),
    unpaidBreakHours,
    otherIncomeCents: parseMoney(otherText),
    salesCents: tipOutRule.type === "sales_percent" ? parseMoney(salesText) : undefined,
    note,
    tag,
    clockIn,
    clockOut,
    useClock,
    payType,
    payAmountCents: parseMoney(payAmountText),
    tipOutRule,
  }
  const { hours, overnight } = resolveShiftHours(draft)
  const income = previewShiftIncome(draft, restaurant)
  const messages = validateShiftDraft(draft, restaurant)
  const canSave = canSaveShift(draft) && !messages.some((item) => item.tone === "error") && !saving
  const breakdown = calculationBreakdown(draft, restaurant, income)
  const hoursMessage = fieldMessage(messages, "hours")
  const cashMessage = fieldMessage(messages, "cashTips")
  const cardMessage = fieldMessage(messages, "cardTips")
  const tipOutMessage = fieldMessage(messages, "tipOut")
  const breakMessage = fieldMessage(messages, "unpaidBreak")
  const hourlyLabel =
    income.effectiveHourlyCents === null ? "—" : `${formatUsd(income.effectiveHourlyCents)}/hr`
  const tipOutLabel =
    income.tipOutCents > 0 ? `-${formatUsd(income.tipOutCents)}` : formatUsd(0)

  function pickRestaurant() {
    if (!canPickRestaurant || !onRestaurantChange) {
      return
    }
    ActionSheetIOS.showActionSheetWithOptions(
      {
        options: [...restaurants.map((item) => item.name), "Cancel"],
        cancelButtonIndex: restaurants.length,
      },
      (index) => {
        const next = restaurants[index]
        if (!next) {
          return
        }
        onRestaurantChange(next)
        setPayType(next.payType)
        setPayAmountText(centsToField(next.payAmountCents))
        setTipOutRule(next.defaultTipOutRule)
      },
    )
  }

  function changeTipKind(kind: TipOutRule["type"]) {
    if (kind === "none") {
      setTipOutRule({ type: "none" })
      return
    }
    if (kind === "fixed") {
      setTipOutRule({ type: "fixed", amountCents: parseMoney(tipAmountText) })
      return
    }
    if (kind === "sales_percent") {
      setTipOutRule({ type: "sales_percent", percent: parsePercent(tipPercentText) })
      return
    }
    setTipOutRule({ type: "tips_percent", percent: parsePercent(tipPercentText) })
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View className="flex-row items-center border-b border-[#E5E5EA] px-5 py-3">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Cancel"
            className="min-h-[44px] w-[52px] justify-center"
            onPress={onCancel}>
            <Text className="text-[16px] font-medium" style={{ color: colors.action }}>
              Cancel
            </Text>
          </Pressable>
          <View className="flex-1 items-center">
            <Text className="text-center text-[17px] font-semibold text-[#1C1C1E]">
              {isEdit ? "Edit Shift" : formatShiftDateTitle(localDate, "short")}
            </Text>
            {isEdit ? (
              <Text className="text-center text-[13px] text-[#8E8E93]">
                {formatShiftDateTitle(localDate, "long")}
              </Text>
            ) : null}
          </View>
          <View className="w-[52px]" />
        </View>

        <ScrollView className="flex-1" contentContainerStyle={{ gap: 16, padding: 20 }}>
          <Pressable disabled={!canPickRestaurant} onPress={pickRestaurant}>
            <View className="gap-1.5">
              <Text className="text-[12px] font-semibold uppercase text-[#8E8E93]">Restaurant</Text>
              <View
                className="h-11 flex-row items-center rounded-[10px] px-3.5"
                style={{ backgroundColor: colors.parchment }}>
                <Text className="flex-1 text-[15px] text-[#1C1C1E]">{restaurant.name}</Text>
                {canPickRestaurant ? (
                  <SymbolView
                    name="chevron.down"
                    size={16}
                    tintColor="#8E8E93"
                    fallback={<Text className="text-[#8E8E93]">⌄</Text>}
                  />
                ) : null}
              </View>
            </View>
          </Pressable>

          {useClock ? null : (
            <TextField
              label="Hours worked"
              keyboardType="decimal-pad"
              placeholder="0"
              value={hoursText}
              tone={hoursMessage?.tone ?? "default"}
              message={hoursMessage && hoursText ? hoursMessage.message : undefined}
              onChangeText={setHoursText}
            />
          )}

          <View className="flex-row gap-3">
            <View className="flex-1">
              <TextField
                label="Cash Tips"
                prefix="$"
                keyboardType="decimal-pad"
                placeholder="0.00"
                value={cashText}
                tone={cashMessage?.tone ?? "default"}
                message={cashMessage?.message}
                onChangeText={setCashText}
              />
            </View>
            <View className="flex-1">
              <TextField
                label="Card Tips"
                prefix="$"
                keyboardType="decimal-pad"
                placeholder="0.00"
                value={cardText}
                tone={cardMessage?.tone ?? "default"}
                message={cardMessage?.message}
                onChangeText={setCardText}
              />
            </View>
          </View>

          <Expander title="Base Pay" open={basePayOpen} onToggle={() => setBasePayOpen((value) => !value)}>
            <SegmentedControl
              options={[
                { value: "hourly", label: "Hourly" },
                { value: "fixed", label: "Per Shift" },
                { value: "none", label: "No Base Pay" },
              ]}
              value={payType}
              onChange={setPayType}
            />
            {payType === "none" ? null : (
              <TextField
                label={payType === "hourly" ? "Hourly rate" : "Shift pay"}
                prefix="$"
                keyboardType="decimal-pad"
                placeholder="0.00"
                value={payAmountText}
                onChangeText={setPayAmountText}
              />
            )}
            {payType === "hourly" ? (
              <Text className="text-[13px] text-[#8E8E93]">
                HOURS {formatHoursLabel(hours)} hrs (from shift duration)
              </Text>
            ) : null}
            <Text className="text-[15px] font-semibold text-[#1C1C1E]">
              Base pay amount: {formatUsd(income.wageIncomeCents)}
            </Text>
          </Expander>

          <Expander title="Tip-out" open={tipOutOpen} onToggle={() => setTipOutOpen((value) => !value)}>
            <SegmentedControl
              options={[
                { value: "none", label: "None" },
                { value: "fixed", label: "Fixed" },
                { value: "sales_percent", label: "% Sales" },
                { value: "tips_percent", label: "% Tips" },
              ]}
              value={tipOutRule.type}
              onChange={changeTipKind}
            />
            {tipOutRule.type === "fixed" ? (
              <TextField
                label="Amount"
                prefix="$"
                keyboardType="decimal-pad"
                placeholder="0.00"
                value={tipAmountText}
                onChangeText={(value) => {
                  setTipAmountText(value)
                  setTipOutRule({ type: "fixed", amountCents: parseMoney(value) })
                }}
              />
            ) : null}
            {tipOutRule.type === "sales_percent" || tipOutRule.type === "tips_percent" ? (
              <TextField
                label="Percentage"
                suffix="%"
                keyboardType="decimal-pad"
                placeholder="0"
                value={tipPercentText}
                tone={tipOutMessage?.tone ?? "default"}
                message={tipOutMessage?.message}
                onChangeText={(value) => {
                  setTipPercentText(value)
                  setTipOutRule({
                    type: tipOutRule.type,
                    percent: parsePercent(value),
                  })
                }}
              />
            ) : null}
            {tipOutRule.type === "sales_percent" ? (
              <TextField
                label="Sales"
                prefix="$"
                keyboardType="decimal-pad"
                placeholder="0.00"
                value={salesText}
                onChangeText={setSalesText}
              />
            ) : null}
            <TipOutHelp rule={tipOutRule} incomeCents={income.tipOutCents} totalTipsCents={income.totalTipsCents} />
            <Text className="text-[15px] font-semibold text-[#1C1C1E]">
              Tip-out amount: {formatUsd(income.tipOutCents)}
            </Text>
          </Expander>

          <Expander title="More Options" open={moreOpen} onToggle={() => setMoreOpen((value) => !value)}>
            <Text className="text-[12px] font-semibold uppercase text-[#8E8E93]">Shift Tag (optional)</Text>
            <View className="flex-row gap-2.5">
              <TagPill label="Lunch" selected={tag === "lunch"} onPress={() => setTag(tag === "lunch" ? undefined : "lunch")} />
              <TagPill
                label="Dinner"
                selected={tag === "dinner"}
                onPress={() => setTag(tag === "dinner" ? undefined : "dinner")}
              />
            </View>
            <View className="h-px bg-[#E5E5EA]" />
            <View className="flex-row items-center justify-between gap-3">
              <View className="flex-1 gap-0.5">
                <Text className="text-[15px] font-semibold text-[#1C1C1E]">Use clock in/out instead</Text>
                <Text className="text-[13px] text-[#8E8E93]">
                  Switches to Clock In and Clock Out time pickers.
                </Text>
              </View>
              <Switch
                value={useClock}
                onValueChange={setUseClock}
                trackColor={{ true: "#34C759" }}
              />
            </View>
            {useClock ? (
              <View className="gap-3">
                <View className="flex-row gap-3">
                  <TimeButton
                    label="Clock In"
                    value={formatClockDisplay(clockIn, timeFormat)}
                    onPress={() => setPicking(picking === "in" ? null : "in")}
                  />
                  <TimeButton
                    label="Clock Out"
                    value={formatClockDisplay(clockOut, timeFormat)}
                    onPress={() => setPicking(picking === "out" ? null : "out")}
                  />
                </View>
                {overnight ? (
                  <Text className="text-right text-[12px] text-[#8E8E93]">(next day)</Text>
                ) : null}
                {picking ? (
                  <DateTimePicker
                    mode="time"
                    display="spinner"
                    value={hhmmToDate(picking === "in" ? clockIn : clockOut)}
                    onChange={(_event, date) => {
                      if (!date) {
                        return
                      }
                      if (picking === "in") {
                        setClockIn(dateToHHmm(date))
                      } else {
                        setClockOut(dateToHHmm(date))
                      }
                    }}
                  />
                ) : null}
                <Text className="text-[13px] italic text-[#8E8E93]">
                  {formatHoursLabel(hours)} hrs (effective work time)
                </Text>
              </View>
            ) : null}
            <View className="h-px bg-[#E5E5EA]" />
            <View className="flex-row gap-3">
              <View className="flex-1">
                <TextField
                  label="Unpaid Break"
                  suffix="min"
                  keyboardType="number-pad"
                  placeholder="0"
                  value={breakMinutesText}
                  tone={breakMessage?.tone ?? "default"}
                  message={breakMessage?.message}
                  onChangeText={setBreakMinutesText}
                />
              </View>
              <View className="flex-1">
                <TextField
                  label="Other Income"
                  prefix="$"
                  keyboardType="decimal-pad"
                  placeholder="0.00"
                  value={otherText}
                  onChangeText={setOtherText}
                />
              </View>
            </View>
            <TextField
              label="Notes (optional)"
              placeholder="e.g. Holiday, large party..."
              value={note}
              multiline
              onChangeText={setNote}
            />
          </Expander>

          <View className="gap-3 rounded-xl p-4" style={{ backgroundColor: colors.parchment }}>
            <View className="flex-row items-center justify-between">
              <Text className="text-[12px] font-semibold uppercase text-[#8E8E93]">Results</Text>
              <Pressable onPress={() => setShowBreakdown((value) => !value)}>
                <Text className="text-[13px] font-medium" style={{ color: colors.action }}>
                  {showBreakdown ? "Hide details" : "? How is this calculated?"}
                </Text>
              </Pressable>
            </View>
            {showBreakdown ? (
              <View className="gap-2">
                <View className="flex-row items-center justify-between">
                  <Text className="text-[14px] font-bold text-[#1C1C1E]">How this is calculated</Text>
                  <Text className="text-[13px] text-[#8E8E93]">Basis: {breakdown.basis}</Text>
                </View>
                {breakdown.lines.map((line) => (
                  <View key={line.label} className="gap-1">
                    <View className="flex-row items-start justify-between gap-3">
                      <Text
                        className="flex-1 text-[13px]"
                        style={{
                          color: line.tone === "sum" || line.tone === "net" ? "#1C1C1E" : "#8E8E93",
                          fontWeight: line.tone === "sum" || line.tone === "net" ? "700" : "400",
                        }}>
                        {line.label}
                      </Text>
                      <Text
                        className="text-right text-[13px]"
                        style={{
                          color:
                            line.tone === "net"
                              ? colors.income
                              : line.tone === "deduct"
                                ? colors.danger
                                : "#1C1C1E",
                          fontWeight: line.tone === "net" ? "700" : "500",
                          fontSize: line.tone === "net" ? 20 : 13,
                        }}>
                        {line.value}
                      </Text>
                    </View>
                    {line.hint ? <Text className="text-[11px] text-[#8E8E93]">{line.hint}</Text> : null}
                  </View>
                ))}
              </View>
            ) : (
              <>
                <ResultRow label="Total Tips" value={formatUsd(income.totalTipsCents)} />
                <ResultRow label="Wages" value={formatUsd(income.wageIncomeCents)} />
                <ResultRow label="Tip-out" value={tipOutLabel} />
                <View className="gap-1.5">
                  <View className="flex-row items-center justify-between">
                    <Text className="text-[14px] text-[#8E8E93]">Net Income</Text>
                    <Text className="text-[28px] font-bold" style={{ color: colors.income }}>
                      {formatUsd(income.netIncomeCents)}
                    </Text>
                  </View>
                  <Text className="text-[12px] text-[#8E8E93]">
                    Net income ≠ cash received this shift
                  </Text>
                </View>
                <ResultRow label="Actual Hourly" value={hourlyLabel} />
              </>
            )}
          </View>
        </ScrollView>

        <View className="px-5 pb-2 pt-3">
          <PrimaryButton
            label={isEdit ? "Save Changes" : "Save Shift"}
            disabled={!canSave}
            onPress={() => {
              void onSave(draft)
            }}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

function Expander({
  title,
  open,
  onToggle,
  children,
}: {
  title: string
  open: boolean
  onToggle: () => void
  children: ReactNode
}) {
  return (
    <View className="gap-2">
      <Pressable accessibilityRole="button" onPress={onToggle}>
        <Text className="text-[14px] font-semibold" style={{ color: colors.action }}>
          {open ? `− ${title}` : `+ ${title}`}
        </Text>
      </Pressable>
      {open ? (
        <View className="gap-3 rounded-xl p-4" style={{ backgroundColor: colors.parchment }}>
          {children}
        </View>
      ) : null}
    </View>
  )
}

function TagPill({
  label,
  selected,
  onPress,
}: {
  label: string
  selected: boolean
  onPress: () => void
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      className="h-9 flex-1 items-center justify-center rounded-lg"
      style={{ backgroundColor: selected ? colors.action : colors.canvas, borderWidth: selected ? 0 : 1, borderColor: "#E5E5EA" }}
      onPress={onPress}>
      <Text className={`text-[14px] ${selected ? "font-semibold text-white" : "font-medium text-[#8E8E93]"}`}>
        {label}
      </Text>
    </Pressable>
  )
}

function TimeButton({ label, value, onPress }: { label: string; value: string; onPress: () => void }) {
  return (
    <Pressable className="flex-1 gap-1.5" onPress={onPress}>
      <Text className="text-[12px] font-semibold uppercase text-[#8E8E93]">{label}</Text>
      <View className="h-11 justify-center rounded-[10px] bg-white px-3.5">
        <Text className="text-[16px] text-[#1C1C1E]">{value}</Text>
      </View>
    </Pressable>
  )
}

function TipOutHelp({
  rule,
  incomeCents,
  totalTipsCents,
}: {
  rule: TipOutRule
  incomeCents: number
  totalTipsCents: number
}) {
  if (rule.type === "none") {
    return <Text className="text-[13px] text-[#8E8E93]">No tip-out will be deducted.</Text>
  }
  if (rule.type === "fixed") {
    return <Text className="text-[13px] text-[#8E8E93]">A fixed amount is deducted each shift.</Text>
  }
  if (rule.type === "sales_percent") {
    return (
      <Text className="text-[13px] text-[#8E8E93]">
        A percentage of sales is deducted.
      </Text>
    )
  }
  return (
    <Text className="text-[13px] text-[#8E8E93]">
      Calculated as {rule.percent}% of total tips ({formatUsd(totalTipsCents)}) = {formatUsd(incomeCents)}
    </Text>
  )
}

function ResultRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row items-center justify-between">
      <Text className="text-[14px] text-[#8E8E93]">{label}</Text>
      <Text className="text-[14px] font-semibold text-[#1C1C1E]">{value}</Text>
    </View>
  )
}
