// components/__tests__/PendingDeletionScreen.test.tsx
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import PendingDeletionScreen from '../PendingDeletionScreen';
import * as AuthContext from '../../context/Auth';
import * as AuthUtils from '../../utils/auth';

// useAuth context'ini ve signOut fonksiyonunu mock'luyoruz.
jest.mock('../../context/Auth');
jest.mock('../../utils/auth');

// Alert mock'u artık jest.spyOn ile yapılacak

describe('PendingDeletionScreen', () => {
  const mockCancelDeletion = jest.fn();
  const mockSignOut = jest.fn();
  let alertSpy: jest.SpyInstance;

  beforeEach(() => {
    // Her testten önce mock'ları temizle
    jest.clearAllMocks();
    
    // Alert spy'ını kur
    alertSpy = jest.spyOn(Alert, 'alert');

    // useAuth hook'unun bizim sahte fonksiyonumuzu döndürmesini sağla
    (AuthContext.useAuth as jest.Mock).mockReturnValue({
      cancelDeletion: mockCancelDeletion,
    });
    
    // signOut fonksiyonunu mock'la
    (AuthUtils.signOut as jest.Mock).mockImplementation(mockSignOut);
  });

  afterEach(() => {
    alertSpy.mockRestore();
  });

  it('başlangıçta doğru metinleri ve butonları göstermelidir', () => {
    render(<PendingDeletionScreen />);

    expect(screen.getByText('Hesabınız Silinmek Üzere')).toBeTruthy();
    expect(screen.getByText('Silme İşlemini İptal Et')).toBeTruthy();
    expect(screen.getByText('Çıkış Yap')).toBeTruthy();
  });

  it('"Silme İşlemini İptal Et" butonuna basıldığında cancelDeletion fonksiyonunu çağırmalıdır', async () => {
    mockCancelDeletion.mockResolvedValueOnce(undefined); // Başarılı senaryo
    render(<PendingDeletionScreen />);

    const cancelButton = screen.getByText('Silme İşlemini İptal Et');
    fireEvent.press(cancelButton);

    // Butona basıldığında yükleme göstergesinin çıkmasını bekle
    expect(screen.getByTestId('activity-indicator')).toBeTruthy();
    
    // Fonksiyonun çağrılmasını ve yükleme göstergesinin kaybolmasını bekle
    await waitFor(() => {
      expect(mockCancelDeletion).toHaveBeenCalledTimes(1);
      expect(screen.queryByTestId('activity-indicator')).toBeNull();
    });
  });

  it('cancelDeletion başarısız olduğunda bir hata uyarısı göstermelidir', async () => {
    mockCancelDeletion.mockRejectedValueOnce(new Error('API Error')); // Hata senaryosu
    render(<PendingDeletionScreen />);

    const cancelButton = screen.getByText('Silme İşlemini İptal Et');
    fireEvent.press(cancelButton);
    
    // Hata uyarısının gösterilmesini bekle
    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith('Hata', expect.any(String));
    });
  });

  it('"Çıkış Yap" butonuna basıldığında signOut fonksiyonunu çağırmalıdır', async () => {
    mockSignOut.mockResolvedValueOnce(undefined); // Başarılı senaryo
    render(<PendingDeletionScreen />);

    const signOutButton = screen.getByText('Çıkış Yap');
    fireEvent.press(signOutButton);

    await waitFor(() => {
      expect(mockSignOut).toHaveBeenCalledTimes(1);
    });
  });
});
