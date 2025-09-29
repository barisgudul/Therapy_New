// hooks/useGlobalLoading.ts

import { useLoading } from "../context/Loading";

export const useGlobalLoading = () => {
  // Bu hook sadece LoadingProvider context'ine erişim sağlar
  // Global loading state yönetimi LoadingProvider tarafından yapılır
  const loadingContext = useLoading();

  // Hook kullanılabilir durumda - context erişimi için
  return loadingContext;
};
