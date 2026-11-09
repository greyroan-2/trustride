// Match emoji symbols and sequences without rejecting international letters or digits.
const emoji = /(?:[#*0-9]\uFE0F?\u20E3|[\p{Extended_Pictographic}\p{Regional_Indicator}\p{Emoji_Modifier}\uFE0F\u20E3])/u;
export const emojiInputMessage = "Emojis are not allowed. Please use text or numbers.";
export function containsEmoji(value: string): boolean { return emoji.test(value); }
export function emojiFormError(form: FormData): string | null {
  for (const value of form.values()) if (typeof value === "string" && containsEmoji(value)) return emojiInputMessage;
  return null;
}
