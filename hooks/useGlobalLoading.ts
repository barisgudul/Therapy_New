// hooks/useGlobalLoading.ts

import { useEffect } from 'react';
import { useLoading } from '../context/Loading';
import { setGlobalLoadingIndicator, setGlobalLoadingMessage } from '../services/api.service';

export const useGlobalLoading = () => {
  const { setIsLoading, setLoadingMessage } = useLoading();

  useEffect(() => {
    // API service'e global loading setter'ları kaydet
    setGlobalLoadingIndicator(setIsLoading);
    setGlobalLoadingMessage(setLoadingMessage);
  }, [setIsLoading, setLoadingMessage]);

  return { setIsLoading, setLoadingMessage };
}; 