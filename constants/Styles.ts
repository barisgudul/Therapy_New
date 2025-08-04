import { StyleSheet } from 'react-native';
import { COSMIC_COLORS } from './Colors';

export const LIGHT_BORDER = '#E8EDF4';
export const SHADOW_COLOR = '#000';

export const commonStyles = StyleSheet.create({
  // Ana Container Stilleri
  container: {
    flex: 1,
    paddingHorizontal: 22,
    paddingTop: 70,
    backgroundColor: '#F9FAFB',
  },
  flex: {
    flex: 1,
  },
  contentContainer: {
    flex: 1,
    paddingTop: 20,
  },

  // Marka ve Başlık Stilleri
  brand: {
    textAlign: 'center',
    fontSize: 24,
    fontWeight: '600',
          color: COSMIC_COLORS.accent,
      textTransform: 'lowercase',
      marginBottom: 10,
    letterSpacing: -0.5,
  },
  brandDot: {
    color: '#5DA1D9',
    fontSize: 28,
    fontWeight: '700',
  },
  title: {
    textAlign: 'center',
    fontSize: 28,
    fontWeight: '700',
    color: '#1a1c1e',
    marginBottom: 6,
    letterSpacing: -0.5,
  },
  subtitle: {
    textAlign: 'center',
    fontSize: 15,
    color: '#6c7580',
    marginBottom: 30,
    lineHeight: 22,
  },

  // Buton Stilleri
  button: {
    backgroundColor: COSMIC_COLORS.accent,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    shadowColor: COSMIC_COLORS.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonSecondary: {
    backgroundColor: '#fff',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: COSMIC_COLORS.accent,
    flexDirection: 'row',
  },
      buttonSecondaryText: {
      color: COSMIC_COLORS.accent,
      fontSize: 16,
      fontWeight: '600',
  },
  buttonUnified: {
    backgroundColor: '#fff',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: COSMIC_COLORS.accent,
    flexDirection: 'row',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },

  // Kart Stilleri
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 15,
  },
  cardText: {
    fontSize: 15,
    color: '#1a1c1e',
    lineHeight: 22,
    flex: 1,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F0F7FF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Modal Stilleri
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 28,
    padding: 24,
    width: '90%',
    maxWidth: 400,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1a1c1e',
    marginBottom: 16,
    textAlign: 'center',
  },
  modalDivider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    width: '100%',
    marginBottom: 20,
  },
  modalIcon: {
    width: 74,
    height: 74,
    borderRadius: 37,
    backgroundColor: '#F0F7FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },

  // Form Stilleri
  input: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    fontSize: 16,
    color: '#1a1c1e',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 15,
    color: '#4B5563',
    marginBottom: 8,
    fontWeight: '500',
  },

  // Liste Stilleri
  listContainer: {
    paddingBottom: 40,
  },
  loadingCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 15,
    color: COSMIC_COLORS.accent,
    fontWeight: '500',
  },

  // Geri Butonu
  backButton: {
    position: 'absolute',
    top: 50,
    left: 20,
    zIndex: 5,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },

  // Placeholder Stilleri
  placeholderContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  placeholderText: {
    fontSize: 15,
    color: '#9CA3AF',
    textAlign: 'center',
  },

  // Kontrol Kutusu
  controlsBox: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
});

export const cardStyles = StyleSheet.create({
  base: {
    backgroundColor: COSMIC_COLORS.card,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: COSMIC_COLORS.cardBorder,
    padding: 24,
    marginBottom: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    color: COSMIC_COLORS.textPrimary,
    fontSize: 20,
    fontWeight: '600',
    marginLeft: 12,
  },
  text: {
    color: COSMIC_COLORS.textSecondary,
    fontSize: 16,
    lineHeight: 26,
  },
});

export const buttonStyles = StyleSheet.create({
  primary: {
    backgroundColor: COSMIC_COLORS.accent,
    borderRadius: 28,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondary: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 28,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  text: {
    color: COSMIC_COLORS.textPrimary,
    fontSize: 17,
    fontWeight: '600',
  },
}); 