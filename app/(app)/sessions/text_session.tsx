// app/sessions/text_session.tsx
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router/";
import React, { useEffect, useRef } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useColorScheme,
  View,
} from "react-native";
import { PremiumGate } from "../../../components/PremiumGate.tsx";
import { Colors } from "../../../constants/Colors";
import { useFeatureAccess } from "../../../hooks/useSubscription";
import { useTextSessionReducer } from "../../../hooks";
import { TypingIndicator } from "../../../components/text_session/TypingIndicator";
import { MessageBubble } from "../../../components/text_session/MessageBubble";
import { InputBar } from "../../../components/text_session/InputBar";
import { MemoryModal } from "../../../components/text_session/MemoryModal";

export default function TextSessionScreen() {
  const router = useRouter();
  const flatListRef = useRef<FlatList>(null);
  const inputRef = useRef<TextInput>(null);
  
  const { mood, eventId } = useLocalSearchParams<
    { mood?: string; eventId?: string }
  >();

  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  // Feature Access Hook
  const {
    loading,
    refresh,
  } = useFeatureAccess("text_sessions");

  // Main session logic hook - using useReducer for better state management
  const {
    state,
    handleInputChange,
    sendMessage,
    endSession,
    handleBackPress,
    openMemoryModal,
    closeMemoryModal,
  } = useTextSessionReducer({
    initialMood: mood,
    eventId: eventId, // eventId'yi hook'a geçir
    onSessionEnd: () => {
      router.replace("/feel/after_feeling");
    },
  });

  // Destructure state for easier access
  const { messages, input, isTyping, error, status, isMemoryModalVisible, selectedMemory } = state;



  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages, isTyping]);

  // Refresh feature access on mount
  useEffect(() => {
    refresh();
  }, [refresh]);

  // Handle input focus
  const handleFocus = () => {
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  return (
    <PremiumGate featureType="text_sessions" premiumOnly={false}>
      <LinearGradient
        colors={isDark ? ["#232526", "#414345"] : ["#F4F6FF", "#FFFFFF"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.container}
      >
        {(loading || status === 'initializing') ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator
              size="large"
              color={isDark ? "#fff" : Colors.light.tint}
            />
          </View>
        ) : (
          <>
            <TouchableOpacity onPress={handleBackPress} style={styles.back}>
              <Ionicons
                name="chevron-back"
                size={28}
                color={isDark ? "#fff" : Colors.light.tint}
              />
            </TouchableOpacity>



            <KeyboardAvoidingView
              style={styles.keyboardAvoidingView}
              behavior={Platform.OS === "ios" ? "padding" : undefined}
              keyboardVerticalOffset={Platform.OS === "ios" ? 5 : 0}
            >
              <View style={styles.content}>
                <FlatList
                  ref={flatListRef}
                  data={messages}
                  keyExtractor={(_, i) => i.toString()}
                  renderItem={({ item }) => (
                    <MessageBubble 
                      message={item} 
                      onMemoryPress={openMemoryModal}
                    />
                  )}
                  contentContainerStyle={styles.messages}
                  onContentSizeChange={() =>
                    flatListRef.current?.scrollToEnd({ animated: true })
                  }
                  keyboardShouldPersistTaps="handled"
                  showsVerticalScrollIndicator={false}
                />

                {isTyping && <TypingIndicator isVisible={isTyping} />}

                {/* Error display */}
                {error && (
                  <View style={styles.errorContainer}>
                    <Text style={styles.errorText}>{error}</Text>
                  </View>
                )}

                <InputBar
                  input={input}
                  onInputChange={handleInputChange}
                  onSend={sendMessage}
                  isTyping={isTyping}
                  inputRef={inputRef}
                />
              </View>
            </KeyboardAvoidingView>
          </>
        )}
              </LinearGradient>

        {/* YENİ: Hafıza Modal'ı */}
        <MemoryModal
          isVisible={isMemoryModalVisible}
          memory={selectedMemory}
          onClose={closeMemoryModal}
        />
      </PremiumGate>
    );
  }

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    paddingTop: Platform.OS === "ios" ? 0 : 0,
  },
  back: {
    position: "absolute",
    top: Platform.OS === "ios" ? 50 : 20,
    left: 20,
    zIndex: 10,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: "space-between",
  },
  messages: {
    paddingBottom: 100,
  },
  errorContainer: {
    backgroundColor: "#FEE2E2",
    borderWidth: 1,
    borderColor: "#FCA5A5",
    borderRadius: 8,
    padding: 12,
    marginHorizontal: 10,
    marginVertical: 8,
  },
  errorText: {
    color: "#DC2626",
    fontSize: 14,
    textAlign: "center",
  },
});
