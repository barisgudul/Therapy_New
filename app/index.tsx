// app/index.tsx
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router/';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, Image, Modal, Platform, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Colors } from '../constants/Colors';
import { useVaultStore } from '../store/vaultStore';

const todayISO = () => new Date().toISOString().split('T')[0];
const { width } = Dimensions.get('window');

export default function HomeScreen() {
  const router = useRouter();

  // === ZUSTAND STORE BAĞLANTISI ===
  const vault = useVaultStore((state) => state.vault);
  const isLoadingVault = useVaultStore((state) => state.isLoading);
  const fetchVault = useVaultStore((state) => state.fetchVault);
  const clearVault = useVaultStore((state) => state.clearVault);

  const [modalVisible, setModalVisible] = useState(false);
  const scaleAnim = useRef(new Animated.Value(1)).current;

  // === UYGULAMA YAŞAM DÖNGÜSÜ YÖNETİMİ ===
  // Bu blok tamamen kaldırıldı.

  // === BİLDİRİM YÖNETİMİ (Vault kontrolü ile) ===
  useEffect(() => {
    if (!isLoadingVault && vault) {
      (async () => {
        await Notifications.cancelAllScheduledNotificationsAsync();
        await Notifications.scheduleNotificationAsync({
          content: { title: 'Günaydın!', body: 'Bugün kendine iyi bakmayı unutma.', data: { route: '/daily_write' } },
          trigger: { hour: 8, minute: 0, repeats: true } as any,
        });
        await Notifications.scheduleNotificationAsync({
          content: { title: 'Bugün nasılsın?', body: '1 cümleyle kendini ifade etmek ister misin?', data: { route: '/daily_write' } },
          trigger: { hour: 20, minute: 0, repeats: true } as any,
        });
      })();
    }
  }, [isLoadingVault, vault]);

  const animateBg = (open: boolean) => Animated.timing(scaleAnim, { toValue: open ? 0.9 : 1, duration: 250, useNativeDriver: true }).start();

  // === GÜNLÜK KARTI: ARTIK VAULT'TAN OKUYOR ===
  const handleCardPress = () => {
    if (vault?.metadata?.lastDailyReflectionDate === todayISO()) {
      setModalVisible(true);
      animateBg(true);
    } else {
      router.push('/daily_write' as const);
    }
  };

  // === TERAPİSTİNİ SEÇ: ARTIK VAULT'TAN OKUYOR ===
  const handleStart = () => {
    vault?.profile?.nickname
      ? router.push('/therapy/avatar' as const)
      : router.push('/profile' as const);
  };

  // === GEÇMİŞ SEANSLARIM: DİREKT YÖNLENDİRME ===
  const handleGoToAllTranscripts = () => {
    router.push('/transcripts');
  };

  // Not: Görünen mesaj, AI'dan gelen ve Vault'a kaydedilen bir mesaj olmalı.
  const dailyMessage = (!isLoadingVault && vault?.metadata?.dailyMessageContent) 
    ? vault.metadata.dailyMessageContent 
    : 'Bugün için mesajın burada görünecek.';
  
  // ------------- UI KISMI (DEĞİŞİKLİK AZ) -------------
  return (
    <LinearGradient colors={['#F8F9FC', '#FFFFFF']} style={styles.flex}>
      <Animated.View style={[styles.container, { transform: [{ scale: scaleAnim }] }]}>
        {/* Üst Bar */}
        <View style={styles.topBar}>
          <Text style={styles.brand}>
            therapy<Text style={styles.dot}>.</Text>
          </Text>
          <View style={styles.topButtons}>
            <TouchableOpacity onPress={() => router.push('/profile')} style={styles.profileButton}>
              <Ionicons name="person-circle-outline" size={28} color={Colors.light.tint} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Ana İçerik */}
        <View style={styles.mainContent}>
          <View style={styles.illustrationContainer}>
            <Image 
              source={require('../assets/therapy-illustration.png')} 
              style={styles.illustration} 
              resizeMode="contain" 
            />
          </View>
          <View style={[styles.textContainer, { marginTop: -60, marginBottom: 10 }]}>
            <Text style={styles.title}>Zihnine İyi Bak</Text>
            <Text style={styles.subtitle}>Yapay zekâ destekli terapiyi deneyimle</Text>
          </View>
          <View style={[styles.buttonContainer, { marginTop: 0 }]}>
            <Pressable
              onPress={handleCardPress}
              style={({ pressed }) => [
                styles.button,
                { transform: [{ scale: pressed ? 0.98 : 1 }] },
              ]}
            >
              <LinearGradient
                colors={['#FFFFFF', '#F8FAFF']}
                start={{x: 0, y: 0}}
                end={{x: 1, y: 1}}
                style={styles.buttonGradient}
              >
                <View style={styles.buttonContent}>
                  <Ionicons name="sparkles-outline" size={20} color={Colors.light.tint} />
                  <Text style={styles.buttonText}>Bugün Nasıl Hissediyorsun?</Text>
                </View>
              </LinearGradient>
            </Pressable>

            <Pressable
              onPress={() => router.push('/ai_summary' as const)}
              style={({ pressed }) => [
                styles.button,
                { transform: [{ scale: pressed ? 0.98 : 1 }] },
              ]}
            >
              <LinearGradient
                colors={['#FFFFFF', '#F8FAFF']}
                start={{x: 0, y: 0}}
                end={{x: 1, y: 1}}
                style={styles.buttonGradient}
              >
                <View style={styles.buttonContent}>
                  <Ionicons name="analytics-outline" size={20} color={Colors.light.tint} />
                  <Text style={styles.buttonText}>Yapay Zeka Destekli Ruh Hâli Analizi</Text>
                </View>
              </LinearGradient>
            </Pressable>

            <Pressable
              onPress={() => router.push('/diary' as const)}
              style={({ pressed }) => [
                styles.button,
                { transform: [{ scale: pressed ? 0.98 : 1 }] },
              ]}
            >
              <LinearGradient
                colors={['#FFFFFF', '#F8FAFF']}
                start={{x: 0, y: 0}}
                end={{x: 1, y: 1}}
                style={styles.buttonGradient}
              >
                <View style={styles.buttonContent}>
                  <Ionicons name="book-outline" size={20} color={Colors.light.tint} />
                  <Text style={styles.buttonText}>Yapay Zeka Destekli Günlük</Text>
                </View>
              </LinearGradient>
            </Pressable>

            <Pressable
              onPress={handleStart}
              style={({ pressed }) => [
                styles.button,
                { transform: [{ scale: pressed ? 0.98 : 1 }] },
              ]}
            >
              <LinearGradient
                colors={['#FFFFFF', '#F8FAFF']}
                start={{x: 0, y: 0}}
                end={{x: 1, y: 1}}
                style={styles.buttonGradient}
              >
                <View style={styles.buttonContent}>
                  <Ionicons name="heart-circle-outline" size={20} color={Colors.light.tint} />
                  <Text style={styles.buttonText}>Terapistini Seç</Text>
                </View>
              </LinearGradient>
            </Pressable>

            <Pressable
              onPress={handleGoToAllTranscripts}
              style={({ pressed }) => [
                styles.button,
                { transform: [{ scale: pressed ? 0.98 : 1 }] },
              ]}
            >
              <LinearGradient
                colors={['#FFFFFF', '#F8FAFF']}
                start={{x: 0, y: 0}}
                end={{x: 1, y: 1}}
                style={styles.buttonGradient}
              >
                <View style={styles.buttonContent}>
                  <Ionicons name="chatbubbles-outline" size={20} color={Colors.light.tint} />
                  <Text style={styles.buttonText}>Geçmiş Seanslarım</Text>
                </View>
              </LinearGradient>
            </Pressable>

            <Pressable
              onPress={() => router.push('/dream' as const)}
              style={({ pressed }) => [
                styles.button,
                { transform: [{ scale: pressed ? 0.98 : 1 }] },
              ]}
            >
              <LinearGradient
                colors={['#FFFFFF', '#F8FAFF']}
                start={{x: 0, y: 0}}
                end={{x: 1, y: 1}}
                style={styles.buttonGradient}
              >
                <View style={styles.buttonContent}>
                  <Ionicons name="cloudy-night-outline" size={20} color={Colors.light.tint} />
                  <Text style={styles.buttonText}>Yapay Zeka Destekli Rüya Analizi</Text>
                </View>
              </LinearGradient>
            </Pressable>

            <TouchableOpacity 
              style={styles.linkButton} 
              onPress={() => router.push('/how_it_works' as const)}
            >
              <Text style={styles.linkText}>Terapiler nasıl işler?</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Animated.View>
      {modalVisible && <BlurView intensity={60} tint="default" style={StyleSheet.absoluteFill} />}
      <Modal visible={modalVisible} transparent animationType="fade" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <TouchableOpacity 
              onPress={() => {
                setModalVisible(false);
                animateBg(false);
              }} 
              style={styles.modalBackButton}
            >
              <Ionicons name="chevron-back" size={24} color={Colors.light.tint} />
            </TouchableOpacity>
            <View style={styles.modalIcon}>
              <LinearGradient
                colors={['#E8EEF7', '#F0F4F9']}
                style={styles.modalIconGradient}
              />
              <Ionicons name="sparkles-outline" size={28} color={Colors.light.tint} />
            </View>
            <Text style={styles.modalTitle}>Günün Mesajı</Text>
            <View style={styles.modalDivider} />
            <Text style={styles.modalText}>{dailyMessage}</Text>
          </View>
        </View>
      </Modal>
    </LinearGradient>
  );
}

/* ---------------- styles ---------------- */
const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { 
    flex: 1, 
    paddingHorizontal: 20, 
    paddingTop: 50,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  brand: {
    fontSize: 28,
    fontWeight: '600',
    color: Colors.light.tint,
    textTransform: 'lowercase',
    letterSpacing: 1.5,
    opacity: 0.95,
  },
  dot: {
    color: Colors.light.tint,
    fontSize: 32,
    fontWeight: '900',
  },
  topButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  devButton: {
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: Colors.light.tint,
    shadowOpacity: 0.12,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    borderWidth: 0.5,
    borderColor: 'rgba(227,232,240,0.4)',
  },
  devButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    height: '100%',
  },
  devButtonText: {
    color: Colors.light.tint,
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
    letterSpacing: -0.2,
  },
  profileButton: {
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 16,
    padding: 8,
    shadowColor: Colors.light.tint,
    shadowOpacity: 0.12,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    borderWidth: 0.5,
    borderColor: 'rgba(227,232,240,0.4)',
  },
  button: {
    width: '100%',
    height: 52,
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: Colors.light.tint,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(93,161,217,0.3)',
  },
  buttonGradient: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: Colors.light.tint,
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
    letterSpacing: -0.2,
  },
  mainContent: {
    flex: 1,
    alignItems: 'center',
  },
  illustrationContainer: {
    width: width * 0.85,
    height: width * 0.6,
    marginBottom: 32,
  },
  illustration: {
    width: '100%',
    height: '100%',
  },
  textContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 26,
    fontWeight: '600',
    color: '#1A1F36',
    marginBottom: 8,
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 15,
    color: '#4A5568',
    textAlign: 'center',
    lineHeight: 20,
    letterSpacing: -0.2,
  },
  buttonContainer: {
    width: '100%',
    gap: 12,
  },
  linkButton: {
    alignItems: 'center',
    marginTop: 4,
  },
  linkText: {
    fontSize: 14,
    color: Colors.light.tint,
    textDecorationLine: 'underline',
    letterSpacing: -0.2,
  },
  debugContainer: {
    position: 'absolute',
    bottom: 40,
    right: 24,
    flexDirection: 'row',
    gap: 12,
  },
  resetBtn: {
    backgroundColor: '#e11d48',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    ...(Platform.OS === 'ios'
      ? { shadowColor: '#000', shadowOpacity: 0.08, shadowOffset: { width: 0, height: 2 }, shadowRadius: 4 }
      : { elevation: 2 }),
  },
  resetTxt: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 13,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '85%',
    maxWidth: 400,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    shadowColor: Colors.light.tint,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 12,
  },
  modalBackButton: {
    position: 'absolute',
    top: 16,
    left: 16,
    zIndex: 5,
  },
  modalIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginBottom: 20,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    overflow: 'hidden',
  },
  modalIconGradient: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 30,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.light.tint,
    textAlign: 'center',
    marginBottom: 12,
    letterSpacing: -0.3,
  },
  modalDivider: {
    height: 1,
    backgroundColor: 'rgba(93,161,217,0.1)',
    marginBottom: 20,
  },
  modalText: {
    fontSize: 15,
    color: '#4A5568',
    lineHeight: 22,
    letterSpacing: -0.2,
    textAlign: 'center',
  },
});