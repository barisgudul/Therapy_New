// app/DailyWriteScreen.tsx
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
    Dimensions,
    Modal,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import * as Animatable from 'react-native-animatable';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { Colors } from '../constants/Colors';
import { generateDailyReflectionResponse } from '../hooks/useGemini';
import { checkAndUpdateBadges } from '../utils/badges';
import { calculateStreak, getTotalEntries } from '../utils/helpers';
import { statisticsManager } from '../utils/statisticsManager';

const moods = ['😊', '😔', '😡', '😟', '😍', '😴', '😐', '🤯'];
const moodLabels: Record<string, string> = {
  '😊': 'Neşeli bir gün',
  '😔': 'Hüzünlü bir an',
  '😡': 'Yoğun duygular',
  '😟': 'Kaygılı hisler',
  '😍': 'Aşkla dolu',
  '😴': 'Yorgunluk hissi',
  '😐': 'Dengeli bir ruh hâli',
  '🤯': 'Zihinsel yoğunluk',
};
const { width } = Dimensions.get('window');

function DailyStreak({ refresh }: { refresh: number }) {
  const [filled, setFilled] = useState<Set<string>>(new Set());

  const weekKeys = useMemo(() => {
    const now = new Date();
    const monday = new Date(now);
    monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
    return Array.from({ length: 7 }).map((_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      return d.toISOString().split('T')[0];
    });
  }, [refresh]);

  useEffect(() => {
    (async () => {
      const done = new Set<string>();
      for (const k of weekKeys)
        if (await AsyncStorage.getItem(`mood-${k}`)) done.add(k);
      setFilled(done);
    })();
  }, [weekKeys]);

  return (
    <View style={styles.streakWrapper}>
      <Text style={styles.streakTitle}>GÜNLÜK&nbsp;SERİ</Text>
      <View style={styles.streakRow}>
        {weekKeys.map((k) =>
          filled.has(k) ? (
            <Animatable.View
              key={k}
              animation="zoomIn"
              duration={500}
              style={[styles.streakDot, styles.dotActive]}
              useNativeDriver
            />
          ) : (
            <View key={k} style={[styles.streakDot, styles.dotInactive]} />
          )
        )}
      </View>
    </View>
  );
}

export default function DailyWriteScreen() {
  const router = useRouter();
  const [selectedMood, setSelectedMood] = useState('');
  const [note, setNote] = useState('');
  const [inputVisible, setInputVisible] = useState(false);
  const [feedbackVisible, setFeedbackVisible] = useState(false);
  const [aiMessage, setAiMessage] = useState('');
  const [refresh, setRefresh] = useState(Date.now());
  const [saving, setSaving] = useState(false);

  // Güvenli ekleme fonksiyonu (overwrite riski yok)
  async function appendActivity(activityKey: string, newEntry: any) {
    let prev: any[] = [];
    try {
      const prevRaw = await AsyncStorage.getItem(activityKey);
      if (prevRaw) prev = JSON.parse(prevRaw);
      if (!Array.isArray(prev)) prev = [];
    } catch {
      prev = [];
    }
    prev.push(newEntry);
    await AsyncStorage.setItem(activityKey, JSON.stringify(prev));
  }

  // Kaydet butonuna basınca
  async function saveSession() {
    if (!note || !selectedMood || saving) return;
    setSaving(true);

    const now = Date.now();
    const today = new Date(now).toISOString().split('T')[0];
    setAiMessage('AI analiz ediyor...');

    setFeedbackVisible(true);

    try {
      const personalized = await generateDailyReflectionResponse(note, selectedMood);
      setAiMessage(personalized);

      await AsyncStorage.multiSet([
        [
          `mood-${today}`,
          JSON.stringify({ mood: selectedMood, reflection: note, timestamp: now })
        ],
        ['todayDate', today],
        ['todayMessage', personalized],
        ['lastReflectionAt', String(now)],
      ]);

      // Activity array'e güvenli şekilde ekle!
      const activityKey = `activity-${today}`;
      const newEntry = { type: 'daily_write', time: now };
      await appendActivity(activityKey, newEntry);

      // İstatistikleri ANINDA güncelle (AI Analiz için)
      await statisticsManager.updateStatistics({ text: note, mood: selectedMood, date: today, source: 'daily_write' });
      // Her gün için bir kez çalışsın diye flag'i sıfırla
      await AsyncStorage.removeItem('mood-stats-initialized');

      // Rozetleri kontrol et ve güncelle
      const streak = await calculateStreak(); // Mevcut streak'i hesapla
      const totalEntries = await getTotalEntries(); // Toplam günlük sayısını al
      // Daily_write rozet kontrollerini ekle
      await checkAndUpdateBadges('daily', {
        totalEntries: totalEntries,
        streak: streak.currentStreak
      });
      // Daily writer rozetleri için özel kontrol
      if (totalEntries >= 3) {
        await checkAndUpdateBadges('daily', {
          totalEntries: totalEntries,
          dailyWriterNovice: true
        });
      }
      if (totalEntries >= 15) {
        await checkAndUpdateBadges('daily', {
          totalEntries: totalEntries,
          dailyWriterExpert: true
        });
      }
      setRefresh(Date.now());
    } catch (err) {
      setAiMessage('Sunucu hatası, lütfen tekrar deneyin.');
    }
    setSaving(false);
  }

  const closeFeedback = () => {
    setFeedbackVisible(false);
    setNote('');
    setSelectedMood('');
    router.replace('/');
  };

  return (
    <LinearGradient colors={['#F9FAFB', '#ECEFF4']} style={styles.container}>
      {/* back */}
      <TouchableOpacity onPress={() => router.back()} style={styles.back}>
        <Ionicons name="chevron-back" size={24} color={Colors.light.tint} />
      </TouchableOpacity>

      <Text style={styles.brand}>
        therapy<Text style={styles.dot}>.</Text>
      </Text>
      <Text style={styles.title}>Zihnine kulak ver.</Text>
      <Text style={styles.subtitle}>Bugün nasıl hissettiğini birlikte keşfedelim.</Text>

      <DailyStreak refresh={refresh} />

      <KeyboardAwareScrollView
        keyboardShouldPersistTaps="handled"
        extraScrollHeight={100}
        contentContainerStyle={styles.content}
      >
        <View style={styles.moodGrid}>
          {moods.map((m) => (
            <TouchableOpacity
              key={m}
              style={[styles.moodBtn, selectedMood === m && styles.selectedMood]}
              onPress={() => setSelectedMood((p) => (p === m ? '' : m))}
            >
              <Text style={styles.moodIcon}>{m}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={styles.promptCard} onPress={() => setInputVisible(true)}>
          <Ionicons name="create-outline" size={18} color={Colors.light.tint} style={{ marginRight: 8 }} />
          <Text style={[styles.promptText, note && styles.promptFilled]} numberOfLines={1}>
            {note || 'Bugünü bir cümleyle anlatmak ister misin?'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.saveBtn, (!selectedMood || !note || saving) && styles.saveDisabled]}
          onPress={saveSession}
          disabled={!selectedMood || !note || saving}
        >
          <Text style={styles.saveText}>{saving ? 'Kaydediliyor...' : 'Günlüğü Tamamla'}</Text>
        </TouchableOpacity>
      </KeyboardAwareScrollView>

      <Modal visible={inputVisible} transparent animationType="fade">
        <Pressable style={styles.overlay} onPress={() => setInputVisible(false)}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Bugün nasılsın?</Text>
            <TextInput
              style={styles.input}
              value={note}
              onChangeText={setNote}
              placeholder="Düşüncelerini buraya yaz..."
              placeholderTextColor="#9CA3AF"
              multiline
              autoFocus
            />
            <TouchableOpacity
              style={[styles.closeBtn, !note && styles.saveDisabled]}
              onPress={() => setInputVisible(false)}
              disabled={!note}
            >
              <Text style={styles.closeText}>Tamam</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>

      <Modal visible={feedbackVisible} transparent animationType="fade" onRequestClose={closeFeedback}>
        <Pressable style={styles.overlay} onPress={closeFeedback}>
          <View style={styles.modalCard}>
            <Ionicons name="checkmark-circle" size={38} color={Colors.light.tint} style={{ marginBottom: 10 }} />
            <Text style={styles.modalTitle}>{moodLabels[selectedMood] || 'Harika'}</Text>
            <Text style={styles.modalMessage}>{aiMessage}</Text>
            <TouchableOpacity style={styles.closeBtn} onPress={closeFeedback}>
              <Text style={styles.closeText}>Kapat</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
    </LinearGradient>
  );
}

const glass = { borderWidth: StyleSheet.hairlineWidth, borderColor: '#E5E7EB' };

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 70, paddingHorizontal: 24 },
  back: { position: 'absolute', top: 50, left: 20, zIndex: 10 },
  brand: { textAlign: 'center', fontSize: 22, fontWeight: '600', color: Colors.light.tint, textTransform: 'lowercase', marginBottom: 4 },
  dot: { color: '#5DA1D9', fontSize: 26, fontWeight: '700' },
  title: { fontSize: 26, fontWeight: '700', color: '#111827', textAlign: 'center' },
  subtitle: { fontSize: 15, color: '#6c7580', textAlign: 'center', marginBottom: 8 },
  streakWrapper: { alignItems: 'center', marginVertical: 20 },
  streakTitle: { fontSize: 18, color: Colors.light.tint, fontWeight: '700', letterSpacing: 0.4, marginBottom: 8 },
  streakRow: { flexDirection: 'row', columnGap: 12 },
  streakDot: { width: 20, height: 20, borderRadius: 10 },
  dotActive: { backgroundColor: Colors.light.tint },
  dotInactive: { backgroundColor: '#fff', borderWidth: 1.4, borderColor: '#E5E7EB' },
  content: { flexGrow: 1, alignItems: 'center', justifyContent: 'space-evenly', paddingVertical: 10 },
  moodGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', columnGap: 24, rowGap: 16 },
  moodBtn: { padding: 6, borderRadius: 18, ...glass },
  selectedMood: { backgroundColor: Colors.light.tint },
  moodIcon: { fontSize: 28 },
  promptCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 24, paddingVertical: 14, paddingHorizontal: 20, ...glass, marginTop: 4 },
  promptText: { fontSize: 15, fontWeight: '600', color: Colors.light.tint },
  promptFilled: { color: '#111827', fontWeight: '500' },
  saveBtn: { backgroundColor: Colors.light.tint, borderRadius: 32, paddingVertical: 16, paddingHorizontal: 48, marginTop: 10 },
  saveDisabled: { backgroundColor: '#ccd9e1' },
  saveText: { color: '#fff', fontWeight: '600' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center' },
  modalCard: { backgroundColor: '#fff', borderRadius: 28, padding: 26, width: width - 48, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.08, shadowOffset: { width: 0, height: 6 }, shadowRadius: 12, elevation: 4 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: Colors.light.tint, marginBottom: 12, textAlign: 'center' },
  modalMessage: { fontSize: 15, color: '#333', textAlign: 'center', lineHeight: 22, marginBottom: 20 },
  input: { backgroundColor: '#F3F4F6', borderRadius: 14, padding: 14, fontSize: 15, color: '#111827', width: '100%', minHeight: 110, textAlignVertical: 'top', marginBottom: 14 },
  closeBtn: { backgroundColor: Colors.light.tint, paddingHorizontal: 24, paddingVertical: 10, borderRadius: 20 },
  closeText: { color: '#fff', fontWeight: '600' },
});