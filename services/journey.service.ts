// services/journey.service.ts
import { supabase } from '../utils/supabase';

export async function addJourneyLogEntry(logText: string): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase.from('journey_logs').insert({ user_id: user.id, log_text: logText });
    if (error) throw error;
    __DEV__ && console.log('✅ [Journey] Yeni giriş eklendi.');
  } catch (error) {
    console.error('⛔️ Journey log hatası:', (error as Error).message);
    throw error;
  }
}

export async function getRecentJourneyLogEntries(limit = 5): Promise<string[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];
    const { data, error } = await supabase.from('journey_logs').select('log_text').eq('user_id', user.id).order('created_at', { ascending: false }).limit(limit);
    if (error) throw error;
    return (data?.map(entry => entry.log_text) || []).reverse();
  } catch (error) {
    console.error('⛔️ Journey getirme hatası:', (error as Error).message);
    throw error;
  }
}
