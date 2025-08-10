// app/therapy/avatar.tsx
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router/";
import {
  Dimensions,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Colors } from "../../constants/Colors.ts";
import { ALL_THERAPISTS } from "../../data/therapists.ts";
import { useSubscription } from "../../hooks/useSubscription.ts";

export default function AvatarScreen() {
  const router = useRouter();
  const { planName } = useSubscription();

  // Plan bazlı halka renkleri
  const getRingColors = (): [string, string] => {
    if (planName === "Premium") {
      // Lila tonları
      return ["#DEC9FF", "#CFB3FF"];
    } else if (planName === "+Plus") {
      // Profil ekranındaki mavi tonları
      return [`${Colors.light.tint}33`, `${Colors.light.tint}66`];
    }
    // Varsayılan pastel mavi/lila karışımı
    return ["#E0ECFD", "#F4E6FF"];
  };

  const handleExplore = (therapistId: string) => {
    router.push({
      pathname: "/therapy/therapist_profile",
      params: { id: therapistId },
    });
  };

  return (
    <LinearGradient
      colors={["#F4F6FF", "#FFFFFF"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.back}>
          <Ionicons name="chevron-back" size={28} color={Colors.light.tint} />
        </TouchableOpacity>

        <Text style={styles.brand}>
          therapy<Text style={styles.dot}>.</Text>
        </Text>

        <View style={styles.back} />
      </View>

      <View style={styles.header}>
        <Text style={styles.title}>Terapistini Seç</Text>
        <Text style={styles.subtitle}>
          Senin için en uygun uzmanı seçerek yolculuğuna başla.
        </Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.list}>
          {ALL_THERAPISTS.map((avatar) => (
            <TouchableOpacity
              key={avatar.id}
              style={styles.card}
              onPress={() => handleExplore(avatar.id)}
              activeOpacity={0.9}
            >
              <LinearGradient
                colors={["#FFFFFF", "#F8FAFF"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.cardGradient}
              >
                <View style={styles.avatarContainer}>
                  <LinearGradient
                    colors={getRingColors()}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.avatarGradient}
                  >
                    <Image source={avatar.thumbnail} style={styles.avatar} />
                  </LinearGradient>
                </View>

                <View style={styles.info}>
                  <View style={styles.nameContainer}>
                    <Text style={styles.name}>{avatar.name}</Text>
                    <Text style={styles.titleText}>{avatar.title}</Text>
                  </View>

                  <View style={styles.personaContainer}>
                    <View style={styles.personaIconContainer}>
                      <Ionicons
                        name={avatar.icon}
                        size={14}
                        color={Colors.light.tint}
                      />
                    </View>
                    <Text style={styles.personaText}>{avatar.persona}</Text>
                  </View>

                  <View style={styles.exploreContainer}>
                    <Text style={styles.exploreText}>Terapisti İncele</Text>
                    <Ionicons
                      name="arrow-forward-circle"
                      size={20}
                      color={Colors.light.tint}
                    />
                  </View>
                </View>
              </LinearGradient>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

const { width: _width } = Dimensions.get("window");

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 60,
    paddingHorizontal: 24,
    marginBottom: 20,
  },
  back: {
    backgroundColor: "rgba(255,255,255,0.92)",
    borderRadius: 16,
    padding: 8,
    shadowColor: Colors.light.tint,
    shadowOpacity: 0.12,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    borderWidth: 0.5,
    borderColor: "rgba(227,232,240,0.4)",
  },
  brand: {
    fontSize: 32,
    fontWeight: "600",
    color: Colors.light.tint,
    textTransform: "lowercase",
    letterSpacing: 2,
    opacity: 0.95,
  },
  dot: {
    color: Colors.light.tint,
    fontSize: 38,
    fontWeight: "900",
  },
  header: {
    alignItems: "center",
    paddingBottom: 32,
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: "600",
    color: "#1A1F36",
    marginBottom: 12,
    textAlign: "center",
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    color: "#4A5568",
    textAlign: "center",
    lineHeight: 22,
    letterSpacing: -0.3,
    paddingHorizontal: 20,
  },
  list: {
    paddingHorizontal: 24,
    paddingBottom: 40,
    gap: 24,
  },
  card: {
    borderRadius: 24,
    overflow: "hidden",
    shadowColor: Colors.light.tint,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 12,
    borderWidth: 1.5,
    borderColor: "rgba(93,161,217,0.3)",
  },
  cardGradient: {
    padding: 24,
    flexDirection: "row",
    alignItems: "center",
  },
  avatarContainer: {
    marginRight: 20,
  },
  avatarGradient: {
    width: 90,
    height: 90,
    borderRadius: 45,
    padding: 3,
    shadowColor: Colors.light.tint,
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 20,
    elevation: 8,
  },
  avatar: {
    width: "100%",
    height: "100%",
    borderRadius: 45,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.8)",
  },
  info: {
    flex: 1,
  },
  nameContainer: {
    marginBottom: 8,
  },
  name: {
    fontSize: 20,
    fontWeight: "600",
    color: "#1A1F36",
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  titleText: {
    fontSize: 14,
    color: "#4A5568",
    letterSpacing: -0.2,
  },
  personaContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    backgroundColor: "rgba(93,161,217,0.08)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    alignSelf: "flex-start",
  },
  personaIconContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(93,161,217,0.12)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  personaText: {
    fontSize: 13,
    color: Colors.light.tint,
    fontWeight: "600",
    letterSpacing: -0.2,
  },
  exploreContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  exploreText: {
    fontSize: 15,
    color: Colors.light.tint,
    fontWeight: "600",
    letterSpacing: -0.2,
  },
  scrollView: {
    flex: 1,
  },
});
