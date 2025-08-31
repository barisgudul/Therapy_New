// hooks/useVault.ts
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getUserVault,
  updateUserVault,
  VaultData,
} from "../services/vault.service";

const VAULT_QUERY_KEY = ["vault"]; // Anahtarı bir sabite al, her yerde bunu kullan.

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
    mutationFn: (newVaultData: VaultData) => updateUserVault(newVaultData),

    // YENİ SİHİR BURADA BAŞLIYOR
    onMutate: async (newVaultData: VaultData) => {
      // Devam eden 'vault' sorgularını iptal et ki bizim verimizi ezmesinler.
      await queryClient.cancelQueries({ queryKey: VAULT_QUERY_KEY });

      // O anki cache'deki verinin bir yedeğini al.
      const previousVault = queryClient.getQueryData<VaultData>(
        VAULT_QUERY_KEY,
      );

      // Cache'i, DAKİKASINDA, HİÇ BEKLEMEDEN, yeni veriyle GÜNCELLE.
      queryClient.setQueryData(VAULT_QUERY_KEY, newVaultData);

      console.log("⚡️ Vault anında güncellendi (Optimistic Update).");

      // Yedeği geri döndür ki, hata olursa geri yükleyebilelim.
      return { previousVault };
    },

    // Hata olursa, yedeği geri yükle.
    onError: (err, newVaultData, context) => {
      if (context?.previousVault) {
        queryClient.setQueryData(VAULT_QUERY_KEY, context.previousVault);
        console.error(
          "⛔️ Vault güncelleme başarısız, eski veri geri yüklendi:",
          err,
        );
      }
    },

    // İşlem ne olursa olsun (başarı veya hata), en sonunda git sunucudan en güncel veriyi çek.
    // Bu, bizim iyimser güncellememiz ile sunucudaki gerçeklik arasında fark varsa onu düzeltir.
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: VAULT_QUERY_KEY });
      console.log("🔄 Vault verisi sunucu ile senkronize ediliyor...");
    },
  });
};
