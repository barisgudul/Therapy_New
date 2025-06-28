import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import * as React from 'react';
import {
  ActivityIndicator,
  Animated,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  UIManager,
  View
} from 'react-native';
import { AppEvent, EventType, getEventsForLast } from '../utils/eventLogger';

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
};

// ---- TİP TANIMLAMALARI ----
type ViewMode = 'menu' | 'summaryList' | 'detailView';
interface SessionEvent extends AppEvent {
  mood?: 'happy' | 'neutral' | 'sad';
  data: { messages: { sender: string; text: string }[]; [key: string]: any; };
}

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

const SelectionCard: React.FC<{ title: string; description: string; icon: keyof typeof Ionicons.glyphMap; onPress: () => void; }> = ({ title, description, icon, onPress }) => (
  <TouchableOpacity onPress={onPress} style={styles.selectionCard} activeOpacity={0.9}>
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
  </TouchableOpacity>
);

const SummaryCard: React.FC<{ event: SessionEvent; onPress: () => void; }> = ({ event, onPress }) => {
  const date = new Date(event.timestamp);
  const formattedDate = date.toLocaleDateString('tr-TR', { day: '2-digit', month: 'long', year: 'numeric' });
  const firstUserMessage = event.data.messages.find(m => m.sender === 'user')?.text || "İçerik yok";
  const summaryTitle = firstUserMessage.split(' ').slice(0, 3).join(' ') + '...';

  return (
    <TouchableOpacity onPress={onPress} style={styles.summaryCard} activeOpacity={0.9}>
        <LinearGradient colors={[theme.card, '#F9FBFF']} style={styles.summaryCardGradient}>
            <View style={styles.summaryHeader}>
                <Ionicons name="calendar-outline" size={18} color={theme.tint} />
                <Text style={styles.summaryDateText}>{formattedDate}</Text>
            </View>
            <Text style={styles.summaryTitle}>{summaryTitle}</Text>
            <Text style={styles.summaryText} numberOfLines={2}>
                {firstUserMessage}
            </Text>
        </LinearGradient>
    </TouchableOpacity>
  );
};

const PremiumDiscoveryCard: React.FC<{onPressCTA: () => void}> = ({ onPressCTA }) => {
    const features = ['Derinlemesine Analiz', 'Kişisel Büyüme', 'Uzman Rehberliği'];
    return (
        <View style={styles.discoveryContainer}>
            <View style={styles.discoveryCard}>
                <LinearGradient colors={[theme.card, '#F8FAFF']} style={styles.discoveryContent}>
                    {/* HATA DÜZELTMESİ: Var olmayan Image satırı kaldırıldı. */}
                    {/* <Image source={require('../assets/images/discovery-bg.png')} style={styles.discoveryBgImage} /> */}
                    
                    <Text style={styles.discoveryTitle}>Potansiyelini Keşfet</Text>
                    <Text style={styles.discoveryDescription}>Henüz hiç seans kaydın yok. İlk adımı atarak zihinsel yolculuğunu başlat ve içgörülerini ortaya çıkar.</Text>
                    <View style={styles.featuresContainer}>
                        {features.map((feature, index) => (
                            <View key={index} style={styles.featureTag}>
                                <Ionicons name="checkmark-circle" size={14} color={theme.tint} style={styles.featureIcon} />
                                <Text style={styles.featureText}>{feature}</Text>
                            </View>
                        ))}
                    </View>
                    <TouchableOpacity style={styles.discoveryButtonWrapper} activeOpacity={0.8} onPress={onPressCTA}>
                        <LinearGradient colors={theme.ctaButton} style={styles.discoveryButton}>
                            <Text style={styles.discoveryButtonText}>Terapistini Seç ve Başla</Text>
                            <Ionicons name="arrow-forward-circle" size={22} color={'#fff'} />
                        </LinearGradient>
                    </TouchableOpacity>
                </LinearGradient>
            </View>
        </View>
    );
};

const MessageBubble: React.FC<{ message: { sender: string; text: string } }> = ({ message }) => {
  const isAI = message.sender === 'ai';
  return (
    <View style={[ styles.bubble, isAI ? styles.aiBubble : styles.userBubble ]}>
        <Text style={styles.bubbleText}>{message.text}</Text>
    </View>
  );
};

const AnimatedSessionCard: React.FC<{ event: SessionEvent }> = ({ event }) => {
    const fadeAnim = React.useRef(new Animated.Value(0)).current;
    React.useEffect(() => { Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start(); }, []);
    return (
        <Animated.View style={{ opacity: fadeAnim }}>
            <View style={styles.detailCard}>
                <View style={styles.messagesContainer}>
                    {event.data?.messages?.length ? event.data.messages.map((m, i) => <MessageBubble key={i} message={m} />) : <Text style={styles.emptyText}>Bu seans için döküm bulunamadı.</Text>}
                </View>
            </View>
        </Animated.View>
    );
};

// ---- ANA EKRAN BİLEŞENİ ----
export default function PremiumHistoryScreen() {
  const navigation = useNavigation();
  const [isLoading, setIsLoading] = React.useState(true);
  const [viewMode, setViewMode] = React.useState<ViewMode>('menu');
  const [allEvents, setAllEvents] = React.useState<AppEvent[]>([]);
  const [selectedSessionType, setSelectedSessionType] = React.useState<EventType | null>(null);
  const [selectedEvent, setSelectedEvent] = React.useState<SessionEvent | null>(null);

  useFocusEffect(
    React.useCallback(() => {
      const loadAllEvents = async () => {
        setIsLoading(true);
        setViewMode('menu'); 
        const eventsFromStorage = await getEventsForLast(365);
        setAllEvents(eventsFromStorage);
        setIsLoading(false);
      };
      loadAllEvents();
    }, [])
  );
  
  const handleSelectSessionType = (type: EventType) => { setSelectedSessionType(type); setViewMode('summaryList'); };
  const handleSelectEvent = (event: SessionEvent) => { setSelectedEvent(event); setViewMode('detailView'); };
  
  const handleNavigateToPremium = () => {
      console.log("Navigating to AvatarScreen...");
      // @ts-ignore
      navigation.navigate('avatar');
  };

  const renderContent = () => {
    if (isLoading) { return <View style={styles.loadingContainer}><ActivityIndicator size="large" color={theme.tint} /></View>; }
    switch (viewMode) {
      case 'menu':
        return (
          <View>
            <ScreenHeader title="Yolculuğum" onBack={() => navigation.goBack()}/>
            <Text style={styles.pageSubtitle}>Geçmiş seanslarına göz atarak içgörülerini keşfet.</Text>
            <View style={styles.selectionContainer}>
              <SelectionCard title="Yazılı Görüşme" description="Düşüncelerini yazıya dökerek netleş" icon="chatbubble-ellipses-outline" onPress={() => handleSelectSessionType('text_session')} />
              <SelectionCard title="Sesli Görüşme" description="Sesinle duygularını ifade et" icon="mic-outline" onPress={() => handleSelectSessionType('voice_session')} />
              <SelectionCard title="Görüntülü Görüşme" description="Yüz yüze bağ kurarak anlaşıl" icon="videocam-outline" onPress={() => handleSelectSessionType('video_session')} />
            </View>
          </View>
        );
      case 'summaryList': {
        const filteredEvents = allEvents.filter(e => e.type === selectedSessionType).sort((a,b) => b.timestamp - a.timestamp).map((e) => e as SessionEvent);
        const sessionTitles = { text_session: "Yazı Geçmişi", voice_session: "Sesli Geçmiş", video_session: "Görüntülü Geçmiş" };
        const title = sessionTitles[selectedSessionType!] || "Geçmiş Seanslar";
        return (
          <View style={{flex: 1}}>
            <ScreenHeader title={title} onBack={() => setViewMode('menu')} />
            {filteredEvents.length === 0 ? (
                <PremiumDiscoveryCard onPressCTA={handleNavigateToPremium} />
            ) : (
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.summaryListContainer}>
                {filteredEvents.map(event => ( <SummaryCard key={event.id} event={event} onPress={() => handleSelectEvent(event)} /> ))}
              </ScrollView>
            )}
          </View>
        );
      }
      case 'detailView': {
        if (!selectedEvent) return null;
        const date = new Date(selectedEvent.timestamp);
        const detailTitle = date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' });
        return (
          <View style={{flex: 1}}>
            <ScreenHeader title={detailTitle} onBack={() => setViewMode('summaryList')} />
            <ScrollView showsVerticalScrollIndicator={false}>
                <AnimatedSessionCard key={selectedEvent.id} event={selectedEvent} />
            </ScrollView>
          </View>
        );
      }
    }
  };
  return ( <LinearGradient colors={theme.backgroundGradient} style={styles.screen}><View style={styles.container}>{renderContent()}</View></LinearGradient> );
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

  summaryListContainer: { gap: 16, marginTop: 24, paddingBottom: 40 },
  summaryCard: { borderRadius: 24, overflow: 'hidden', shadowColor: theme.shadow, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.08, shadowRadius: 16, elevation: 4, borderWidth: 1, borderColor: theme.divider },
  summaryCardGradient: { padding: 20, },
  summaryHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12, borderBottomWidth: 1, borderBottomColor: theme.divider, paddingBottom: 12 },
  summaryDateText: { fontSize: 14, fontWeight: '600', color: theme.softText },
  summaryTitle: { fontSize: 18, fontWeight: '600', color: theme.text, letterSpacing: -0.3, marginBottom: 8 },
  summaryText: { fontSize: 15, color: theme.softText, lineHeight: 22 },
  
  discoveryContainer: { flex: 1, justifyContent: 'center', paddingVertical: 24 },
  discoveryCard: { borderRadius: 24, overflow: 'hidden', shadowColor: theme.tint, shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.15, shadowRadius: 24, elevation: 12, borderWidth: 1.5, borderColor: 'rgba(93, 161, 217, 0.2)' },
  discoveryContent: { padding: 24 },
  discoveryTitle: { fontSize: 24, fontWeight: '600', color: theme.text, marginBottom: 12, letterSpacing: -0.5 },
  discoveryDescription: { fontSize: 16, color: theme.softText, lineHeight: 24, marginBottom: 24 },
  featuresContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 8, marginBottom: 24 },
  featureTag: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(93,161,217,0.1)', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16, },
  featureIcon: { marginRight: 6 },
  featureText: { fontSize: 13, color: theme.tint, fontWeight: '500' },
  discoveryButtonWrapper: { shadowColor: theme.tint, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 16, borderRadius: 28 },
  discoveryButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 18, borderRadius: 28, gap: 10 },
  discoveryButtonText: { color: '#fff', fontSize: 17, fontWeight: '600', letterSpacing: -0.3 },
  
  detailCard: { marginTop: 16, backgroundColor: 'transparent' },
  messagesContainer: { padding: 12, gap: 16 },
  bubble: { padding: 18, borderRadius: 24, marginBottom: 8, maxWidth: '85%', shadowColor: theme.shadow, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.07, shadowRadius: 12, elevation: 4, borderWidth: 1, },
  aiBubble: { alignSelf: 'flex-start', backgroundColor: theme.aiBubble, borderTopLeftRadius: 6, borderColor: theme.divider },
  userBubble: { alignSelf: 'flex-end', backgroundColor: theme.userBubble, borderTopRightRadius: 6, borderColor: 'rgba(93, 161, 217, 0.2)' },
  bubbleText: { color: theme.text, fontSize: 16, lineHeight: 24, letterSpacing: -0.2 },
  emptyText: { color: theme.softText, fontStyle: 'italic', padding: 20, textAlign: 'center' },
});