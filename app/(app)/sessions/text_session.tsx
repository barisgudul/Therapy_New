// app/sessions/text_session.tsx
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router/";
import React, { useEffect, useRef, memo } from "react";
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
import { PremiumGate } from "../../../components/PremiumGate";
import { Colors } from "../../../constants/Colors";
import { useFeatureAccess } from "../../../hooks/useSubscription";
import { useTextSessionReducer } from "../../../hooks";
import { TextSessionState } from "../../../hooks/useTextSessionReducer";
import { TypingIndicator } from "../../../components/text_session/TypingIndicator";
import { MessageBubble } from "../../../components/text_session/MessageBubble";
import { InputBar } from "../../../components/text_session/InputBar";
import { MemoryModal } from "../../../components/text_session/MemoryModal";
import { useTranslation } from "react-i18next";

// YENİ COMPONENT: SessionUI - Memo ile optimize edilmiş
interface SessionUIProps {
  state: TextSessionState;
  isDark: boolean;
  handleBackPress: () => boolean;
  closeMemoryModal: () => void;
  handleInputChange: (text: string) => void;
  sendMessage: () => Promise<void>;
  inputRef: React.RefObject<TextInput>;
  flatListRef: React.RefObject<FlatList>;
}

const SessionUI = memo<SessionUIProps>(({
  state,
  isDark,
  handleBackPress,
  closeMemoryModal,
  handleInputChange,
  sendMessage,
  inputRef,
  flatListRef
}) => {
  const { messages, input, isTyping, error, isMemoryModalVisible, selectedMemory } = state;

  // Hoş Geldin Component'i
  const { t } = useTranslation();
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
      <Text style={styles.welcomeTitle}>{t("text_session.welcome_title")}</Text>
      <Text style={styles.welcomeSubtitle}>
        {t("text_session.welcome_subtitle")}
      </Text>
    </View>
  );

  return (
    <View style={styles.flex}>
      <LinearGradient
        colors={isDark ? ["#232526", "#414345"] : ["#F4F6FF", "#FFFFFF"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.container}
      >
        <SafeAreaView style={styles.flex}>
          <View style={styles.header}>
            <TouchableOpacity onPress={handleBackPress} style={styles.backButton}>
              <Ionicons
                name="chevron-back"
                size={28}
                color={isDark ? "#fff" : Colors.light.tint}
              />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>{t("text_session.header_title")}</Text>
            <View style={{ width: 44 }} />
          </View>

          <KeyboardAvoidingView
            style={styles.keyboardAvoidingView}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
          >
            <View style={styles.content}>
              {messages.length === 0 ? (
                <View style={styles.welcomeWrapper}>
                  <WelcomeComponent />
                </View>
              ) : (
                <FlatList
                  ref={flatListRef}
                  data={messages}
                  keyExtractor={(_, i) => i.toString()}
                  renderItem={({ item }) => (
                    <MessageBubble
                      message={item}
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
        </SafeAreaView>
      </LinearGradient>

      <MemoryModal
        isVisible={isMemoryModalVisible}
        memory={selectedMemory}
        onClose={closeMemoryModal}
      />
    </View>
  );
});

SessionUI.displayName = "SessionUI";

export default function TextSessionScreen() {
  const router = useRouter();
  const flatListRef = useRef<FlatList>(null);
  const inputRef = useRef<TextInput>(null);

  const { mood, eventId, pendingSessionId } = useLocalSearchParams<
    { mood?: string; eventId?: string; pendingSessionId?: string }
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
    closeMemoryModal,
  } = useTextSessionReducer({
    initialMood: mood,
    eventId: eventId,
    pendingSessionId,
    onSessionEnd: () => {
      router.replace("/");
    },
  });

  // Refresh feature access on mount
  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <PremiumGate featureType="text_sessions">
      {(loading || state.status === "initializing") ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator
            size="large"
            color={isDark ? "#fff" : Colors.light.tint}
          />
        </View>
      ) : (
        <SessionUI
          state={state}
          isDark={isDark}
          handleBackPress={handleBackPress}
          closeMemoryModal={closeMemoryModal}
          handleInputChange={handleInputChange}
          sendMessage={sendMessage}
          inputRef={inputRef}
          flatListRef={flatListRef}
        />
      )}
    </PremiumGate>
  );
  }

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  backButton: {
    // position, top, left, zIndex GİTTİ
    padding: 8,
  },
  headerTitle: {
    // position, top, left, right GİTTİ
    fontSize: 18,
    fontWeight: '600',
    color: Colors.light.tint,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  keyboardAvoidingView: {
    flex: 1, // marginTop GİTTİ
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    justifyContent: 'space-between', // InputBar'ı altta tutar
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
