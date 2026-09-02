// utils/__tests__/notifications.test.ts
import * as Notifications from 'expo-notifications';
import {
  ensureNotificationPermission,
  syncDailyReminders,
} from '../notifications';

jest.mock('expo-notifications');

const mockNotifications = jest.mocked(Notifications);

describe('notifications util', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockNotifications.getPermissionsAsync = jest.fn();
    mockNotifications.requestPermissionsAsync = jest.fn();
    mockNotifications.cancelAllScheduledNotificationsAsync = jest
      .fn()
      .mockResolvedValue(undefined);
    mockNotifications.scheduleNotificationAsync = jest
      .fn()
      .mockResolvedValue('id');
    mockNotifications.setNotificationChannelAsync = jest
      .fn()
      .mockResolvedValue(undefined);
    (mockNotifications as any).AndroidImportance = { DEFAULT: 3 };
  });

  describe('ensureNotificationPermission', () => {
    it('returns true without prompting when already granted', async () => {
      mockNotifications.getPermissionsAsync.mockResolvedValue({
        granted: true,
        canAskAgain: true,
      } as any);

      await expect(ensureNotificationPermission()).resolves.toBe(true);
      expect(mockNotifications.requestPermissionsAsync).not.toHaveBeenCalled();
    });

    it('prompts once when undetermined and returns the result', async () => {
      mockNotifications.getPermissionsAsync.mockResolvedValue({
        granted: false,
        canAskAgain: true,
      } as any);
      mockNotifications.requestPermissionsAsync.mockResolvedValue({
        granted: true,
      } as any);

      await expect(ensureNotificationPermission()).resolves.toBe(true);
      expect(mockNotifications.requestPermissionsAsync).toHaveBeenCalledTimes(1);
    });

    it('does not prompt again when the user has permanently denied', async () => {
      mockNotifications.getPermissionsAsync.mockResolvedValue({
        granted: false,
        canAskAgain: false,
      } as any);

      await expect(ensureNotificationPermission()).resolves.toBe(false);
      expect(mockNotifications.requestPermissionsAsync).not.toHaveBeenCalled();
    });

    it('never throws', async () => {
      mockNotifications.getPermissionsAsync.mockRejectedValue(new Error('boom'));
      await expect(ensureNotificationPermission()).resolves.toBe(false);
    });
  });

  describe('syncDailyReminders', () => {
    it('schedules two reminders when permission is granted', async () => {
      mockNotifications.getPermissionsAsync.mockResolvedValue({
        granted: true,
        canAskAgain: true,
      } as any);

      await expect(syncDailyReminders()).resolves.toBe(true);
      expect(mockNotifications.scheduleNotificationAsync).toHaveBeenCalledTimes(2);
    });

    it('clears reminders and schedules nothing when permission is denied', async () => {
      mockNotifications.getPermissionsAsync.mockResolvedValue({
        granted: false,
        canAskAgain: false,
      } as any);

      await expect(syncDailyReminders()).resolves.toBe(false);
      expect(mockNotifications.cancelAllScheduledNotificationsAsync).toHaveBeenCalled();
      expect(mockNotifications.scheduleNotificationAsync).not.toHaveBeenCalled();
    });
  });
});
