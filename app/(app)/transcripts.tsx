// app/transcripts.tsx
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as React from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  UIManager,
  View
} from 'react-native';

import { useTranscripts, SessionEvent } from '../../hooks/useTranscripts';
import SessionSummaryModal from '../../components/text_session/SessionSummaryModal';
import { getSummaryForSessionEvent } from '../../services/event.service';

// Android'de LayoutAnimation'ı etkinleştir
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// ---- TASARIM TEMASI ----
const theme = {
    text: '#1A1F36',
    background: '#F8F9FF',
    tint: '#5DA1D9',
    softText: '#4A5568',
    card: '#FFFFFF',
    divider: 'rgba(93, 161, 217, 0.15)',
    shadow: 'rgba(93, 161, 217, 0.12)',
    gradient: ['#E0ECFD', '#F4E6FF'] as [string, string],
    ctaButton: ['#5DA1D9', '#6388E4'] as [string, string],
    backgroundGradient: ['#F4F6FF', '#FFFFFF'] as [string, string],
    aiBubble: '#F8FAFF',
    userBubble: '#FFFFFF',
    textSubtle: '#9CA3AF',

    // YENİ: PREMIUM KART İÇİN EKLENECEK RENKLER
    premiumGradient: ['#1D2B64', '#4A00E0'] as [string, string], // Derin Kozmik Gradyan
    premiumText: '#FFFFFF',
    premiumTextSoft: '#E0E0E0',
    premiumGlow: '#A77DFF', // İkon ve Buton için Işıma Rengi
    premiumCta: ['#38ef7d', '#11998e'] as [string, string], // Canlı Yeşil Gradyan Buton

    // YENİ: SERENİTY (HUzur) KARTI İÇİN EKLENECEK RENKLER
    serenityBackground: ['#F5F7FA', '#E8EDF2'] as [string, string], // Çok hafif, soğuk bir arka plan
    serenityCardBackground: ['#FFFFFF', '#FDFEFF'] as [string, string],
    serenityText: '#334155', // Daha yumuşak bir ana metin rengi
    serenityTextSoft: '#64748B', // Daha da yumuşak açıklama rengi
    serenityAccent: '#A7C7E7', // Vurgu için yumuşak, pudralı bir mavi
    serenityCtaText: '#FFFFFF',
    serenityCtaBackground: ['#5DA1D9', '#6388E4'] as [string, string], // Ana tema rengini kullanan sakin bir CTA
};

// ---- TİP TANIMLAMALARI ----
// Tipler artık useTranscripts hook'undan geliyor

// ---- ALT BİLEŞENLER ----

const ScreenHeader: React.FC<{ title: string; onBack?: () => void }> = ({ title, onBack }) => (
  <View style={styles.header}>
    {onBack ? (
      <TouchableOpacity onPress={onBack} style={styles.backButton}>
        <Ionicons name="chevron-back" size={28} color={theme.tint} />
      </TouchableOpacity>
    ) : <View style={styles.headerSpacer} />}
    <Text style={styles.headerTitle} numberOfLines={1}>{title}</Text>
    <View style={styles.headerSpacer} />
  </View>
);

const _SelectionCard: React.FC<{ title: string; description: string; icon: keyof typeof Ionicons.glyphMap; onPress: () => void; }> = ({ title, description, icon, onPress }) => (
  <Pressable onPress={onPress} style={({ pressed }) => [styles.selectionCard, { transform: [{ scale: pressed ? 0.98 : 1 }] }]}>
    <View style={styles.selectionContent}>
        <LinearGradient colors={theme.gradient} style={styles.selectionIconContainer}>
            <Ionicons name={icon} size={28} color={theme.tint} />
        </LinearGradient>
        <View style={styles.selectionTextContainer}>
            <Text style={styles.selectionTitle}>{title}</Text>
            <Text style={styles.selectionDescription}>{description}</Text>
        </View>
        <Ionicons name="chevron-forward" size={24} color={theme.tint} />
    </View>
  </Pressable>
);

// ---- YENİ: AKICI VE GENİŞ SEÇİM KARTI (FLOWCARD) ----
const FlowCard: React.FC<{ 
    icon: keyof typeof Ionicons.glyphMap; 
    title: string; 
    description: string; 
    onPress: () => void;
    count: number;
    features: string[];
}> = ({ icon, title, description, onPress, count, features }) => {
    return (
        <Pressable onPress={onPress} style={({ pressed }) => [styles.flowCard, { transform: [{ scale: pressed ? 0.985 : 1 }] }] }>
            <LinearGradient colors={theme.serenityCardBackground} style={styles.flowCardGradient}>
                <LinearGradient colors={theme.gradient} style={styles.flowIconContainer}>
                    <Ionicons name={icon} size={28} color={theme.tint} />
                </LinearGradient>
                <View style={styles.flowTextContainer}>
                    <Text style={styles.flowTitle}>{title}</Text>
                    <Text style={styles.flowDescription}>{description}</Text>
                    
                    <View style={styles.countContainer}>
                        <Ionicons name="file-tray-full-outline" size={16} color={theme.tint} />
                        <Text style={styles.countText}>{count > 0 ? `${count} kayıt bulundu` : 'Henüz kayıt yok'}</Text>
                    </View>

                    <View style={styles.featuresContainer}>
                      {features.map((feature, index) => (
                        <View key={index} style={styles.featureTag}>
                          <Ionicons name="checkmark-circle" size={14} color={theme.tint} style={styles.featureIcon} />
                          <Text style={styles.featureText}>{feature}</Text>
                        </View>
                      ))}
                    </View>

                </View>
                <Ionicons name="chevron-forward" size={24} color={theme.serenityAccent} />
            </LinearGradient>
        </Pressable>
    );
};

// ---- SummaryCard BİLEŞENİ GÜNCELLENDİ ----
const SummaryCard: React.FC<{ event: SessionEvent; onPress?: () => void; onDelete: () => void; onShowSummary: (summary: string) => void; }> = ({ event, onPress, onDelete, onShowSummary }) => {
  const [freshSummary, setFreshSummary] = React.useState<string | null>(null);
  React.useEffect(() => {
    let isMounted = true;
    // Kart mount olduğunda daima taze özeti çek
    (async () => {
      try {
        const s = await getSummaryForSessionEvent(event.id);
        if (isMounted) setFreshSummary(s ?? null);
      } catch (_e) {
        if (isMounted) setFreshSummary(null);
      }
    })();
    return () => { isMounted = false; };
  }, [event.id]);
  const date = new Date(event.timestamp);
  const formattedDate = date.toLocaleDateString('tr-TR', { day: '2-digit', month: 'long', year: 'numeric' });
  const firstUserMessage = event.data.messages.find(m => m.sender === 'user')?.text || "";
  const summaryText = freshSummary || event.summary || firstUserMessage || "Bu seansın özeti hazırlanıyor…";
  const preview = summaryText.replace(/^\s+|\s+$/g, '');
  const previewCompact = preview.length > 60 ? preview.substring(0, 60) + '…' : preview;
  const summaryTitle = previewCompact;
  
  

  return (
    <Pressable disabled={!onPress} onPress={onPress} style={({ pressed }) => [styles.summaryCard, { transform: [{ scale: pressed ? 0.98 : 1 }] }]}>
        <LinearGradient colors={[theme.card, '#F9FBFF']} style={styles.summaryCardGradient}>
            <View style={styles.summaryHeader}>
                <Ionicons name="calendar-outline" size={18} color={theme.tint} />
                <Text style={styles.summaryDateText}>{formattedDate}</Text>
            </View>


            <Text style={styles.summaryTitle}>{summaryTitle}</Text>
            <Text style={styles.summaryText} numberOfLines={3}>
                {previewCompact}
            </Text>
            {/* YENİ: Silme butonu eklendi */}
            <Pressable onPress={onDelete} style={({ pressed }) => [styles.deleteButton, { transform: [{ scale: pressed ? 0.95 : 1 }] }] }>
                <Ionicons name="trash-outline" size={22} color="#E53E3E" />
            </Pressable>
            {/* YENİ: Özeti Gör butonu */}
            <View style={{ marginTop: 12, alignItems: 'flex-end' }}>
              <Pressable onPress={(e) => { e.stopPropagation(); onShowSummary(summaryText); }} style={({ pressed }) => [{ paddingVertical: 8, paddingHorizontal: 12, borderRadius: 12, backgroundColor: 'rgba(93,161,217,0.1)' , transform: [{ scale: pressed ? 0.97 : 1 }] }]}> 
                <Text style={{ color: theme.tint, fontWeight: '600' }}>Özeti Gör</Text>
              </Pressable>
            </View>
        </LinearGradient>
    </Pressable>
  );
};


const _MessageBubble: React.FC<{ message: { sender: string; text: string } }> = ({ message }) => {
  const isAI = message.sender === 'ai';
  return (
    <View style={[ styles.bubble, isAI ? styles.aiBubble : styles.userBubble ]}>
        <Text style={styles.bubbleText}>{message.text}</Text>
    </View>
  );
};



// ---- YENİ: AŞIRI ZARİF VE TERAPÖTİK SERENITY KARTI (SON VERSİYON) ----
const SerenityCard: React.FC<{ onPressCTA: () => void }> = ({ onPressCTA }) => {
    // 1. ANİMASYON DEĞERLERİNİ GÜNCELLE
    const leafTranslateY = React.useRef(new Animated.Value(60)).current; // Yaprak 60px aşağıdan başlayacak
    const contentFadeAnim = React.useRef(new Animated.Value(0)).current;
    const rippleAnim = React.useRef(new Animated.Value(0)).current;

    // 2. YENİ ANİMASYON KOREOGRAFİSİ
    React.useEffect(() => {
        leafTranslateY.setValue(60);
        contentFadeAnim.setValue(0);
        rippleAnim.setValue(0);

        Animated.parallel([
            Animated.timing(rippleAnim, {
                toValue: 1,
                duration: 2000,
                useNativeDriver: true,
            }),
            Animated.timing(leafTranslateY, {
                toValue: 0,
                duration: 1400,
                delay: 200,
                useNativeDriver: true,
                easing: Easing.out(Easing.cubic),
            }),
            Animated.timing(contentFadeAnim, {
                toValue: 1,
                duration: 1000,
                delay: 700,
                useNativeDriver: true,
            }),
        ]).start();
    }, [leafTranslateY, contentFadeAnim, rippleAnim]);

    // Farklı halkalar için animasyon enterpolasyonları
    const ripple1 = {
        transform: [{
            scale: rippleAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 4] })
        }],
        opacity: rippleAnim.interpolate({ inputRange: [0, 0.6, 1], outputRange: [0.7, 0.3, 0] })
    };
    const ripple2 = {
        transform: [{
            scale: rippleAnim.interpolate({ inputRange: [0.1, 1], outputRange: [0, 4] })
        }],
        opacity: rippleAnim.interpolate({ inputRange: [0.1, 0.7, 1], outputRange: [0.6, 0.2, 0] })
    };

    return (
        <View style={styles.serenityContainer}>
            <LinearGradient colors={theme.serenityCardBackground} style={styles.serenityCard}>
                {/* 1. Yaprak ve Dalga (Kendi dikey animasyonuna sahip) */}
                <Animated.View style={{ transform: [{ translateY: leafTranslateY }] }}>
                    <View style={styles.rippleContainer}>
                        <Animated.View style={[styles.ripple, ripple1]} />
                        <Animated.View style={[styles.ripple, ripple2]} />
                        <Ionicons name="leaf-outline" size={36} color={theme.serenityAccent} style={{ opacity: 0.85 }} />
                    </View>
                </Animated.View>
                {/* 2. Metinler ve Buton (Sadece belirginleşme animasyonuna sahip) */}
                <Animated.View style={{ opacity: contentFadeAnim, alignItems: 'center', width: '100%' }}>
                    <Text style={styles.serenityTitle}>
                      {/* YENİ: "Henüz keşfedilecek bir şey yok" teması */}
                      Keşfedilecek Bir Geçmiş
                    </Text>
                    <Text style={styles.serenityDescription}>
                      {/* YENİ: Geçmiş oluşturmanın önemini vurgulama */}
                      Burada, zamanla biriken seans kayıtlarınız sergilenecek. İlk görüşmenizi yaparak bu değerli arşivi oluşturmaya başlayın.
                    </Text>
                    <Pressable onPress={onPressCTA} style={({ pressed }) => [styles.serenityCtaWrapper, { transform: [{ scale: pressed ? 0.98 : 1 }] }] }>
                        <LinearGradient 
                            colors={theme.serenityCtaBackground} 
                            style={styles.serenityCta} 
                            start={{x:0, y:0.5}} 
                            end={{x:1, y:0.5}}
                        >
                            <Ionicons name="sparkles-outline" size={20} color={theme.serenityCtaText} style={{ opacity: 0.9 }} />
                            <Text style={styles.serenityCtaText}>
                              {/* YENİ: Gerçek duruma uygun eylem */}
                              Yeni Bir Görüşme Başlat
                            </Text>
                        </LinearGradient>
                    </Pressable>
                </Animated.View>
            </LinearGradient>
        </View>
    );
};

// ---- ANA EKRAN BİLEŞENİ ----
export default function PremiumHistoryScreen() {
  const { state, actions } = useTranscripts();
  const { isLoading, viewMode, allEvents, selectedSessionType } = state;
  const { handleSelectSessionType, handleDeleteEvent, handleNavigateToPremium, goBack, setViewModeToMenu } = actions;

  const [isSummaryModalVisible, setIsSummaryModalVisible] = React.useState(false);
  const [currentSummary, setCurrentSummary] = React.useState("");
  const onShowSummary = async (_summaryFromList: string, eventId?: string) => {
    // Her zaman en güncel özeti DB'den çek
    if (eventId) {
      try {
        const fresh = await getSummaryForSessionEvent(eventId);
        setCurrentSummary(fresh || _summaryFromList || "");
      } catch (_e) {
        setCurrentSummary(_summaryFromList || "");
      }
    } else {
      setCurrentSummary(_summaryFromList || "");
    }
    setIsSummaryModalVisible(true);
  };

  const renderContent = () => {
    if (isLoading) { return <View style={styles.loadingContainer}><ActivityIndicator size="large" color={theme.tint} /></View>; }

    const textSessionsCount = allEvents.filter(e => e.type === 'text_session').length;
    const voiceSessionsCount = allEvents.filter(e => e.type === 'voice_session').length;

    switch (viewMode) {
      case 'menu':
        return (
          <>
            <ScreenHeader title="" onBack={goBack} />
            <ScrollView contentContainerStyle={styles.menuContainer}>
              <View style={styles.introContainer}>
                  <Text style={styles.introTitle}>İç Dünyanız</Text>
                  {/* YENİ: Geçmişe dönük keşif teması */}
                  <Text style={styles.introDescription}>
                      Geçmiş görüşmelerinizdeki yansımaları ve içgörüleri keşfedin.
                  </Text>
              </View>
              <View style={styles.cardsFlowContainer}>
                  <FlowCard 
                      title="Yazılarınız"
                      description="Düşüncelerinizi kelimelerin akışında görün." 
                      icon="chatbubble-ellipses-outline" 
                      onPress={() => handleSelectSessionType('text_session')} 
                      count={textSessionsCount}
                      features={['Anahtar Kelimeler', 'Duygu Analizi', 'Öz-yansıtma']}
                  />
                  <FlowCard 
                      title="Sesli Görüşmeler"
                      description="İfade ettiğiniz duyguların özüne dönün." 
                      icon="mic-outline" 
                      onPress={() => handleSelectSessionType('voice_session')} 
                      count={voiceSessionsCount}
                      features={['Tonlama Analizi', 'İçgörü Keşfi', 'Anlık Döküm']}
                  />
                  {/* <FlowCard 
                      title="Görüntülü Seanslar"
                      description="O anki bağın ve anlayışın izlerini takip edin." 
                      icon="videocam-outline" 
                      onPress={() => handleSelectSessionType('video_session')} 
                  /> */}
              </View>
            </ScrollView>
          </>
        );
      case 'summaryList': {
        const filteredEvents = allEvents
          .filter(e => e.type === selectedSessionType)
          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
          .map((e) => e as SessionEvent);
        const sessionTitles = { 
            text_session: "Yazılarınız", 
            voice_session: "Ses Kayıtlarınız", 
            // video_session: "Görüşmeleriniz" 
        };
        const title = sessionTitles[selectedSessionType!] || "Geçmiş Seanslar";
        return (
          <View style={{flex: 1}}>
            <ScreenHeader title={title} onBack={setViewModeToMenu} />
            {filteredEvents.length === 0 ? (
                <SerenityCard onPressCTA={handleNavigateToPremium} />
            ) : (
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.summaryListContainer}>
                {filteredEvents.map(event => ( 
                    <SummaryCard 
                        key={event.id} 
                        event={event} 
                        onDelete={() => handleDeleteEvent(event.id)}
                        onShowSummary={(s) => onShowSummary(s, event.id)}
                    /> 
                ))}
              </ScrollView>
            )}
          </View>
        );
      }

    }
  };
  return ( <LinearGradient colors={theme.serenityBackground} style={styles.screen}><View style={styles.container}>{renderContent()}</View>
  <SessionSummaryModal
    isVisible={isSummaryModalVisible}
    onClose={() => setIsSummaryModalVisible(false)}
    summaryText={currentSummary}
    title="Sohbet Özeti"
    subtitle="Bu görüşmeden çıkan kısa özet"
  />
  </LinearGradient> );
}

// ---- STİLLER (REFERANSLARA GÖRE) ----
const styles = StyleSheet.create({
  screen: { flex: 1 },
  container: { paddingHorizontal: 24, paddingBottom: 50, paddingTop: Platform.OS === 'android' ? 40 : 60, flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', minHeight: 400 },
  
  header: { alignItems: 'center', paddingTop: 20, paddingBottom: 16, flexDirection: 'row', justifyContent: 'space-between' },
  backButton: { zIndex: 10, backgroundColor: 'rgba(255,255,255,0.92)', borderRadius: 16, padding: 8, shadowColor: theme.shadow, shadowOpacity: 0.12, shadowOffset: { width: 0, height: 4 }, shadowRadius: 12, borderWidth: 0.5, borderColor: 'rgba(227,232,240,0.4)' },
  headerSpacer: { width: 44, height: 44, },
  headerTitle: { flex: 1, fontSize: 24, fontWeight: '600', color: theme.text, textAlign: 'center', letterSpacing: -0.5 },
  pageSubtitle: { fontSize: 16, color: theme.softText, marginTop: 4, textAlign: 'center', letterSpacing: -0.3, marginBottom: 24, paddingHorizontal: 20 },
  
  selectionContainer: { gap: 16 },
  selectionCard: { marginBottom: 16, borderRadius: 20, backgroundColor: theme.card, overflow: 'hidden', shadowColor: theme.shadow, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 3, borderWidth: 1, borderColor: theme.divider },
  selectionContent: { flexDirection: 'row', alignItems: 'center', padding: 20 },
  selectionIconContainer: { width: 50, height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center', marginRight: 16, shadowColor: theme.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
  selectionTextContainer: { flex: 1 },
  selectionTitle: { fontSize: 18, fontWeight: '600', color: theme.text, marginBottom: 4 },
  selectionDescription: { fontSize: 14, color: theme.softText, lineHeight: 20 },

  // ---- YENİ: DİKEY AKIŞ (FLOW) STİLLERİ
  cardsFlowContainer: {
    // paddingHorizontal: 20, // Ana konteynerin padding'i yeterli
    gap: 20, // Kartlar arası cömert boşluk
  },
  flowCard: {
    borderRadius: 24,
    shadowColor: 'rgba(100, 116, 139, 0.12)',
    shadowOffset: { width: 0, height: 7 },
    shadowOpacity: 1,
    shadowRadius: 25,
    elevation: 10,
  },
  flowCardGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.9)',
  },
  flowIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 20, // İkon ve metin arası boşluk
    shadowColor: theme.tint,
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  flowTextContainer: {
    flex: 1, // Metinlerin kalan tüm alanı doldurmasını sağlar
  },
  flowTitle: {
    fontSize: 18,
    fontWeight: '500',
    color: theme.serenityText,
    marginBottom: 4,
  },
  flowDescription: {
    fontSize: 14,
    color: theme.serenityTextSoft,
    lineHeight: 20,
    marginBottom: 12, // Added margin to create space for new elements
  },
  // ---- SummaryCard için gerekli stiller ----
  summaryCard: { borderRadius: 24, overflow: 'hidden', shadowColor: theme.shadow, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.08, shadowRadius: 16, elevation: 4, borderWidth: 1, borderColor: theme.divider },
  summaryCardGradient: { padding: 20, },
  summaryHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12, borderBottomWidth: 1, borderBottomColor: theme.divider, paddingBottom: 12 },
  summaryDateText: { fontSize: 14, fontWeight: '600', color: theme.softText },
  summaryTitle: { fontSize: 18, fontWeight: '600', color: theme.text, letterSpacing: -0.3, marginBottom: 8 },
  summaryText: { fontSize: 15, color: theme.softText, lineHeight: 22 },
  deleteButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 237, 237, 0.7)',
  },

  therapistInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.divider,
  },
  therapistImage: {
      width: 40,
      height: 40,
      borderRadius: 20,
      marginRight: 12,
  },
  therapistName: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.text,
  },
  therapistSpecialty: {
      fontSize: 13,
      color: theme.softText,
      marginTop: 2,
  },

  // FlowCard'a eklenen yeni elementler için stiller
  countContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  countText: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.tint,
    marginLeft: 6,
  },
  featuresContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  featureTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(93,161,217,0.1)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
  },
  featureIcon: {
    marginRight: 6,
  },
  featureText: {
    fontSize: 12,
    color: theme.tint,
    fontWeight: '500',
  },

  // ---- YENİ: SERENITY CARD STİLLERİ (ANİMASYON İÇİN GÜNCELLENDİ) ----
  serenityContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingVertical: 20,
  },
  serenityCard: {
    borderRadius: 32,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 80, // Yaprağın "inmesi" için yukarıda boşluk bırakır
    paddingBottom: 40,
    minHeight: 520, // Kartın yüksekliğini sabit tutar
    shadowColor: 'rgba(100, 116, 139, 0.15)',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 1,
    shadowRadius: 35,
    elevation: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.9)',
  },
  rippleContainer: {
    width: 120,
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 28,
  },
  ripple: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 1.5,
    borderColor: theme.serenityAccent,
  },
  serenityTitle: {
    fontSize: 26,
    fontWeight: '300',
    color: theme.serenityText,
    textAlign: 'center',
    marginBottom: 16,
  },
  serenityDescription: {
    fontSize: 16,
    color: theme.serenityTextSoft,
    textAlign: 'center',
    lineHeight: 26,
    marginBottom: 36,
    paddingHorizontal: 10,
  },
  serenityCtaWrapper: {
    alignSelf: 'stretch',
    shadowColor: theme.tint,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
  },
  serenityCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 20,
    borderRadius: 100,
  },
  serenityCtaText: {
    color: theme.serenityCtaText,
    fontSize: 17,
    fontWeight: '500',
    letterSpacing: 0.2,
  },
  
  detailCard: { marginTop: 16, backgroundColor: 'transparent' },
  messagesContainer: { padding: 12, gap: 16 },
  bubble: { padding: 18, borderRadius: 24, marginBottom: 8, maxWidth: '85%', shadowColor: theme.shadow, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.07, shadowRadius: 12, elevation: 4, borderWidth: 1, },
  aiBubble: { alignSelf: 'flex-start', backgroundColor: theme.aiBubble, borderTopLeftRadius: 6, borderColor: theme.divider },
  userBubble: { alignSelf: 'flex-end', backgroundColor: theme.userBubble, borderTopRightRadius: 6, borderColor: 'rgba(93, 161, 217, 0.2)' },
  bubbleText: { color: theme.text, fontSize: 16, lineHeight: 24, letterSpacing: -0.2 },
  emptyText: { color: theme.softText, fontStyle: 'italic', padding: 20, textAlign: 'center' },

  // ---- YENİ: GİRİŞ BÖLÜMÜ STİLLERİ ----
  introContainer: {
    // paddingHorizontal: 16, // Ana konteynerin padding'i yeterli
    marginBottom: 32,
    marginTop: 16,
    alignItems: 'center',
  },
  introTitle: {
    fontSize: 28,
    fontWeight: '600',
    color: theme.text,
    marginBottom: 12,
    textAlign: 'center',
  },
  introDescription: {
    fontSize: 16,
    color: theme.softText,
    textAlign: 'center',
    lineHeight: 24,
    maxWidth: '95%',
  },
  // GENEL MENU KONTEYNERİ
  menuContainer: {
    flexGrow: 1,
    justifyContent: 'flex-start', // İçeriği yukarıdan başlatır
    paddingBottom: 40,
  },
  summaryListContainer: { gap: 16, marginTop: 24, paddingBottom: 40 },
});