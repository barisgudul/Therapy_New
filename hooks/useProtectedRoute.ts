import { useRouter, useSegments } from 'expo-router/';
import { useEffect } from 'react';
import { useAuth } from '../context/Auth';
import { useVaultStore } from '../store/vaultStore';

export const useProtectedRoute = () => {
  const { user, isLoading: isAuthLoading } = useAuth();
  const { vault, isLoading: isVaultLoading } = useVaultStore();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    const isLoading = isAuthLoading || isVaultLoading;
    if (isLoading) {
      return;
    }
    const inAuthGroup = segments[0] === '(auth)';
    const inOnboardingGroup = segments[0] === '(onboarding)';
    if (!user) {
      if (!inAuthGroup) {
        router.replace('/(auth)/login');
      }
      return;
    }
    if (vault?.metadata?.onboardingCompleted === false) {
      if (!inOnboardingGroup) {
        router.replace('/(onboarding)/step1');
      }
      return;
    }
    if (inAuthGroup || inOnboardingGroup) {
      router.replace('/');
    }
  }, [user, vault, isAuthLoading, isVaultLoading]);
}; 