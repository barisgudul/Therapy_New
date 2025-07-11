// utils/eventLogger.ts - KOLEKTİF BİLİNÇ v3.0 - ÜRETİM SÜRÜMÜ

import { supabase } from './supabase'

// --------------------------------------------------
// Tip Tanımları
// --------------------------------------------------

export const EVENT_TYPES = [
  'daily_reflection',
  'session_start',
  'session_end',
  'mood_comparison_note',
  'text_session',
  'voice_session',
  'video_session',
  'diary_entry',
  'dream_analysis',
] as const

export type EventType = (typeof EVENT_TYPES)[number]

export interface AppEvent {
  id: string
  user_id: string
  type: EventType
  timestamp: number
  created_at: string
  mood?: string
  data: Record<string, any> // JSON güvenliği ileride geliştirilebilir
}

// --------------------------------------------------
// AŞAMA 1: HAM OLAYLAR ('events')
// --------------------------------------------------

export async function logEvent(
  event: Omit<AppEvent, 'id' | 'user_id' | 'timestamp' | 'created_at'>
): Promise<string | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Olay kaydedilemiyor, kullanıcı giriş yapmamış.')

    const eventData = {
      ...event,
      user_id: user.id,
      timestamp: Date.now(),
    }

    const { data, error } = await supabase
      .from('events')
      .insert([eventData])
      .select('id')
      .single()

    if (error) throw error
    __DEV__ && console.log(`✅ [Event] ${event.type} kaydedildi.`)

    return data.id.toString()
  } catch (error) {
    console.error('⛔️ Event log hatası:', (error as Error).message)
    return null
  }
}

export async function getEventsForLast(days: number): Promise<AppEvent[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return []

    const fromDate = new Date()
    fromDate.setDate(fromDate.getDate() - days)

    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('user_id', user.id)
      .gte('created_at', fromDate.toISOString())
      .order('created_at', { ascending: false })

    if (error) throw error
    return (data as AppEvent[]) || []
  } catch (error) {
    console.error('⛔️ Event çekme hatası:', (error as Error).message)
    return []
  }
}

// --------------------------------------------------
// AŞAMA 2: KOLEKTİF BİLİNÇ YÖNETİMİ (Vault & Journey)
// --------------------------------------------------

export interface VaultData {
  traits?: Record<string, any>
  memories?: any[]
  [key: string]: any
}

export async function getUserVault(): Promise<VaultData | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    const { data, error } = await supabase
      .from('user_vaults')
      .select('vault_data')
      .eq('user_id', user.id)
      .single()

    if (error && error.code !== 'PGRST116') throw error

    return data?.vault_data || null
  } catch (error) {
    console.error('⛔️ Vault getirme hatası:', (error as Error).message)
    return null
  }
}

export async function updateUserVault(newVaultData: VaultData): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { error } = await supabase
      .from('user_vaults')
      .upsert({
        user_id: user.id,
        vault_data: newVaultData,
        updated_at: new Date().toISOString(),
      })

    if (error) throw error
    __DEV__ && console.log('✅ [Vault] Güncellendi.')
  } catch (error) {
    console.error('⛔️ Vault update hatası:', (error as Error).message)
  }
}

// --------------------------------------------------
// AŞAMA 3: SEYİR DEFTERİ (Journey Logs)
// --------------------------------------------------

export async function addJourneyLogEntry(logText: string): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { error } = await supabase
      .from('journey_logs')
      .insert({ user_id: user.id, log_text: logText })

    if (error) throw error
    __DEV__ && console.log('✅ [Journey] Yeni giriş eklendi.')
  } catch (error) {
    console.error('⛔️ Journey log hatası:', (error as Error).message)
  }
}

export async function getRecentJourneyLogEntries(limit = 5): Promise<string[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return []

    const { data, error } = await supabase
      .from('journey_logs')
      .select('log_text')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) throw error

    return (data?.map(entry => entry.log_text) || []).reverse()
  } catch (error) {
    console.error('⛔️ Journey getirme hatası:', (error as Error).message)
    return []
  }
}
