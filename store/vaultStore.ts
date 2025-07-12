// store/vaultStore.ts
import { create } from 'zustand';
import { VaultData, updateUserVault } from '../utils/eventLogger'; // Doğru yolu belirttiğinden emin ol
import { supabase } from '../utils/supabase'; // Doğru yolu belirttiğinden emin ol

// Store'umuzun yapısını tanımlıyoruz.
interface VaultState {
  vault: VaultData | null;
  isLoading: boolean;
  // Vault'u SADECE BİR KERE veritabanından çekecek fonksiyon.
  fetchVault: () => Promise<void>; 
  // Vault'u hem state'te hem de veritabanında güncelleyecek fonksiyon.
  updateAndSyncVault: (newVaultData: VaultData) => Promise<void>; 
  // State'i temizleyecek fonksiyon (çıkış yaparken kullanılır).
  clearVault: () => void; 
}

// Zustand store'u oluşturuyoruz.
export const useVaultStore = create<VaultState>((set, get) => ({
  vault: null,
  isLoading: true,

  fetchVault: async () => {
    // Zaten yüklüyse veya yükleniyorsa, tekrar çekme.
    if (!get().isLoading) return; 
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Kullanıcı bulunamadı. Vault çekilemiyor.');
      }

      const { data, error } = await supabase
        .from('user_vaults')
        .select('vault_data')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') { // 'PGRST116' = "kayıt bulunamadı" hatası, bu normal.
        throw error;
      }
      
      const vaultData = data?.vault_data || {};
      set({ vault: vaultData, isLoading: false });
      console.log('✅ [VAULT-STORE] Kullanıcı kasası başarıyla yüklendi.');

    } catch (error: any) {
      console.error('⛔️ [VAULT-STORE] Kasa yüklenirken hata:', error.message);
      set({ isLoading: false, vault: {} }); // Hata durumunda boş bir vault set et
    }
  },

  updateAndSyncVault: async (newVaultData: VaultData) => {
    // 1. Önce UI'ın anında tepki vermesi için state'i iyimser bir şekilde güncelle.
    set({ vault: newVaultData }); 

    // 2. Ardından arka planda veritabanını güncelle.
    try {
      await updateUserVault(newVaultData);
      console.log('✅ [VAULT-STORE] Kasa başarıyla senkronize edildi.');
    } catch (error) {
      // Eğer veritabanı güncellemesi başarısız olursa, bir uyarı ver.
      // Burada daha gelişmiş bir hata yönetimi (örn: eski state'e geri dönme) yapılabilir.
      console.error('⛔️ [VAULT-STORE] Kasa senkronizasyonu başarısız:', error);
    }
  },

  clearVault: () => {
    set({ vault: null, isLoading: true });
    console.log('🧹 [VAULT-STORE] Kasa temizlendi.');
  }
}));