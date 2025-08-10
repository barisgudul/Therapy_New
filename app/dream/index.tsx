//app/dream/index.tsx
import { Ionicons } from "@expo/vector-icons";
import { FlashList } from "@shopify/flash-list";
import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router/";
import { MotiView } from "moti";
import React, { useCallback, useMemo } from "react";
import {
  ActivityIndicator,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Toast from "react-native-toast-message";
import SkeletonCard from "../../components/dream/SkeletonCard.tsx";
import { COSMIC_COLORS } from "../../constants/Colors.ts";
import { AppEvent, getDreamEvents } from "../../services/event.service.ts";
import { supabase } from "../../utils/supabase.ts";

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
    hasNextPage, // YENİ: Getirilecek daha fazla sayfa var mı?
    isFetchingNextPage, // YENİ: Sonraki sayfa yükleniyor mu?
  } = useInfiniteQuery<AppEvent[]>({
    queryKey: ["dreamEvents"], // Anahtar aynı kalabilir
    initialPageParam: 0,
    queryFn: ({ pageParam }) =>
      getDreamEvents({ pageParam: pageParam as number }), // Fonksiyonumuz zaten uyumlu
    getNextPageParam: (lastPage, allPages) => {
      // Bu fonksiyon, bir sonraki sayfanın numarasını hesaplar.
      // Eğer son çektiğimiz sayfa (lastPage) boşsa, demek ki daha fazla veri yoktur.
      // Aksi halde, mevcut sayfa sayısını bir artır.
      return lastPage.length === 0 ? undefined : allPages.length;
    },
  });

  // Gelen 'data' objesi artık iç içe geçmiş bir dizi. Bunu düzleştirmeliyiz.
  const analyses = data?.pages.flatMap((page) => page) ?? [];

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

  // YENİ: useMutation ile silme işlemi - Artık akıllı Edge Function kullanıyor
  const deleteMutation = useMutation({
    // 🔥 YENİ MUTASYON FONKSİYONU: Artık yeni Edge Function'ımızı çağırıyor.
    mutationFn: async (eventIdToDelete: string) => {
      const { error } = await supabase.functions.invoke("delete-dream-memory", {
        body: { event_id: eventIdToDelete },
      });
      if (error) {
        // Hata mesajını daha anlaşılır hale getir
        throw new Error(
          `Rüya silinirken sunucuda bir hata oluştu: ${error.message}`,
        );
      }
      return eventIdToDelete; // Başarılı olursa silinen ID'yi döndür
    },

    // onMutate (optimistic update) kısmı aynı kalabilir, o zaten iyi çalışıyor.
    onMutate: async (deletedEventId: string) => {
      await queryClient.cancelQueries({ queryKey: ["dreamEvents"] });
      const previousAnalyses = queryClient.getQueryData(["dreamEvents"]);

      queryClient.setQueryData(
        ["dreamEvents"],
        (
          old: { pages?: AppEvent[][]; pageParams?: unknown[] } | undefined,
        ) => ({
          pages: old?.pages?.map((page: AppEvent[]) =>
            page.filter((event) => event.id !== deletedEventId)
          ),
          pageParams: old?.pageParams,
        }),
      );

      Toast.default.show({
        type: "custom",
        text1: "Rüya Silindi",
        text2: "İşlem geri alınabilir.",
        props: {
          onUndo: () => {
            // Geri Alma mantığı şimdilik sadece UI'ı geri alır.
            // Sunucuda geri alma daha karmaşık, onu sonra yaparız.
            queryClient.setQueryData(["dreamEvents"], previousAnalyses);
            Toast.default.hide();
          },
        },
      });

      return { previousAnalyses };
    },

    // onError ve onSettled kısımları da aynı kalabilir.
    onError: (err, _variables, context) => {
      console.error("Silme hatası, rollback yapılıyor:", err);
      if (context?.previousAnalyses) {
        queryClient.setQueryData(["dreamEvents"], context.previousAnalyses);
      }
      Toast.default.show({
        type: "error",
        text1: "Hata",
        text2: "Rüya silinirken bir sorun oluştu.",
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["dreamEvents"] });
    },
  });

  const handleDelete = (eventId: string) => {
    // Artık handleDelete tek satır. Bütün mantık useMutation içinde.
    deleteMutation.mutate(eventId);
  };

  // YENİ: Memoized empty component
  const memoizedEmptyComponent = useMemo(() => (
    <View style={styles.emptyState}>
      <Ionicons
        name="moon-outline"
        size={60}
        color={COSMIC_COLORS.textSecondary}
      />
      <Text style={styles.emptyTitle}>Henüz analiz edilmiş bir rüya yok.</Text>
      <Text style={styles.emptySubtext}>
        Aşağıdaki butona dokunarak ilk rüya analizinizi alın.
      </Text>
    </View>
  ), []);

  const renderDreamCard = (
    { item, index }: { item: AppEvent; index: number },
  ) => (
    <MotiView
      from={{ opacity: 0, translateY: 50 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ delay: Math.min(index * 50, 300) }}
    >
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.8}
        onPress={() =>
          router.push({ pathname: "/dream/result", params: { id: item.id } })}
      >
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle} numberOfLines={1}>
            {(item.data.analysis as { title?: string })?.title ||
              "Başlıksız Rüya"}
          </Text>
          <Text style={styles.cardDate}>
            {new Date(item.timestamp).toLocaleDateString("tr-TR", {
              day: "numeric",
              month: "long",
            })}
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => handleDelete(item.id)}
          style={styles.deleteIcon}
        >
          <Ionicons
            name="trash-bin-outline"
            size={22}
            color={COSMIC_COLORS.textSecondary}
          />
        </TouchableOpacity>
      </TouchableOpacity>
    </MotiView>
  );

  // VARSAYILAN OLARAK BU KISIM GÖRÜNÜR (RÜYA LİSTESİ)
  return (
    <LinearGradient colors={COSMIC_COLORS.background} style={styles.container}>
      <SafeAreaView style={{ flex: 1 }}>
        <TouchableOpacity
          onPress={() =>
            router.back()}
          style={styles.backButton}
        >
          <Ionicons
            name="chevron-back"
            size={28}
            color={COSMIC_COLORS.textPrimary}
          />
        </TouchableOpacity>

        <View style={styles.header}>
          <Text style={styles.headerTitle}>Rüya Günlüğü</Text>
          <Text style={styles.headerSubtext}>
            Bilinçaltınızı analizlerle keşfedin.
          </Text>
        </View>

        {isLoading
          ? ( // 'isLoading' doğrudan useQuery'den geliyor
            <View style={styles.skeletonContainer}>
              {Array.from({ length: 4 }).map((_, index) => (
                <SkeletonCard key={`skeleton-${index}`} delay={index} />
              ))}
            </View>
          )
          : (
            <FlashList
              data={analyses} // Düzleştirilmiş veriyi kullan
              renderItem={renderDreamCard}
              keyExtractor={(item) => item.id.toString()}
              estimatedItemSize={200} // Boş state yüksekliğine göre ayarla
              contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 20 }}
              onRefresh={onRefresh}
              refreshing={isRefetching} // 'isRefetching' kullanmak daha doğru.
              onEndReached={loadMore} // Sayfa sonuna gelince çağrılacak fonksiyon
              onEndReachedThreshold={0.5} // Ekranın yarısına gelince yüklemeye başla
              // YENİ: Sayfa yüklenirken altta bir loading göstergesi
              ListFooterComponent={isFetchingNextPage
                ? <ActivityIndicator style={{ marginVertical: 20 }} />
                : null}
              ListEmptyComponent={memoizedEmptyComponent}
            />
          )}

        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.newDreamButton}
            onPress={() =>
              router.push("/dream/analyze")}
          >
            <View style={styles.newDreamButtonContent}>
              <Ionicons
                name="add"
                size={24}
                color={COSMIC_COLORS.textPrimary}
              />
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
  backButton: {
    position: "absolute",
    top: 60,
    left: 20,
    zIndex: 10,
    padding: 8,
  },
  header: { paddingTop: 120, paddingBottom: 30, alignItems: "center" },
  headerTitle: {
    color: COSMIC_COLORS.textPrimary,
    fontSize: 32,
    fontWeight: "bold",
    letterSpacing: -1,
  },
  headerSubtext: {
    color: COSMIC_COLORS.textSecondary,
    fontSize: 16,
    marginTop: 8,
  },
  card: {
    backgroundColor: COSMIC_COLORS.card,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COSMIC_COLORS.cardBorder,
    flexDirection: "row",
    alignItems: "center",
  },
  cardTitle: {
    color: COSMIC_COLORS.textPrimary,
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 6,
  },
  cardDate: { color: COSMIC_COLORS.textSecondary, fontSize: 14 },
  deleteIcon: { padding: 10 },
  footer: {
    padding: 20,
    borderTopColor: COSMIC_COLORS.cardBorder,
    borderTopWidth: 1,
  },
  newDreamButton: {
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  newDreamButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  newDreamButtonText: {
    color: COSMIC_COLORS.textPrimary,
    fontSize: 17,
    fontWeight: "600",
    marginLeft: 8,
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: "20%",
  },
  emptyTitle: {
    color: COSMIC_COLORS.textPrimary,
    fontSize: 22,
    fontWeight: "bold",
    marginTop: 20,
  },
  emptySubtext: {
    color: COSMIC_COLORS.textSecondary,
    fontSize: 16,
    textAlign: "center",
    marginTop: 10,
    maxWidth: "80%",
  },
  skeletonContainer: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 20,
  },
});
