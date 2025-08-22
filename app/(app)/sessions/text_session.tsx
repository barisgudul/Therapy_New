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

  // Hoş Geldin Component'i
  const WelcomeComponent = () => (
    <View style={styles.welcomeContainer}>
      <View style={styles.welcomeIconContainer}>
        <LinearGradient
          colors={[Colors.light.tint, 'rgba(255,255,255,0.9)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.welcomeIconGradient}
        >
          <Ionicons
            name="chatbubble-ellipses-outline"
            size={48}
            color={Colors.light.tint}
          />
        </LinearGradient>
      </View>
      <Text style={styles.welcomeTitle}>İçini Dökmeye Hazır Mısın?</Text>
      <Text style={styles.welcomeSubtitle}>
        Düşüncelerin, yargılanmadan dinlenmek için burada.
      </Text>
    </View>
  );



  // Refresh feature access on mount
  useEffect(() => {
    refresh();
  }, [refresh]);

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

            <Text style={styles.headerTitle}>Sohbet</Text>



            <KeyboardAvoidingView
              style={styles.keyboardAvoidingView}
              behavior={Platform.OS === "ios" ? "padding" : undefined}
              keyboardVerticalOffset={Platform.OS === "ios" ? 5 : 0}
            >
              <View style={styles.content}>
                {messages.length === 0 ? (
                  // Hoş Geldin Ekranı
                  <View style={styles.welcomeWrapper}>
                    <WelcomeComponent />
                  </View>
                ) : (
                  // Sohbet Ekranı
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
                )}

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
  headerTitle: {
    position: "absolute",
    top: Platform.OS === "ios" ? 55 : 25,
    left: 0,
    right: 0,
    textAlign: "center",
    fontSize: 18,
    fontWeight: "600",
    color: Colors.light.tint,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  keyboardAvoidingView: {
    flex: 1,
    marginTop: Platform.OS === "ios" ? 80 : 50, // Header için alan bırak
  },
  content: {
    flex: 1,
    justifyContent: "space-between",
  },
  welcomeWrapper: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  welcomeContainer: {
    alignItems: "center",
    paddingVertical: 40,
  },
  welcomeIconContainer: {
    marginBottom: 24,
  },
  welcomeIconGradient: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: Colors.light.tint,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: Colors.light.tint,
    textAlign: "center",
    marginBottom: 12,
  },
  welcomeSubtitle: {
    fontSize: 16,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 24,
    paddingHorizontal: 20,
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
