// context/Loading.tsx
import React, {
  createContext,
  ReactNode,
  useContext,
  useState,
} from 'react';

interface LoadingContextType {
  showLoading: (message?: string) => void;
  hideLoading: () => void;
  isLoading: boolean;
  loadingMessage?: string;
}

const LoadingContext = createContext<LoadingContextType | undefined>(undefined);

interface LoadingProviderProps {
  children: ReactNode;
}

export const LoadingProvider: React.FC<LoadingProviderProps> = ({
  children,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState<string>();

  const showLoading = (message?: string) => {
    setIsLoading(true);
    setLoadingMessage(message);
  };

  const hideLoading = () => {
    setIsLoading(false);
    setLoadingMessage(undefined);
  };

  return (
    <LoadingContext.Provider
      value={{ showLoading, hideLoading, isLoading, loadingMessage }}
    >
      {children}
    </LoadingContext.Provider>
  );
};

export const useLoading = () => {
  const context = useContext(LoadingContext);
  if (!context) {
    throw new Error(
      'useLoading must be used within a LoadingProvider. Kodu düzgün yaz!'
    );
  }
  return context;
};