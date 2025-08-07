// hooks/useVault.ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getUserVault, updateUserVault, VaultData } from '../services/vault.service';

const VAULT_QUERY_KEY = ['vault']; // Anahtarı bir sabite al, her yerde bunu kullan.

/**
 * Vault verisini çekmek, cache'lemek ve sağlamak için TEK SORUMLU hook.
 */
export const useVault = () => {
  return useQuery({
    queryKey: VAULT_QUERY_KEY,
    queryFn: getUserVault,
    staleTime: 1000 * 60 * 5, // 5 dakika boyunca veriyi taze kabul et.
    refetchOnWindowFocus: false,
    retry: 2,
  });
};

/**
 * Vault verisini güncellemek için TEK SORUMLU hook.
 */
export const useUpdateVault = () => {
  const queryClient = useQueryClient();

  return useMutation({
    // Hangi fonksiyonu çalıştıracak?
    mutationFn: (newVaultData: VaultData) => updateUserVault(newVaultData),
    
    // Başarılı olursa ne yapacak?
    onSuccess: () => {
      console.log('✅ Vault güncellendi, cache temizleniyor...');
      // ['vault'] anahtarıyla cache'lenmiş tüm sorguları geçersiz kıl.
      // Bu, useVault kullanan tüm bileşenlerin otomatik olarak güncel veriyi çekmesini sağlar.
      queryClient.invalidateQueries({ queryKey: VAULT_QUERY_KEY });
    },
    
    // Hata olursa...
    onError: (error) => {
        console.error("⛔️ Vault güncelleme mutasyonu başarısız:", error);
        // Burada kullanıcıya bir Toast mesajı gösterebilirsin.
    }
  });
};