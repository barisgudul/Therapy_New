// components/text_session/InputBar.tsx
import React, { forwardRef, memo } from "react";
import { View, TextInput, TouchableOpacity, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "../../constants/Colors";
import { useTranslation } from "react-i18next";

interface InputBarProps {
  input: string;
  onInputChange: (text: string) => void;
  onSend: () => void;
  isTyping: boolean;
  inputRef?: React.RefObject<TextInput>;
}

export const InputBar = memo(forwardRef<TextInput, InputBarProps>(({
  input,
  onInputChange,
  onSend,
  isTyping,
  inputRef,
}, ref) => {
  const { t } = useTranslation();
  const handleFocus = () => {
    // Focus handling logic can be added here if needed
  };

  return (
    <View style={styles.inputBar}>
      <TextInput
        ref={ref || inputRef}
        style={styles.input}
        placeholder={t("text_session.input_placeholder")}
        placeholderTextColor="#9CA3AF"
        value={input}
        onChangeText={onInputChange}
        multiline
        editable={!isTyping}
        onFocus={handleFocus}
        onSubmitEditing={onSend}
        blurOnSubmit={false}
        returnKeyType="default"
      />
      <TouchableOpacity
        testID="send-button"
        onPress={onSend}
        style={[
          styles.sendButton,
          (!input.trim() || isTyping) && styles.sendButtonDisabled,
        ]}
        disabled={isTyping || !input.trim()}
      >
        <LinearGradient
          colors={["#F8FAFF", "#FFFFFF"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.sendButtonGradient}
        >
          <Ionicons
            name="send"
            size={20}
            color={Colors.light.tint}
          />
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
}));

InputBar.displayName = "InputBar";

const styles = StyleSheet.create({
  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 10,
    paddingVertical: 10,
    backgroundColor: "#F4F6FF",
    borderRadius: 25,
    marginTop: 10,
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  input: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 15,
    fontSize: 16,
    color: "#333",
    minHeight: 40,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 10,
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  sendButtonGradient: {
    width: "100%",
    height: "100%",
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
});

InputBar.displayName = "InputBar";
