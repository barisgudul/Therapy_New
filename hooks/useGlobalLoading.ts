// hooks/useGlobalLoading.ts

import { useEffect } from 'react';
import { useLoading } from '../context/Loading';
import { setGlobalLoadingActions } from '../services/api.service';

export const useGlobalLoading = () => {
  const { showLoading, hideLoading } = useLoading();

  useEffect(() => {
    // API servisine iç organları değil, KONTROL DÜĞMELERİNİ ver.
    setGlobalLoadingActions({ show: showLoading, hide: hideLoading });
  }, [showLoading, hideLoading]);

  // Bu kancanın bir şey döndürmesine gerek yok. İşi, bağlantıyı kurmak.
}; 