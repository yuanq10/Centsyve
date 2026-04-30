import React from "react";
import { TextInput, StyleSheet } from "react-native";

/**
 * Text input that auto-inserts dashes as the user types to produce YYYY-MM-DD.
 * Accepts `value` and `onChangeText` like a regular TextInput.
 */
export default function DateInput({ value, onChangeText, style }) {
  const handleChange = (text) => {
    // Strip non-digits
    const digits = text.replace(/\D/g, "").slice(0, 8);
    let formatted = digits;
    if (digits.length > 4) {
      formatted = digits.slice(0, 4) + "-" + digits.slice(4);
    }
    if (digits.length > 6) {
      formatted = digits.slice(0, 4) + "-" + digits.slice(4, 6) + "-" + digits.slice(6);
    }
    onChangeText(formatted);
  };

  return (
    <TextInput
      style={[styles.input, style]}
      value={value}
      onChangeText={handleChange}
      placeholder="YYYY-MM-DD"
      placeholderTextColor="#aaa"
      keyboardType="number-pad"
      maxLength={10}
    />
  );
}

const styles = StyleSheet.create({
  input: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: "#222",
  },
});
