// Atlas: modelo 3D em tela cheia, barra de ferramentas, painéis de vista e corte, e a ficha deslizante.
import { BlurView } from 'expo-blur';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Modal, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import Animated, { Easing, FadeInDown, FadeOut, FadeOutDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CATS, ITEMS } from '@/data/data';
import { setNote, useNotes } from '@/data/notes';
import { plateFor } from '@/data/plates';
import { AtlasEngine, AtlasUI, CAT, currentItems } from "@/engine/atlas";
import { CUT_AXES, VIEWS } from '@/engine/scripts';
import { Icon, Press, T, tick } from '@/ui/kit';
import { Sheet, SheetRef } from '@/ui/Sheet';
import { Viewer } from '@/ui/Viewer';
import { EASE_OUT, F, usePalette } from '@/ui/theme';

type UI = AtlasUI;
const ITEM = Object.fromEntries(ITEMS.map(i => [i.id, i]));
const ease = Easing.bezier(...EASE_OUT);
const pop = Platform.OS === 'web' ? undefined : FadeInDown.duration(220).easing(ease).withInitialValues({ opacity: 0, transform: [{ translateY: 8 }] });

export default function Atlas() {
  const c = usePalette();
  const ins = useSafeAreaInsets();
  const { open } = useLocalSearchParams<{ open?: string }>();
  const [eng, setEng] = useState<AtlasEngine | null>(null);
  const [ui, setUi] = useState<UI | null>(null);
  const [panel, setPanel] = useState<'view' | 'cut' | null>(null);
  const [bottom, setBottom] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const sheet = useRef<SheetRef>(null);

  useEffect(() => { if (!eng) return; const off = eng.onChange(u => setUi({ ...u })); return () => { off(); }; }, [eng]);
  useEffect(() => { if (eng && open) eng.select(open); }, [eng, open]);
  // Ao selecionar, a ficha sobe até a metade; ao fechar, volta para a lista.
  const sel = ui?.sel ? ITEM[ui.sel] : null;
  useEffect(() => { sheet.current?.snap(sel ? 'mid' : 'low'); }, [sel?.id]);

  const cat = CAT[ui?.cat ?? 'face'];
  const accent = sel ? CAT[sel.cat].accent : cat.accent;

  const togglePanel = (p: 'view' | 'cut') => {
    if (!eng) return;
    const next = panel === p ? null : p;
    setPanel(next);
    if (p === 'cut') eng.setCut(next === 'cut' ? true : false);
    if (p === 'view' && next === 'view') eng.setView(ui?.view || 'lateral', eng.currentSide());
    if (p === 'view' && next !== 'view' && ui?.view === 'medial') eng.setView(null);
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.bg, overflow: 'hidden' }}>
      <Viewer onEngine={setEng} label={sel?.name ?? null} accent={accent} onError={setError} />

      {/* Barra de cima */}
      <View style={[styles.top, { paddingTop: ins.top + 4 }]} pointerEvents="box-none">
        <Glass style={styles.round}><Press onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} style={styles.roundIn} accessibilityLabel="Voltar ao início"><Icon name="back" /></Press></Glass>
        <View style={{ flex: 1, paddingHorizontal: 10 }} pointerEvents="none">
          <T serif style={{ fontSize: 22, lineHeight: 26 }} numberOfLines={1}>{cat.name === 'Tudo' ? 'Todas as estruturas' : cat.name}</T>
          <T style={{ fontSize: 12.5, color: c.mute }} numberOfLines={1}>{cat.note}</T>
        </View>
        <Glass style={styles.round}><Press onPress={() => { setPanel(null); eng?.setCut(false); eng?.setView(null); eng?.resetView(); }} style={styles.roundIn} accessibilityLabel="Voltar à vista inicial"><Icon name="reset" /></Press></Glass>
      </View>

      {/* Ferramentas */}
      <View style={[styles.tools, { top: ins.top + 60 }]} pointerEvents="box-none">
        <Tool icon="view" label="Vista" on={panel === 'view'} onPress={() => togglePanel('view')} />
        <Tool icon="cut" label="Corte" on={!!ui?.cut.on} onPress={() => togglePanel('cut')} />
        {ui?.skinReady && <Tool icon="skin" label="Pele" on={!!ui?.skin} onPress={() => eng?.setSkin(!ui.skin)} />}
      </View>

      {/* Legenda do movimento ou da demonstração */}
      {ui?.caption && (
        <Animated.View entering={pop} exiting={Platform.OS === 'web' ? undefined : FadeOut.duration(150)} style={[styles.caption, { top: ins.top + 112 }]} pointerEvents="none">
          <Glass style={styles.capIn}>
            {ui.demoStep ? <T weight="bold" style={{ fontSize: 12, color: accent, marginBottom: 2 }}>{ui.demoStep}</T> : null}
            <T style={{ fontSize: 14, lineHeight: 20 }}>{ui.caption}</T>
          </Glass>
        </Animated.View>
      )}

      {/* Painel de vistas ou de corte, logo acima da ficha */}
      {panel && ui && (
        <Animated.View key={panel} entering={pop} exiting={Platform.OS === 'web' ? undefined : FadeOutDown.duration(150)} style={[styles.panel, { bottom: bottom + 12 }]}>
          <Glass style={styles.panelIn}>
            {panel === 'view' ? (
              <>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <Seg items={Object.entries(VIEWS).map(([k, v]) => [k, v.label])} value={ui.view} onChange={k => eng?.setView(k, ui.side)} style={{ flex: 1 }} />
                  <Seg items={[['-1', 'Dir.'], ['1', 'Esq.']]} value={String(ui.side)} onChange={k => eng?.setView(ui.view || 'lateral', +k)} />
                </View>
                {ui.view && <T style={{ fontSize: 13, lineHeight: 18, color: c.mute, marginTop: 8 }}><T weight="bold" style={{ fontSize: 13 }}>{VIEWS[ui.view as keyof typeof VIEWS].title}. </T>{VIEWS[ui.view as keyof typeof VIEWS].text}</T>}
              </>
            ) : (
              <>
                <Seg items={Object.entries(CUT_AXES).map(([k, v]) => [k, v.label])} value={ui.cut.axis} onChange={k => eng?.setCutAxis(k)} />
                <Depth value={ui.cut.depth} onChange={v => eng?.setCutDepth(v)} />
              </>
            )}
          </Glass>
        </Animated.View>
      )}

      {error && <View style={[StyleSheet.absoluteFill, styles.center]}><T style={{ color: c.mute, textAlign: 'center', paddingHorizontal: 32 }}>{error}</T></View>}

      <Sheet
        ref={sheet}
        low={250}
        onVisible={h => { setBottom(h); eng?.setInsetBottom(h); }}
        header={sel ? <DetailHeader it={sel} onClose={() => eng?.deselect()} /> : <Tabs value={ui?.cat ?? 'face'} onChange={id => { setPanel(null); eng?.setCut(false); eng?.setCat(id); }} />}
      >
        {sel && eng && ui ? <Detail key={sel.id} it={sel} eng={eng} ui={ui} /> : <Browse eng={eng} ui={ui} />}
      </Sheet>
    </View>
  );
}

// ---------- Peças ----------
function Glass({ children, style }: { children: React.ReactNode; style?: any }) {
  const c = usePalette();
  if (Platform.OS === 'ios') return <BlurView intensity={40} tint={c.dark ? 'dark' : 'light'} style={[style, { overflow: 'hidden', borderColor: c.line, borderWidth: StyleSheet.hairlineWidth }]}>{children}</BlurView>;
  return <View style={[style, { backgroundColor: c.glass, borderColor: c.line, borderWidth: StyleSheet.hairlineWidth }]}>{children}</View>;
}

function Tool({ icon, label, on, onPress }: { icon: string; label: string; on: boolean; onPress: () => void }) {
  const c = usePalette();
  return (
    <Press onPress={onPress} accessibilityRole="button" accessibilityState={{ selected: on }} style={[styles.tool, on ? { backgroundColor: c.ink, borderColor: c.ink } : { backgroundColor: c.glass, borderColor: c.line }]}>
      <Icon name={icon} size={17} color={on ? c.card : c.ink} />
      <T weight="bold" style={{ fontSize: 13.5, color: on ? c.card : c.ink }}>{label}</T>
    </Press>
  );
}

function Seg({ items, value, onChange, style }: { items: [string, string][]; value: string | null; onChange: (k: string) => void; style?: any }) {
  const c = usePalette();
  return (
    <View style={[styles.seg, { backgroundColor: c.well }, style]}>
      {items.map(([k, label]) => {
        const on = k === value;
        return (
          <Pressable key={k} onPress={() => { tick(); onChange(k); }} style={[styles.segBtn, on && { backgroundColor: c.card, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 3, shadowOffset: { width: 0, height: 1 } }]} accessibilityRole="button" accessibilityState={{ selected: on }}>
            <T weight={on ? 'bold' : 'medium'} style={{ fontSize: 13, color: on ? c.ink : c.mute }}>{label}</T>
          </Pressable>
        );
      })}
    </View>
  );
}

// Profundidade do corte: arrastar na barra (sem depender de um componente nativo de slider).
function Depth({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const c = usePalette();
  const w = useRef(1);
  const set = (x: number) => onChange(Math.min(1, Math.max(0, x / w.current)));
  return (
    <View style={{ marginTop: 10 }}>
      <T style={{ fontSize: 12.5, color: c.mute, marginBottom: 6 }}>Profundidade</T>
      <View
        onLayout={e => { w.current = e.nativeEvent.layout.width; }}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderGrant={e => set(e.nativeEvent.locationX)}
        onResponderMove={e => set(e.nativeEvent.locationX)}
        style={{ height: 32, justifyContent: 'center' }}
        accessibilityRole="adjustable"
        accessibilityLabel="Profundidade do corte"
        accessibilityValue={{ min: 0, max: 100, now: Math.round(value * 100) }}
      >
        <View style={{ height: 4, borderRadius: 2, backgroundColor: c.well }}>
          <View style={{ height: 4, borderRadius: 2, width: `${value * 100}%`, backgroundColor: c.ink }} />
        </View>
        <View pointerEvents="none" style={[styles.knob, { left: `${value * 100}%`, backgroundColor: c.card, borderColor: c.line }]} />
      </View>
    </View>
  );
}

function Tabs({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  const c = usePalette();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 14, gap: 6, paddingBottom: 10, paddingTop: 2 }}>
      {CATS.map(t => {
        const on = t.id === value;
        return (
          <Pressable key={t.id} onPress={() => { if (!on) { tick(); onChange(t.id); } }} style={[styles.tab, on ? { backgroundColor: c.ink } : { backgroundColor: c.well }]} accessibilityRole="tab" accessibilityState={{ selected: on }}>
            <T weight={on ? 'bold' : 'medium'} style={{ fontSize: 14.5, color: on ? c.card : c.mute }}>{t.name}</T>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

function Browse({ eng, ui }: { eng: AtlasEngine | null; ui: UI | null }) {
  const c = usePalette();
  const notes = useNotes();
  const catId = ui?.cat ?? 'face';
  const groups = catId === 'all' ? CATS.filter(g => g.id !== 'all') : [CAT[catId]];
  return (
    <ScrollView contentContainerStyle={{ paddingHorizontal: 14, paddingBottom: 30 }}>
      <Press onPress={() => (ui?.demo ? eng?.stopDemo() : eng?.startDemo())} style={[styles.demo, { borderColor: CAT[catId].accent }]}>
        <Icon name={ui?.demo ? 'stop' : 'play'} size={16} color={CAT[catId].accent} fill />
        <T weight="bold" style={{ color: CAT[catId].accent, fontSize: 14 }}>{ui?.demo ? 'Parar a demonstração' : 'Demonstração'}</T>
      </Press>
      {groups.map(g => (
        <View key={g.id}>
          {catId === 'all' && <T serif style={{ fontSize: 18, marginTop: 14, marginBottom: 6, marginLeft: 2 }}>{g.name}</T>}
          <View style={styles.grid}>
            {ITEMS.filter(i => i.cat === g.id).map(it => (
              <Press key={it.id} scaleTo={0.96} wrap={{ width: '48.6%' }} onPress={() => eng?.select(it.id)} style={[styles.chip, { backgroundColor: c.bg, borderColor: c.line }]}>
                <View style={[styles.dot, { backgroundColor: g.accent }]} />
                <T weight="medium" style={{ fontSize: 14, flex: 1 }} numberOfLines={2}>{it.name}</T>
                {notes[it.id]?.trim() ? <View style={[styles.noteDot, { backgroundColor: c.mute }]} accessibilityLabel="tem anotação" /> : null}
              </Press>
            ))}
          </View>
        </View>
      ))}
      <T style={{ fontSize: 12, lineHeight: 17, color: c.mute, marginTop: 18 }}>
        Para estudo. Modelo 3D: Z-Anatomy, baseado no BodyParts3D (© The Database Center for Life Science), licença CC BY-SA 4.0; simplificado e recortado para este app. O bucinador foi modelado à parte. Textos revisados com base em Rossi, Anatomia craniofacial aplicada à odontologia (2ª ed., Santos, 2017); confira na fonte antes de usar na clínica.
      </T>
    </ScrollView>
  );
}

function DetailHeader({ it, onClose }: { it: (typeof ITEMS)[number]; onClose: () => void }) {
  const c = usePalette();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: 18, paddingBottom: 10, gap: 8 }}>
      <View style={{ flex: 1 }}>
        <T serif style={{ fontSize: 26, lineHeight: 30, letterSpacing: -0.3 }}>{it.name}</T>
        <T style={{ fontSize: 13.5, color: c.mute, marginTop: 2 }}>{(it as any).alt || CAT[it.cat].name}</T>
      </View>
      <Press onPress={onClose} style={[styles.close, { backgroundColor: c.well }]} accessibilityLabel="Fechar a ficha"><Icon name="close" size={16} /></Press>
    </View>
  );
}

function Detail({ it, eng, ui }: { it: (typeof ITEMS)[number]; eng: AtlasEngine; ui: UI }) {
  const c = usePalette();
  const notes = useNotes();
  const [status, setStatus] = useState('');
  const [zoom, setZoom] = useState(false);
  const plate = plateFor(it.id, it.cat);
  const items = currentItems(ui.cat);
  const idx = items.findIndex(i => i.id === it.id);
  const accent = CAT[it.cat].accent;
  return (
    <>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 24 }} keyboardShouldPersistTaps="handled" keyboardDismissMode="interactive" automaticallyAdjustKeyboardInsets>
        {(it as any).motion && (
          <Press onPress={() => (ui.motion ? eng.stopMotion() : eng.playMotion())} style={[styles.demo, { borderColor: accent, marginTop: 2 }]}>
            <Icon name={ui.motion ? 'stop' : 'play'} size={16} color={accent} fill />
            <T weight="bold" style={{ color: accent, fontSize: 14 }}>{ui.motion ? 'Parar o movimento' : 'Ver o movimento'}</T>
          </Press>
        )}
        <View style={{ marginTop: 6 }}>
          {(it.rows as [string, string][]).map(([k, v]) => (
            <View key={k} style={[styles.row, { borderTopColor: c.line }]}>
              <T weight="bold" style={{ fontSize: 12, color: c.mute, letterSpacing: 0.3, textTransform: 'uppercase' }}>{k}</T>
              <T style={{ fontSize: 15.5, lineHeight: 23, marginTop: 3 }}>{v}</T>
            </View>
          ))}
        </View>
        <Pressable onPress={() => setZoom(true)} style={[styles.plate, { borderColor: c.line, backgroundColor: '#fbf8f2' }]} accessibilityLabel={`Ampliar prancha: ${plate.title}`}>
          <Image source={plate.src} style={{ width: '100%', aspectRatio: 1.35 }} contentFit="contain" />
        </Pressable>
        <T style={{ fontSize: 12, color: c.mute, marginTop: 6, lineHeight: 17 }}>{plate.title}. Gray’s Anatomy (1918), prancha {plate.key.slice(4)}, domínio público.</T>
        <View style={{ marginTop: 18 }}>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
            <T serif style={{ fontSize: 19 }}>Minhas anotações</T>
            <T style={{ fontSize: 12, color: c.mute }}>{status}</T>
          </View>
          <TextInput
            multiline value={notes[it.id] || ''} placeholder="Escreva observações, dicas clínicas, dúvidas…" placeholderTextColor={c.mute}
            onChangeText={t => { setStatus('Salvando…'); setNote(it.id, t, setStatus); }}
            style={[styles.note, { color: c.ink, backgroundColor: c.bg, borderColor: c.line, fontFamily: F.sans }]}
            textAlignVertical="top"
          />
        </View>
      </ScrollView>
      <View style={[styles.foot, { borderTopColor: c.line }]}>
        <Press onPress={() => eng.step(-1)} style={styles.footBtn} accessibilityLabel="Estrutura anterior"><Icon name="back" /></Press>
        <T style={{ color: c.mute, fontSize: 13 }}>{idx + 1} de {items.length}</T>
        <Press onPress={() => eng.step(1)} style={styles.footBtn} accessibilityLabel="Próxima estrutura"><Icon name="next" /></Press>
      </View>
      <Modal visible={zoom} transparent animationType="fade" onRequestClose={() => setZoom(false)}>
        <Pressable style={[styles.center, { flex: 1, backgroundColor: 'rgba(20,16,12,0.92)', padding: 12 }]} onPress={() => setZoom(false)} accessibilityLabel="Fechar a prancha">
          <Image source={plate.src} style={{ width: '100%', height: '80%', backgroundColor: '#fbf8f2', borderRadius: 8 }} contentFit="contain" />
          <T style={{ color: '#f0e8dc', marginTop: 12, textAlign: 'center' }}>{plate.title}</T>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  top: { position: 'absolute', left: 0, right: 0, top: 0, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12 },
  round: { width: 44, height: 44, borderRadius: 22 },
  roundIn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  tools: { position: 'absolute', right: 12, flexDirection: 'row', gap: 8 },
  tool: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 38, paddingHorizontal: 12, borderRadius: 19, borderWidth: StyleSheet.hairlineWidth },
  caption: { position: 'absolute', left: 12, right: 12 },
  capIn: { borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10 },
  panel: { position: 'absolute', left: 12, right: 12 },
  panelIn: { borderRadius: 16, padding: 10 },
  seg: { flexDirection: 'row', padding: 3, borderRadius: 10, gap: 2 },
  segBtn: { flexGrow: 1, minHeight: 36, paddingHorizontal: 9, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  knob: { position: 'absolute', width: 24, height: 24, marginLeft: -12, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 4, shadowOffset: { width: 0, height: 1 } },
  tab: { height: 38, paddingHorizontal: 15, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  demo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 46, borderRadius: 12, borderWidth: 1, marginBottom: 10 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 8 },
  chip: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 9, minHeight: 50, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth },
  dot: { width: 8, height: 8, borderRadius: 4 },
  noteDot: { width: 6, height: 6, borderRadius: 3 },
  close: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  row: { borderTopWidth: StyleSheet.hairlineWidth, paddingVertical: 11 },
  plate: { marginTop: 14, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden', padding: 6 },
  note: { minHeight: 110, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, padding: 12, fontSize: 16, lineHeight: 22, marginTop: 8 },
  foot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: StyleSheet.hairlineWidth, paddingHorizontal: 8, paddingTop: 4 },
  footBtn: { width: 48, height: 44, alignItems: 'center', justifyContent: 'center' },
  center: { alignItems: 'center', justifyContent: 'center' },
});
