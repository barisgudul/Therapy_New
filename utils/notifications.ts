// utils/notifications.ts
//
// Local notification helpers. The app only schedules local reminders (no push).
// Permission is requested lazily the first time reminders would be scheduled;
// if the user denies it, every function here degrades to a silent no-op.
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import i18n from "./i18n";

export const REMINDERS_CHANNEL_ID = "reminders";

/**
 * Ensure the OS notification permission is granted.
 * - Returns the current status without prompting if it is already decided.
 * - Prompts once when the status is `undetermined`.
 * - Never throws.
 */
export async function ensureNotificationPermission(): Promise<boolean> {
  try {
    const current = await Notifications.getPermissionsAsync();
    if (current.granted) return true;
    if (!current.canAskAgain) return false;

    const requested = await Notifications.requestPermissionsAsync();
    return requested.granted;
  } catch {
    return false;
  }
}

/** (Re)create the Android channel the daily reminders are posted to. No-op on iOS. */
export async function ensureRemindersChannel(): Promise<void> {
  if (Platform.OS !== "android") return;
  try {
    await Notifications.setNotificationChannelAsync(REMINDERS_CHANNEL_ID, {
      name: i18n.t("notifications.channel_name"),
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  } catch {
    // ignore — channel creation is best-effort
  }
}

/** Cancel any previously scheduled reminders. Safe to call unconditionally. */
export async function cancelDailyReminders(): Promise<void> {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch {
    // ignore
  }
}

/**
 * Replace the scheduled daily reminders (morning + evening). Cancels existing
 * ones first so this is idempotent.
 */
export async function scheduleDailyReminders(): Promise<void> {
  try {
    await cancelDailyReminders();
    await Notifications.scheduleNotificationAsync({
      content: {
        title: i18n.t("notifications.morning.title"),
        body: i18n.t("notifications.morning.body"),
        data: { route: "/daily_reflection" },
      },
      trigger: {
        hour: 8,
        minute: 0,
        repeats: true,
        channelId: REMINDERS_CHANNEL_ID,
      } as Notifications.NotificationTriggerInput,
    });
    await Notifications.scheduleNotificationAsync({
      content: {
        title: i18n.t("notifications.evening.title"),
        body: i18n.t("notifications.evening.body"),
        data: { route: "/daily_reflection" },
      },
      trigger: {
        hour: 20,
        minute: 0,
        repeats: true,
        channelId: REMINDERS_CHANNEL_ID,
      } as Notifications.NotificationTriggerInput,
    });
  } catch {
    // ignore — scheduling is best-effort
  }
}

/**
 * Request permission if needed and (re)schedule reminders, or clear them if the
 * user has declined. Returns whether reminders are now active.
 */
export async function syncDailyReminders(): Promise<boolean> {
  const granted = await ensureNotificationPermission();
  if (!granted) {
    await cancelDailyReminders();
    return false;
  }
  await ensureRemindersChannel();
  await scheduleDailyReminders();
  return true;
}
