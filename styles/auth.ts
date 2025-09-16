// styles/auth.ts
import { StyleSheet } from "react-native";
import { Colors } from "../constants/Colors";

const SPACING = { small: 8, medium: 16, large: 24 };
const BORDER_RADIUS = { button: 22, card: 32, input: 20 }; // Kart radius'unu primer ile eşitle

export const authScreenStyles = StyleSheet.create({
  // Ana Zemin
  background: { flex: 1, backgroundColor: "#F7FAFF" },
  container: { flexGrow: 1, justifyContent: "center", padding: SPACING.medium }, // Dış padding'i biraz azalttık

  // ARTIK DIŞARIDA BİR HEADER'A İHTİYACIMIZ YOK. HER ŞEY KARTIN İÇİNDE.

  formCard: {
    backgroundColor: "#fff",
    borderRadius: BORDER_RADIUS.card,
    padding: SPACING.large,
    alignItems: "center", // KARTIN İÇİNDEKİ HER ŞEYİ ORTALA
    borderWidth: 1,
    borderColor: "rgba(93,161,217,0.12)",
    shadowColor: "#6C63FF",
    shadowOpacity: 0.1,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },

  // YENİ: Logo stilimiz
  logo: {
    width: 64,
    height: 64,
    marginBottom: SPACING.large,
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
  formContainer: { width: "100%" }, // Formun kartın tamamını kaplamasını sağla
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
  // YENİ: Hatalı input için stil
  inputWrapperError: {
    borderColor: "#E53E3E", // Kırmızı çerçeve
    shadowColor: "#E53E3E", // Gölgeyi de kırmızı yap
    shadowOpacity: 0.15,
  },

  // ESKİ errorText'i SİLİP BUNU EKLE:
  errorContainer: {
    backgroundColor: "rgba(229, 62, 62, 0.1)", // Hafif kırmızı arka plan
    borderRadius: 12,
    padding: SPACING.medium,
    marginBottom: SPACING.medium,
    borderWidth: 1,
    borderColor: "rgba(229, 62, 62, 0.2)",
  },
  errorMessage: {
    color: "#C53030", // Koyu kırmızı metin
    textAlign: "center",
    fontWeight: "500",
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

  // YENİ VE PROFESYONEL AYIRICI
  dividerContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: SPACING.large, // E-posta butonuyla arasına net bir boşluk koy
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "rgba(93,161,217,0.2)", // Zarif bir çizgi
  },
  dividerText: {
    marginHorizontal: SPACING.medium,
    color: "#A0AEC0", // Rengi daha silik, daha az dikkat dağıtıcı
    fontWeight: "500",
    fontSize: 14,
  },

  // NİHAİ SOSYAL BUTON STİLLERİ
  socialContainer: {
    flexDirection: "row", // Butonları yan yana koy
    gap: SPACING.medium,
  },
  socialButton: {
    flex: 1, // Mevcut alanı eşit olarak paylaşsınlar
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: BORDER_RADIUS.button,
    paddingVertical: 16, // Padding'i biraz azaltarak daha dengeli hale getir
    borderWidth: 1,
    borderColor: "rgba(93,161,217,0.15)",
    shadowColor: "#6C63FF",
    shadowOpacity: 0.07,
    shadowRadius: 15,
    shadowOffset: { width: 0, height: 5 },
    elevation: 4,
  },
  // ESKİ socialIcon stilini SİL.
  // YENİ VE GÜÇLÜ VEKTÖR İKON STİLİ
  socialIconVector: {
    fontSize: 28, // Font boyutuyla ikonun boyutunu kontrol et
    color: "#4A5568", // Nötr ama güçlü bir renk
  },
  // Artık socialButtonText'e ihtiyacımız yok, SİL.
});
