// app/DailyWriteScreen.tsx
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router/';
import React, { useState } from 'react';
import {
  Animated,
  Dimensions,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Colors } from '../constants/Colors';
import { generateDailyReflectionResponse } from '../hooks/useGemini';
import { checkAndUpdateBadges } from '../utils/badges';
import { calculateStreak, getTotalEntries } from '../utils/helpers';
import { statisticsManager } from '../utils/statisticsManager';

const moods = [
  '😊', '😔', '😡',
  '😟', '😍', '😴',
  '😐', '🤯', '🤩'
];
const { width } = Dimensions.get('window');

export default function DailyWriteScreen() {
  const router = useRouter();
  const [selectedMood, setSelectedMood] = useState('');
  const [note, setNote] = useState('');
  const [inputVisible, setInputVisible] = useState(false);
  const [feedbackVisible, setFeedbackVisible] = useState(false);
  const [aiMessage, setAiMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [scaleAnim] = useState(new Animated.Value(1));

  const animatePress = (scale: number) => {
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: scale,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
  };

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

  async function saveSession() {
    if (!note || !selectedMood || saving) return;
    setSaving(true);
    animatePress(0.95);

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

      const activityKey = `activity-${today}`;
      const newEntry = { type: 'daily_write', time: now };
      await appendActivity(activityKey, newEntry);

      await statisticsManager.updateStatistics({ text: note, mood: selectedMood, date: today, source: 'daily_write' });
      await AsyncStorage.removeItem('mood-stats-initialized');

      const streak = await calculateStreak();
      const totalEntries = await getTotalEntries();
      
      await checkAndUpdateBadges('daily', {
        totalEntries: totalEntries,
        streak: streak.currentStreak
      });

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
    <LinearGradient 
      colors={['#F8FAFF', '#FFFFFF']} 
      start={{x: 0, y: 0}} 
      end={{x: 1, y: 1}} 
      style={styles.container}
    >
      <Text style={styles.headerTitle}>Duygu Günlüğü</Text>

      <View style={styles.content}>
        <View style={styles.introSection}>
          <LinearGradient
            colors={['#E0ECFD', '#F4E6FF']}
            start={{x: 0, y: 0}}
            end={{x: 1, y: 1}}
            style={styles.titleGradient}
          >
            <Text style={styles.title}>Bugün nasıl hissediyorsun?</Text>
            <Text style={styles.subtitle}>Emojini seç ve hislerini paylaş</Text>
          </LinearGradient>
        </View>

        <View style={styles.moodCard}>
          <LinearGradient
            colors={['#FFFFFF', '#F8FAFF']}
            start={{x: 0, y: 0}}
            end={{x: 1, y: 1}}
            style={styles.moodGradient}
          >
            <View style={styles.moodGrid}>
              {moods.map((m) => (
                <TouchableOpacity
                  key={m}
                  style={[styles.moodBtn, selectedMood === m && styles.selectedMood]}
                  onPress={() => {
                    animatePress(0.95);
                    setSelectedMood((p) => (p === m ? '' : m));
                  }}
                  activeOpacity={0.7}
                >
                  <LinearGradient
                    colors={selectedMood === m ? ['#E0ECFD', '#F4E6FF'] : ['#FFFFFF', '#F8FAFF']}
                    start={{x: 0, y: 0}}
                    end={{x: 1, y: 1}}
                    style={styles.moodBtnGradient}
                  >
                    <Text style={styles.moodIcon}>{m}</Text>
                  </LinearGradient>
                </TouchableOpacity>
              ))}
            </View>
          </LinearGradient>
        </View>

        <TouchableOpacity 
          style={styles.promptCard} 
          onPress={() => {
            animatePress(0.95);
            setInputVisible(true);
          }}
          activeOpacity={0.7}
        >
          <LinearGradient
            colors={['#FFFFFF', '#F8FAFF']}
            start={{x: 0, y: 0}}
            end={{x: 1, y: 1}}
            style={styles.promptGradient}
          >
            <View style={styles.promptContent}>
              <LinearGradient
                colors={['#E0ECFD', '#F4E6FF']}
                start={{x: 0, y: 0}}
                end={{x: 1, y: 1}}
                style={styles.promptIconGradient}
              >
                <Ionicons name="create-outline" size={24} color={Colors.light.tint} />
              </LinearGradient>
              <Text style={[styles.promptText, note && styles.promptFilled]} numberOfLines={1}>
                {note || 'Bugünü bir cümleyle anlatmak ister misin?'}
              </Text>
            </View>
          </LinearGradient>
        </TouchableOpacity>

        <Animated.View style={[styles.saveBtnContainer, { transform: [{ scale: scaleAnim }] }]}>
          <TouchableOpacity
            style={[styles.saveBtn, (!selectedMood || !note || saving) && styles.saveDisabled]}
            onPress={saveSession}
            disabled={!selectedMood || !note || saving}
            activeOpacity={0.7}
          >
            <LinearGradient
              colors={['#E0ECFD', '#F4E6FF']}
              start={{x: 0, y: 0}}
              end={{x: 1, y: 1}}
              style={styles.saveGradient}
            >
              <View style={styles.saveContent}>
                <Ionicons name="checkmark-circle-outline" size={24} color={Colors.light.tint} />
                <Text style={styles.saveText}>{saving ? 'Kaydediliyor...' : 'Günlüğü Tamamla'}</Text>
              </View>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      </View>

      <Modal visible={inputVisible} transparent animationType="fade">
        <Pressable style={styles.overlay} onPress={() => setInputVisible(false)}>
          <View style={styles.modalCard}>
            <LinearGradient
              colors={['#FFFFFF', '#F8FAFF']}
              start={{x: 0, y: 0}}
              end={{x: 1, y: 1}}
              style={styles.modalGradient}
            >
              <View style={styles.modalHeader}>
                <LinearGradient
                  colors={['#E0ECFD', '#F4E6FF']}
                  start={{x: 0, y: 0}}
                  end={{x: 1, y: 1}}
                  style={styles.modalIconGradient}
                >
                  <Ionicons name="chatbubble-ellipses-outline" size={24} color={Colors.light.tint} />
                </LinearGradient>
                <Text style={styles.modalTitle}>Bugün nasılsın?</Text>
              </View>
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
                activeOpacity={0.7}
              >
                <LinearGradient
                  colors={['#E0ECFD', '#F4E6FF']}
                  start={{x: 0, y: 0}}
                  end={{x: 1, y: 1}}
                  style={styles.closeGradient}
                >
                  <Text style={styles.closeText}>Tamam</Text>
                </LinearGradient>
              </TouchableOpacity>
            </LinearGradient>
          </View>
        </Pressable>
      </Modal>

      <Modal visible={feedbackVisible} transparent animationType="fade" onRequestClose={closeFeedback}>
        <Pressable style={styles.overlay} onPress={closeFeedback}>
          <View style={styles.modalCard}>
            <LinearGradient
              colors={['#FFFFFF', '#F8FAFF']}
              start={{x: 0, y: 0}}
              end={{x: 1, y: 1}}
              style={styles.modalGradient}
            >
              <View style={styles.modalHeader}>
                <LinearGradient
                  colors={['#E0ECFD', '#F4E6FF']}
                  start={{x: 0, y: 0}}
                  end={{x: 1, y: 1}}
                  style={styles.modalIconGradient}
                >
                  <Ionicons name="sparkles-outline" size={24} color={Colors.light.tint} />
                </LinearGradient>
                <Text style={styles.modalTitle}>AI Analizi</Text>
              </View>
              <Text style={styles.aiMessage}>{aiMessage}</Text>
              <TouchableOpacity 
                style={styles.closeBtn} 
                onPress={closeFeedback}
                activeOpacity={0.7}
              >
                <LinearGradient
                  colors={['#E0ECFD', '#F4E6FF']}
                  start={{x: 0, y: 0}}
                  end={{x: 1, y: 1}}
                  style={styles.closeGradient}
                >
                  <Text style={styles.closeText}>Tamam</Text>
                </LinearGradient>
              </TouchableOpacity>
            </LinearGradient>
          </View>
        </Pressable>
      </Modal>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  headerTitle: {
    position: 'absolute',
    top: 70,
    left: 0,
    right: 0,
    textAlign: 'center',
    fontSize: 24,
    fontWeight: '600',
    color: Colors.light.tint,
    letterSpacing: -0.5,
    zIndex: 20,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 120,
    paddingBottom: 40,
    justifyContent: 'space-between',
  },
  introSection: {
    marginBottom: 16,
  },
  titleGradient: {
    borderRadius: 24,
    padding: 16,
    shadowColor: Colors.light.tint,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
    borderWidth: 1,
    borderColor: 'rgba(93,161,217,0.15)',
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: Colors.light.tint,
    marginBottom: 8,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    color: '#4A5568',
    textAlign: 'center',
    lineHeight: 20,
    letterSpacing: -0.3,
  },
  moodCard: {
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: Colors.light.tint,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
    borderWidth: 1,
    borderColor: 'rgba(93,161,217,0.15)',
    marginBottom: 16,
  },
  moodGradient: {
    padding: 16,
  },
  moodGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 1,
    paddingHorizontal: 4,
    width: width - 48,
    alignSelf: 'center',
  },
  moodBtn: {
    width: (width - 64) / 3,
    aspectRatio: 1,
    borderRadius: 4,
    overflow: 'hidden',
    shadowColor: Colors.light.tint,
    shadowOpacity: 0.02,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 1,
    elevation: 1,
    borderWidth: 0.5,
    borderColor: 'rgba(93,161,217,0.1)',
    marginBottom: 1,
  },
  moodBtnGradient: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 1,
  },
  selectedMood: {
    borderColor: Colors.light.tint,
    borderWidth: 1,
    transform: [{ scale: 1.02 }],
  },
  moodIcon: {
    fontSize: 32,
  },
  promptCard: {
    marginBottom: 24,
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: Colors.light.tint,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
    borderWidth: 1,
    borderColor: 'rgba(93,161,217,0.15)',
  },
  promptGradient: {
    padding: 24,
  },
  promptContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  promptIconGradient: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  promptText: {
    flex: 1,
    fontSize: 16,
    color: '#9CA3AF',
    letterSpacing: -0.2,
  },
  promptFilled: {
    color: '#1A1F36',
  },
  saveBtnContainer: {
    marginTop: 8,
  },
  saveBtn: {
    height: 56,
    borderRadius: 28,
    overflow: 'hidden',
    shadowColor: Colors.light.tint,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(93,161,217,0.3)',
  },
  saveGradient: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveText: {
    color: Colors.light.tint,
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 8,
    letterSpacing: -0.3,
  },
  saveDisabled: {
    opacity: 0.5,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: 120,
  },
  modalCard: {
    width: '90%',
    maxWidth: 500,
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: Colors.light.tint,
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.2,
    shadowRadius: 30,
    elevation: 20,
    marginTop: 20,
  },
  modalGradient: {
    padding: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalIconGradient: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1A1F36',
    letterSpacing: -0.3,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    fontSize: 16,
    color: '#1A1F36',
    minHeight: 120,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: 'rgba(93,161,217,0.15)',
    marginBottom: 20,
  },
  closeBtn: {
    height: 48,
    borderRadius: 24,
    overflow: 'hidden',
  },
  closeGradient: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: {
    color: Colors.light.tint,
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: -0.3,
  },
  aiMessage: {
    fontSize: 16,
    color: '#4A5568',
    lineHeight: 24,
    letterSpacing: -0.2,
    marginBottom: 20,
  },
});