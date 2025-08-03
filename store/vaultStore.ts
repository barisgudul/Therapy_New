// store/vaultStore.ts
import { create } from 'zustand';
import { VaultData, updateUserVault } from '../services/vault.service'; // Doğru yolu belirttiğinden emin ol
import { supabase } from '../utils/supabase'; // Doğru yolu belirttiğinden emin ol

// Store'umuzun yapısını tanımlıyoruz.
interface VaultState {
  vault: VaultData | null;
  isLoading: boolean;
  error: string | null;
  // Vault'u SADECE BİR KERE veritabanından çekecek fonksiyon.
  fetchVault: () => Promise<void>; 
  // Vault'u hem state'te hem de veritabanında güncelleyecek fonksiyon.
  updateAndSyncVault: (newVaultData: VaultData) => Promise<void>; 
  // State'i temizleyecek fonksiyon (çıkış yaparken kullanılır).
  clearVault: () => void; 
  // Loading durumunu sıfırlayacak fonksiyon.
  resetLoading: () => void;
  // Debug için vault durumunu logla
  debugVaultState: () => void;
}

// Zustand store'u oluşturuyoruz.
export const useVaultStore = create<VaultState>((set, get) => ({
  vault: null,
  isLoading: false, // DEĞİŞİKLİK 1: Başlangıç durumu 'false' olmalı.
  error: null,

  debugVaultState: () => {
    const currentState = get();
    console.log('🐛 [VAULT-DEBUG] Mevcut vault durumu:', {
      hasVault: !!currentState.vault,
      isLoading: currentState.isLoading,
      error: currentState.error,
      vaultKeys: currentState.vault ? Object.keys(currentState.vault) : [],
      hasProfile: !!currentState.vault?.profile,
      profileData: currentState.vault?.profile,
      hasOnboarding: !!currentState.vault?.onboarding,
      hasMetadata: !!currentState.vault?.metadata,
      onboardingCompleted: currentState.vault?.metadata?.onboardingCompleted
    });
  },

  fetchVault: async () => {
    const currentState = get();
    
    console.log('🔍 [VAULT-STORE] fetchVault çağrıldı:', {
      isLoading: currentState.isLoading,
      hasVault: !!currentState.vault,
      error: currentState.error
    });
    
    // EĞER ZATEN YÜKLENİYORSA, TEKRAR ÇAĞIRMAYI ENGELE! BU ASIL GUARD KOŞULUDUR.
    if (currentState.isLoading) { 
      console.log('🔄 [VAULT-STORE] Zaten yükleniyor, çıkılıyor');
      return;
    }
    // Eğer yüklenmiyor ama vault zaten doluysa (daha önce yüklendiyse), gereksiz çağrı yapma.
    if (currentState.vault !== null) {
      console.log('🔄 [VAULT-STORE] Vault zaten var, çıkılıyor');
      // Debug için vault durumunu göster
      get().debugVaultState();
      return;
    }

    console.log('🚀 [VAULT-STORE] Vault yükleniyor...');
    set({ isLoading: true, error: null });

    try {
      // Session kontrol et
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {
        throw new Error(`Session error: ${sessionError.message}`);
      }
      console.log('🔍 [VAULT-STORE] Session var:', !!session);
      
      console.log('ADIM 2: getUser çağrılıyor...');
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
          throw new Error('Kullanıcı bulunamadı.');
      }

      // !!!!!!! İŞTE YENİ KANIT SATIRI !!!!!!!!
      console.log('--- KANIT A / UYGULAMANIN KİMLİĞİ ---');
      console.log(user.id);
      console.log('------------------------------------');

      console.log(`ADIM 3: user_vaults tablosu sorgulanıyor (ID: ${user.id})...`);
      // ...sonraki kod
      const { data, error } = await supabase
        .from('user_vaults')
        .select('vault_data')
        .eq('user_id', user.id)
        .single();

      console.log('🔍 [VAULT-STORE] Supabase sonucu:', {
        hasData: !!data,
        hasVaultData: !!data?.vault_data,
        error: error?.message,
        errorCode: error?.code
      });

      if (error && error.code !== 'PGRST116') {
        throw new Error(`Database error: ${error.message}`);
      }
      
      const vaultData = data?.vault_data || {};
      console.log('📦 [VAULT-STORE] Vault verisi yüklendi:', {
        hasOnboarding: !!vaultData.onboarding,
        hasProfile: !!vaultData.profile,
        hasMetadata: !!vaultData.metadata,
        onboardingCompleted: vaultData.metadata?.onboardingCompleted,
        profileNickname: vaultData.profile?.nickname,
        vaultKeys: Object.keys(vaultData)
      });
      
      set({ vault: vaultData, isLoading: false, error: null });
      console.log('✅ [VAULT-STORE] Vault store güncellendi');
      
      // Debug için final durumu göster
      setTimeout(() => get().debugVaultState(), 100);

    } catch (error: any) {
      console.error('⛔️ [VAULT-STORE] Kasa yüklenirken hata:', error.message);
      set({ isLoading: false, vault: null, error: error.message });
      throw error; 
    }
  },

  updateAndSyncVault: async (newVaultData: VaultData) => {
    console.log('🔄 [VAULT-STORE] updateAndSyncVault çağrıldı:', {
      hasProfile: !!newVaultData.profile,
      profileNickname: newVaultData.profile?.nickname,
      dataKeys: Object.keys(newVaultData)
    });
    
    // 1. Önce UI'ın anında tepki vermesi için state'i iyimser bir şekilde güncelle.
    set({ vault: newVaultData, error: null }); 

    // 2. Ardından arka planda veritabanını güncelle.
    try {
      await updateUserVault(newVaultData);
      console.log('✅ [VAULT-STORE] Vault başarıyla senkronize edildi');
    } catch (error: any) {
      console.error('⛔️ [VAULT-STORE] Kasa senkronizasyonu başarısız:', error.message);
      set({ error: error.message });
      throw error;
    }
  },

  clearVault: () => {
    console.log('🧹 [VAULT-STORE] Vault temizleniyor');
    set({ vault: null, isLoading: false, error: null }); // DEĞİŞİKLİK 2: Çıkış yaparken loading false olmalı.
  },

  resetLoading: () => {
    console.log('🔄 [VAULT-STORE] Loading durumu sıfırlanıyor');
    set({ isLoading: false });
  }
}));