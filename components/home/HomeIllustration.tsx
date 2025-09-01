import React from "react";
import { View, Image, StyleSheet, Text } from "react-native";

export const HomeIllustration: React.FC = () => {
  return (
    <View style={styles.container}>
      {/* RESİM İÇİN BİR SARMALAYICI (WRAPPER) EKLİYORUZ */}
      <View style={styles.imageWrapper}>
        <Image
          source={require("../../assets/therapy-illustration.png")}
          style={styles.illustration}
          resizeMode="contain"
        />
      </View>
      <View style={styles.textContainer}>
        <Text style={styles.title}>Zihnine İyi Bak</Text>
        <Text style={styles.subtitle}>
          Yapay zekâ destekli terapiyi deneyimle
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    width: '100%',
  },
  // YENİ STİLLER BURADA
  imageWrapper: {
    height: 150, // Resmin görünür alanının yüksekliğini tahmin ediyoruz.
                 // Bu değeri değiştirerek ne kadar boşluk kırpılacağını ayarla.
    overflow: 'hidden', // Bu View'in dışına taşan her şeyi gizle.
    marginBottom: 20, // Wrapper ile text arasına düzgün boşluğu geri koyduk.
  },
  illustration: {
    width: 180, // Artık maxWidth değil, sabit genişlik veriyoruz.
    height: 180, // Resmin dosya boyutuna eşit yükseklik.
    // RESMİ YUKARI KAYDIRAN HİLE
    marginTop: -15, // Resmin üstündeki şeffaf boşluğu kırmak için
                    // negatif margin veriyoruz. Bu değeri değiştirerek ayarla.
  },
  textContainer: {
    alignItems: "center",
  },
  title: {
    fontSize: 26,
    fontWeight: "600",
    color: "#1A1F36",
    marginBottom: 8, // Düzgün boşluğu geri koyduk.
    textAlign: "center",
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 15,
    color: "#4A5568",
    textAlign: "center",
    lineHeight: 20, // Düzgün satır yüksekliğini geri koyduk.
    letterSpacing: -0.2,
  },
});