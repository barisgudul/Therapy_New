// hooks/useDailyWrite.ts - KESİN FİNAL HALİ

import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router/";
import { useEffect, useRef, useState } from "react";
import { Animated, Dimensions, Easing } from "react-native";
import Toast from "react-native-toast-message";
// import { v4 as uuidv4 } from "uuid"; // Geçici olarak kullanılmıyor

import { MOOD_LEVELS } from "../constants/dailyWrite.constants";
import { useAuth } from "../context/Auth";
// 🎯 FAZ 1: Strategic Query Router ile arka planda güçlendirme
import { incrementFeatureUsage } from "../services/api.service";
import { logEvent } from "../services/event.service";
// import { InteractionContext } from "../types/context"; // Geçici olarak kullanılmıyor
import { getErrorMessage } from "../utils/errors";
import { useFeatureAccess } from "./useSubscription";
import { useUpdateVault, useVault } from "./useVault"; // GÜNCEL İMPORT

const { width, height } = Dimensions.get("window");

export function useDailyWrite() {
  const router = useRouter();
  const { user } = useAuth();

  // const vault = useVaultStore((s) => s.vault); // ÖLDÜ
  // const updateAndSyncVault = useVaultStore((s) => s.updateAndSyncVault); // ÖLDÜ

  // YERİNE:
  const { data: vault } = useVault();
  const { mutate: updateVault } = useUpdateVault();

  const [moodValue, setMoodValue] = useState(3);
  const [note, setNote] = useState("");
  const [inputVisible, setInputVisible] = useState(false);
  const [feedbackVisible, setFeedbackVisible] = useState(false);

  const [aiMessage, setAiMessage] = useState("");
  const [saving, setSaving] = useState(false);

  const entryAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const light1 = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const light2 = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;

  const { can_use, loading, used_count, limit_count, refresh } =
    useFeatureAccess("daily_write");

  useEffect(() => {
    if (user?.id) {
      refresh();
    }
  }, [user?.id, refresh]);

  useEffect(() => {
    const createDriftLoop = (
      animValue: Animated.ValueXY,
      toX: number,
      toY: number,
      durationGo: number,
      durationBack: number,
    ) => {
      return Animated.loop(
        Animated.sequence([
          Animated.timing(animValue, {
            toValue: { x: toX, y: toY },
            duration: durationGo,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(animValue, {
            toValue: { x: 0, y: 0 },
            duration: durationBack,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
      );
    };

    createDriftLoop(light1, -width / 3, height / 4, 15000, 18000).start();
    const timer = setTimeout(() => {
      createDriftLoop(light2, width / 3.5, -height / 3, 13000, 16000).start();
    }, 4000);

    Animated.timing(entryAnim, {
      toValue: 1,
      duration: 800,
      easing: Easing.out(Easing.exp),
      useNativeDriver: true,
    }).start();

    return () => clearTimeout(timer);
  }, [light1, light2, entryAnim]);

  const animatePress = () => {
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.96,
        duration: 120,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 5,
        useNativeDriver: true,
      }),
    ]).start();
  };

  async function saveSession() {
    if (!note || saving) return;
    setSaving(true);
    setAiMessage("Size özel bir yansıma hazırlanıyor...");
    setFeedbackVisible(true);

    try {
      // ÖNCE kullanım hakkını artır
      await incrementFeatureUsage("daily_write");

      // 🎯 FAZ 1: Strategic Query Router ile gerçek AI analizi

      const todayMood = MOOD_LEVELS[Math.round(moodValue)].label;

      // Orchestration service'i çağır
      const { processUserMessage } = await import(
        "../services/orchestration.service"
      );

      const result = await processUserMessage(user!.id, {
        type: "daily_reflection",
        mood: todayMood,
        data: {
          todayNote: note,
          todayMood: todayMood,
        },
      });

      // Sonuç string ise direkt kullan, yoksa fallback
      const isValidString = typeof result === "string" &&
        result.trim().length > 0;

      const aiResponse = isValidString
        ? result as string
        : `Bugün ${todayMood.toLowerCase()} hissettiğin için teşekkürler. Yazdıkların çok değerli.

💭 **Unutma:** Ben senin düşüncelerini anlamana yardımcı olan bir aracım. Nihai kararlar ve hisler sana aittir.`;

      // Direkt state güncellemesi yeterli
      setAiMessage(aiResponse);
    } catch (err) {
      setAiMessage("Yansıma oluşturulamadı. Lütfen tekrar dene.");
      Toast.show({
        type: "error",
        text1: "Hata",
        text2: getErrorMessage(err),
      });
      logEvent({
        type: "daily_write_error",
        data: { msg: getErrorMessage(err) },
      });
    } finally {
      setSaving(false);
    }
  }

  async function closeFeedback() {
    setFeedbackVisible(false);
    const todayMood = MOOD_LEVELS[Math.round(moodValue)].label;
    const todayString = new Date().toISOString().split("T")[0];

    try {
      // Tüm async işlemleri tek try içinde
      await logEvent({
        type: "daily_reflection",
        mood: todayMood,
        data: { text: note, aiResponse: aiMessage },
      });

      // const currentVault = useVaultStore.getState().vault; // Bu tamamen ölü.
      if (vault) { // useVault'tan gelen datayı kullan.
        const newVault = {
          ...vault,
          metadata: {
            ...vault.metadata,
            lastDailyReflectionDate: todayString,
            dailyMessageContent: aiMessage,
          },
        };
        // await updateAndSyncVault(newVault); // Öldü.
        updateVault(newVault); // Yeni kral.
      }

      // Başarılı tamamlanma
      setNote("");
      setAiMessage("");
      router.back();
    } catch (err) {
      // Kullanıcıya anlamlı mesaj, veri kaybı yok
      Toast.show({
        type: "error",
        text1: "Bağlantı Hatası",
        text2: "Bir hata oldu ama yazdıklarını kaybetmedin, sonra tekrar dene.",
      });
      console.error("Vault/Log hatası:", getErrorMessage(err));
    }
  }

  const fadeIn = {
    opacity: entryAnim,
    transform: [{
      scale: entryAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0.95, 1],
      }),
    }],
  };

  return {
    state: {
      moodValue,
      note,
      inputVisible,
      feedbackVisible,
      aiMessage,
      saving,
      freemium: { can_use, loading, used_count, limit_count },
      light1,
      light2, // Replace individual X/Y values with ValueXY
      fadeIn,
      scaleAnim,
    },
    handlers: {
      setMoodValue,
      setNote,
      setInputVisible,
      setAiMessage,
      setFeedbackVisible,
      animatePress,
      saveSession,
      closeFeedback,
      router,
      onSlidingComplete: (v: number) => {
        const roundedValue = Math.round(v);
        setMoodValue(roundedValue);
        Haptics.selectionAsync();
      },
    },
  };
}
