//app/dream/index.tsx
import { Ionicons } from '@expo/vector-icons';
import { FlashList } from '@shopify/flash-list';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router/';
import { MotiView } from 'moti';
import React, { useCallback, useMemo } from 'react';
import {
  ActivityIndicator,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import Toast from 'react-native-toast-message';
import SkeletonCard from '../../components/dream/SkeletonCard';
import { COSMIC_COLORS } from '../../constants/Colors';
import { AppEvent, deleteEventById, getDreamEvents, logEvent } from '../../services/event.service';

export default function DreamJournalScreen() {
  const router = useRouter();
  const queryClient = useQueryClient(); // Query client'a erişim için

  // YENİ: useInfiniteQuery ile sonsuz kaydırma
  const {
    data, // Artık 'data' objesi içinde 'pages' ve 'pageParams' var
    isLoading,
    refetch,
    isRefetching,
    fetchNextPage, // YENİ: Sonraki sayfayı getirme fonksiyonu
    hasNextPage,   // YENİ: Getirilecek daha fazla sayfa var mı?
    isFetchingNextPage, // YENİ: Sonraki sayfa yükleniyor mu?
  } = useInfiniteQuery<AppEvent[]>({
    queryKey: ['dreamEvents'], // Anahtar aynı kalabilir
    initialPageParam: 0,
    queryFn: ({ pageParam }) => getDreamEvents({ pageParam: pageParam as number }),   // Fonksiyonumuz zaten uyumlu
    getNextPageParam: (lastPage, allPages) => {
      // Bu fonksiyon, bir sonraki sayfanın numarasını hesaplar.
      // Eğer son çektiğimiz sayfa (lastPage) boşsa, demek ki daha fazla veri yoktur.
      // Aksi halde, mevcut sayfa sayısını bir artır.
      return lastPage.length === 0 ? undefined : allPages.length;
    },
  });

  // Gelen 'data' objesi artık iç içe geçmiş bir dizi. Bunu düzleştirmeliyiz.
  const analyses = data?.pages.flatMap(page => page) ?? [];

  // onRefresh fonksiyonu artık tek satır.
  const onRefresh = useCallback(async () => {
    await refetch();
  }, [refetch]);

  // YENİ: Sayfa sonuna gelince ne yapılacağı
  const loadMore = () => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  };

  // YENİ: useMutation ile silme işlemi
  const deleteMutation = useMutation({
    mutationFn: deleteEventById, // Hangi fonksiyonu çalıştıracak?
    onMutate: async (deletedEventId: string) => {
      // API isteği gitmeden HEMEN ÖNCE çalışır. Optimistic update burada yapılır.
      
      // 1. Devam eden 'dreamEvents' sorgularını iptal et ki, bizim UI değişikliğimizin üzerine yazmasın.
      await queryClient.cancelQueries({ queryKey: ['dreamEvents'] });

      // 2. Cache'deki mevcut verinin bir yedeğini al (hata durumunda geri dönmek için).
      const previousAnalyses = queryClient.getQueryData(['dreamEvents']);
      const previousEvent = analyses.find(event => event.id === deletedEventId);

      // 3. Cache'i yeni veriyle (silinmiş haliyle) güncelle.
      queryClient.setQueryData(['dreamEvents'], (old: any) => ({
        pages: old?.pages?.map((page: AppEvent[]) => 
          page.filter(event => event.id !== deletedEventId)
        ),
        pageParams: old?.pageParams,
      }));
      
      // 4. Özel toast ile "Geri Al" seçeneği sun.
      Toast.show({
        type: 'custom',
        text1: 'Rüya Silindi',
        text2: 'İşlem geri alınabilir.',
        props: {
          onUndo: async () => {
            if (previousAnalyses && previousEvent) {
              // Veritabanına geri yaz - orijinal timestamp'i koru
              const eventToRestore = {
                ...previousEvent,
                timestamp: previousEvent.timestamp, // Orijinal timestamp'i koru
                created_at: previousEvent.created_at // Orijinal created_at'i koru
              };
              await logEvent(eventToRestore);
              // Cache'i güncelle
              queryClient.setQueryData(['dreamEvents'], previousAnalyses);
            }
            Toast.hide();
          }
        }
      });
      
      // 5. Yedeği geri döndür. Hata olursa bu kullanılacak.
      return { previousAnalyses, previousEvent };
    },
    onError: (err, variables, context) => {
      // Eğer mutasyon başarısız olursa...
      console.error("Silme hatası, rollback yapılıyor:", err);
      // 'onMutate'den aldığımız yedekle cache'i eski haline getir.
      if (context?.previousAnalyses) {
        queryClient.setQueryData(['dreamEvents'], context.previousAnalyses);
      }
      Toast.show({
          type: 'error',
          text1: 'Hata',
          text2: 'Rüya silinirken bir sorun oluştu.'
      });
    },
    onSettled: () => {
      // Başarılı veya hatalı, her durumda sonunda 'dreamEvents' sorgusunu tekrar doğrula.
      queryClient.invalidateQueries({ queryKey: ['dreamEvents'] });
    },
  });

  const handleDelete = (eventId: string) => {
    // Artık handleDelete tek satır. Bütün mantık useMutation içinde.
    deleteMutation.mutate(eventId);
  };

  // YENİ: Memoized empty component
  const memoizedEmptyComponent = useMemo(() => (
    <View style={styles.emptyState}>
      <Ionicons name="moon-outline" size={60} color={COSMIC_COLORS.textSecondary} />
      <Text style={styles.emptyTitle}>Henüz analiz edilmiş bir rüya yok.</Text>
      <Text style={styles.emptySubtext}>Aşağıdaki butona dokunarak ilk rüya analizinizi alın.</Text>
    </View>
  ), []);

  const renderDreamCard = ({ item, index }: { item: AppEvent, index: number }) => (
    <MotiView
      from={{ opacity: 0, translateY: 50 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ delay: Math.min(index * 50, 300) }}
    >
        <TouchableOpacity
            style={styles.card}
            activeOpacity={0.8}
            onPress={() => router.push({ pathname: '/dream/result', params: { id: item.id } })}
        >
            <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle} numberOfLines={1}>{item.data.analysis.title}</Text>
                <Text style={styles.cardDate}>
                  {new Date(item.timestamp).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' })}
                </Text>
            </View>
            <TouchableOpacity onPress={() => handleDelete(item.id)} style={styles.deleteIcon}>
                 <Ionicons name="trash-bin-outline" size={22} color={COSMIC_COLORS.textSecondary} />
            </TouchableOpacity>
        </TouchableOpacity>
    </MotiView>
  );

  // VARSAYILAN OLARAK BU KISIM GÖRÜNÜR (RÜYA LİSTESİ)
  return (
    <LinearGradient colors={COSMIC_COLORS.background} style={styles.container}>
      <SafeAreaView style={{ flex: 1 }}>
        
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={28} color={COSMIC_COLORS.textPrimary} />
        </TouchableOpacity>

        <View style={styles.header}>
            <Text style={styles.headerTitle}>Rüya Günlüğü</Text>
            <Text style={styles.headerSubtext}>Bilinçaltınızı analizlerle keşfedin.</Text>
        </View>

        {isLoading ? ( // 'isLoading' doğrudan useQuery'den geliyor
          <View style={styles.skeletonContainer}>
            {Array.from({ length: 4 }).map((_, index) => (
                <SkeletonCard key={`skeleton-${index}`} delay={index} />
            ))}
          </View>
        ) : (
          <FlashList
            data={analyses} // Düzleştirilmiş veriyi kullan
            renderItem={renderDreamCard}
            keyExtractor={(item) => item.id.toString()}
            estimatedItemSize={200}  // Boş state yüksekliğine göre ayarla
            contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 20 }}
            onRefresh={onRefresh}
            refreshing={isRefetching} // 'isRefetching' kullanmak daha doğru.
            onEndReached={loadMore} // Sayfa sonuna gelince çağrılacak fonksiyon
            onEndReachedThreshold={0.5} // Ekranın yarısına gelince yüklemeye başla
            // YENİ: Sayfa yüklenirken altta bir loading göstergesi
            ListFooterComponent={isFetchingNextPage ? <ActivityIndicator style={{ marginVertical: 20 }} /> : null}
            ListEmptyComponent={memoizedEmptyComponent}
          />
        )}

        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.newDreamButton}
            onPress={() => router.push('/dream/analyze')}
          >
            <View style={styles.newDreamButtonContent}>
              <Ionicons name="add" size={24} color={COSMIC_COLORS.textPrimary} />
              <Text style={styles.newDreamButtonText}>Yeni Rüya Analizi</Text>
            </View>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  backButton: { position: 'absolute', top: 60, left: 20, zIndex: 10, padding: 8 },
  header: { paddingTop: 120, paddingBottom: 30, alignItems: 'center' },
  headerTitle: { color: COSMIC_COLORS.textPrimary, fontSize: 32, fontWeight: 'bold', letterSpacing: -1 },
  headerSubtext: { color: COSMIC_COLORS.textSecondary, fontSize: 16, marginTop: 8 },
  card: { backgroundColor: COSMIC_COLORS.card, borderRadius: 16, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: COSMIC_COLORS.cardBorder, flexDirection: 'row', alignItems: 'center' },
  cardTitle: { color: COSMIC_COLORS.textPrimary, fontSize: 18, fontWeight: '600', marginBottom: 6 },
  cardDate: { color: COSMIC_COLORS.textSecondary, fontSize: 14 },
  deleteIcon: { padding: 10 },
  footer: { padding: 20, borderTopColor: COSMIC_COLORS.cardBorder, borderTopWidth: 1 },
  newDreamButton: { 
    height: 56,
    borderRadius: 28, 
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  newDreamButtonContent: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center' 
  },
  newDreamButtonText: { color: COSMIC_COLORS.textPrimary, fontSize: 17, fontWeight: '600', marginLeft: 8 },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: '20%' },
  emptyTitle: { color: COSMIC_COLORS.textPrimary, fontSize: 22, fontWeight: 'bold', marginTop: 20 },
  emptySubtext: { color: COSMIC_COLORS.textSecondary, fontSize: 16, textAlign: 'center', marginTop: 10, maxWidth: '80%' },
  skeletonContainer: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 20,
  },
});
