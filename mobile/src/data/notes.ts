// Anotações por estrutura, salvas no aparelho (AsyncStorage).
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';

const KEY = 'atlas-notes';
let notes: Record<string, string> = {};
let loaded = false;
const subs = new Set<() => void>();
let timer: ReturnType<typeof setTimeout> | null = null;

const emit = () => { notes = { ...notes }; subs.forEach(f => f()); };
export async function loadNotes() {
  if (loaded) return;
  loaded = true;
  try { notes = JSON.parse((await AsyncStorage.getItem(KEY)) || '{}') || {}; } catch { notes = {}; }
  emit();
}
export function setNote(id: string, text: string, onStatus?: (s: string) => void) {
  notes[id] = text;
  emit();
  if (timer) clearTimeout(timer);
  timer = setTimeout(async () => {
    timer = null;
    try { await AsyncStorage.setItem(KEY, JSON.stringify(notes)); onStatus?.('Salvo'); }
    catch { onStatus?.('Não foi possível salvar'); }
  }, 600);
}
export function useNotes() {
  return useSyncExternalStore(cb => { subs.add(cb); return () => { subs.delete(cb); }; }, () => notes, () => notes);
}
export const noteCount = (n: Record<string, string>) => Object.values(n).filter(t => t?.trim()).length;
