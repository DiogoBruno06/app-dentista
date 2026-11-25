// Todas as anotações, agrupadas por aba, com busca. Tocar abre a estrutura no atlas.
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CATS, ITEMS } from '@/data/data';
import { noteCount, useNotes } from '@/data/notes';
import { Icon, Press, T } from '@/ui/kit';
import { F, usePalette } from '@/ui/theme';

export default function Notes() {
  const c = usePalette();
  const ins = useSafeAreaInsets();
  const notes = useNotes();
  const [q, setQ] = useState('');
  const rows = useMemo(() => {
    const s = q.trim().toLowerCase();
    return ITEMS.filter(it => notes[it.id]?.trim()).filter(it => !s || it.name.toLowerCase().includes(s) || notes[it.id].toLowerCase().includes(s));
  }, [notes, q]);
  const empty = !noteCount(notes);
  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView contentContainerStyle={{ paddingTop: ins.top + 6, paddingBottom: ins.bottom + 28, paddingHorizontal: 18 }} keyboardShouldPersistTaps="handled">
        <View style={styles.top}>
          <Press onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} style={styles.icon} accessibilityLabel="Voltar"><Icon name="back" /></Press>
          <T serif style={{ fontSize: 32, letterSpacing: -0.4 }}>Anotações</T>
        </View>
        {!empty && (
          <View style={[styles.search, { backgroundColor: c.card, borderColor: c.line }]}>
            <Icon name="search" size={18} color={c.mute} />
            <TextInput value={q} onChangeText={setQ} placeholder="Buscar nas anotações" placeholderTextColor={c.mute} style={{ flex: 1, color: c.ink, fontFamily: F.sans, fontSize: 16 }} clearButtonMode="while-editing" />
          </View>
        )}
        {empty ? (
          <View style={{ paddingTop: 24, gap: 10, maxWidth: 420 }}>
            <T serif style={{ fontSize: 24 }}>Nenhuma anotação ainda</T>
            <T style={{ color: c.mute, fontSize: 16, lineHeight: 23 }}>Abra o atlas, toque numa estrutura e escreva em “Minhas anotações”, no fim da ficha. Tudo o que você escrever aparece aqui.</T>
            <Press onPress={() => router.replace('/atlas')} style={[styles.cta, { backgroundColor: c.ink }]}>
              <T serif style={{ fontSize: 20, color: c.bg, flex: 1 }}>Abrir o atlas</T><Icon name="next" color={c.bg} />
            </Press>
          </View>
        ) : !rows.length ? (
          <T style={{ color: c.mute, marginTop: 20 }}>Nada encontrado para “{q}”.</T>
        ) : CATS.filter(g => g.id !== 'all').map(g => {
          const list = rows.filter(r => r.cat === g.id);
          if (!list.length) return null;
          return (
            <View key={g.id} style={{ marginTop: 18 }}>
              <T serif style={{ fontSize: 19, marginBottom: 8 }}>{g.name}</T>
              <View style={{ gap: 8 }}>
                {list.map(it => (
                  <Press key={it.id} scaleTo={0.985} onPress={() => router.push({ pathname: '/atlas', params: { open: it.id } })} style={[styles.item, { backgroundColor: c.card, borderColor: c.line }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <View style={[styles.dot, { backgroundColor: g.accent }]} />
                      <T weight="bold" style={{ fontSize: 15 }}>{it.name}</T>
                    </View>
                    <T numberOfLines={4} style={{ fontSize: 15, lineHeight: 22 }}>{notes[it.id].trim()}</T>
                    <T weight="medium" style={{ fontSize: 13, color: c.mute }}>Abrir no atlas</T>
                  </Press>
                ))}
              </View>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', gap: 2, marginBottom: 12, marginLeft: -10 },
  icon: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 22 },
  search: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 46, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: 12, marginBottom: 4 },
  item: { borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, padding: 14, gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  cta: { flexDirection: 'row', alignItems: 'center', minHeight: 60, borderRadius: 16, paddingHorizontal: 18, marginTop: 8 },
});
