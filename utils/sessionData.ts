// storage/sessionData.ts
import AsyncStorage from '@react-native-async-storage/async-storage';

export async function saveToSessionData({
  mood,
  reflection,
  sessionType,
  newMessages,
}: {
  mood?: string;
  reflection?: string;
  sessionType?: "text" | "voice" | "video";
  newMessages?: { sender: string; text: string }[];
}) {
  const today = new Date().toISOString().split('T')[0];
  const key = `session-${today}`;
  let session: any = {};
  const stored = await AsyncStorage.getItem(key);
  if (stored) session = JSON.parse(stored);
  if (mood) session.mood = mood;
  if (reflection) session.reflection = reflection;
  if (!session.sessions) session.sessions = [];
  if (sessionType && newMessages && newMessages.length > 0) {
    session.sessions.push({
      type: sessionType,
      messages: newMessages,
      time: Date.now(),
    });
  }
  session.date = today;
  await AsyncStorage.setItem(key, JSON.stringify(session));
}