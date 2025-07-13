// styles/auth.ts (APPLE HUMAN INTERFACE GUIDELINES TADINDA)

import { StyleSheet } from 'react-native';
import { Colors } from '../constants/Colors';
import { Spacing } from '../constants/Design';

export const authScreenStyles = StyleSheet.create({
  // TEMEL YAPI: Temiz, aydınlık, ferah.
  background: {
    flex: 1,
    backgroundColor: '#F9F9F9', // Saf beyaz değil, çok hafif bir gri. iOS hissi.
  },
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.large,
    paddingBottom: Spacing.large,
  },

  // BAŞLIK: Net, okunaklı, hiyerarşik.
  headerContainer: {
    alignItems: 'center',
    marginBottom: Spacing.xxlarge + Spacing.medium, // Daha fazla boşluk.
  },
  brand: {
    fontSize: 32, // Daha cesur.
    fontWeight: '700', // Apple'ın sevdiği gibi.
    color: Colors.light.tint,
    textTransform: 'lowercase',
    letterSpacing: 1,
  },
  dot: {
    color: Colors.light.tint,
    fontWeight: '800',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1c1c1e', // Neredeyse siyah.
    marginTop: Spacing.large,
    marginBottom: Spacing.small,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 17,
    color: '#8e8e93', // iOS'in ikincil metin rengi.
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: '95%',
  },
  
  // FORM ELEMANLARI: iOS Ayarlar menüsü gibi. Gruplanmış, temiz.
  inputWrapper: {
    backgroundColor: '#FFFFFF', // Saf beyaz arka plan.
    borderRadius: 12, // iOS standardı.
    overflow: 'hidden', // Çizgiler taşmasın.
    marginBottom: Spacing.xlarge,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 50,
    paddingHorizontal: Spacing.medium,
  },
  inputSeparator: {
    height: StyleSheet.hairlineWidth, // PİKSEL MÜKEMMELLİĞİ.
    backgroundColor: '#c6c6c8',
    marginLeft: Spacing.medium + 22 + 12, // ikon + boşluk kadar içeriden başlar.
  },
  inputIcon: {
    marginRight: 12,
    color: Colors.light.tint,
  },
  input: {
    flex: 1,
    fontSize: 17,
    color: '#1c1c1e',
  },
  
  // ANA BUTON: DOLU, GÜÇLÜ, NET.
  button: {
    height: 52,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.light.tint, // Gradient yok. Düz renk.
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
  },
  
  // İKİNCİL BUTON (YEŞİL)
  greenButton: {
    backgroundColor: '#34C759', // iOS'in standart yeşili.
  },

  // ALT LİNK
  footer: {
    alignItems: 'center',
    marginTop: Spacing.xlarge,
  },
  linkText: {
    fontSize: 15,
    color: '#8e8e93',
  },
  linkTextBold: {
    color: Colors.light.tint,
    fontWeight: '600',
  },
  
  // HATA MESAJI
  errorText: {
    color: '#ff3b30', // iOS'in standart kırmızısı.
    textAlign: 'center',
    marginBottom: Spacing.medium,
    fontSize: 15,
    fontWeight: '500',
  },

  // LayoutAnimation için
  formContainer: {
    // Bu container, animasyonun düzgün çalışması için var.
  },
});