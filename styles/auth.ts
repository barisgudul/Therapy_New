// styles/auth.ts
import { StyleSheet } from "react-native";
import { Colors } from "../constants/Colors";

const SPACING = { small: 8, medium: 16, large: 24 };
const BORDER_RADIUS = { button: 22, card: 32, input: 20 }; // Kart radius'unu primer ile eşitle

export const authScreenStyles = StyleSheet.create({
  // Ana Zemin
  background: { flex: 1, backgroundColor: "#F7FAFF" },
  container: { flexGrow: 1, justifyContent: "center", padding: SPACING.medium }, // Dış padding'i biraz azalttık

  // SAHNE DIŞI: Header (Sadece marka)
  headerContainer: {
    alignItems: "center",
    marginBottom: SPACING.medium, // Kart ile arasına boşluk
  },
  brand: {
    fontSize: 32,
    fontWeight: "600",
    color: Colors.light.tint,
    textTransform: "lowercase",
    letterSpacing: 1.8,
  },
  dot: {
    color: Colors.light.tint,
    fontSize: 36,
    fontWeight: "900",
  },

  // SAHNE: İşte tüm sihir burada. Form elemanlarını içine alacak olan kart.
  formCard: {
    backgroundColor: "#fff",
    borderRadius: BORDER_RADIUS.card,
    padding: SPACING.large,
    borderWidth: 1,
    borderColor: "rgba(93,161,217,0.12)",
    shadowColor: "#6C63FF",
    shadowOpacity: 0.1,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },

  // KART İÇİ: Başlıklar
  title: {
    fontSize: 32,
    fontWeight: "700",
    color: Colors.light.tint,
    textAlign: "center", // Başlığı kartın içinde ortala
  },
  subtitle: {
    marginTop: SPACING.small,
    fontSize: 16,
    color: "#4A5568",
    textAlign: "center",
    marginBottom: SPACING.large, // Altındaki formla arasına boşluk
  },

  // KART İÇİ: Form Stilleri
  formContainer: {/* Artık ekstra margin'e ihtiyacı yok */},
  inputWrapper: {
    backgroundColor: "#FFFFFF",
    borderRadius: BORDER_RADIUS.input,
    borderWidth: 1,
    borderColor: "rgba(93,161,217,0.2)",
    marginBottom: SPACING.large,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: SPACING.medium,
  },
  inputIcon: {
    color: Colors.light.tint,
    opacity: 0.6,
    marginRight: 12,
  },
  input: {
    flex: 1,
    height: 60,
    fontSize: 16,
    color: "#1E293B",
  },
  inputSeparator: {
    height: 1,
    backgroundColor: "rgba(93,161,217,0.2)",
    marginLeft: 45,
  },
  errorText: {
    color: "#E53E3E",
    textAlign: "center",
    marginBottom: SPACING.medium,
  },

  // SAHNE DIŞI: Footer
  footer: {
    marginTop: SPACING.large,
    alignItems: "center",
  },
  linkText: {
    color: "#4A5568",
    fontSize: 15,
  },
  linkTextBold: {
    fontWeight: "600",
    color: Colors.light.tint,
  },
});
