// Ficha deslizante de baixo para cima, com três alturas (baixa, média, alta) e arrasto pela alça.
import { ReactNode, forwardRef, useEffect, useImperativeHandle } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming, useAnimatedReaction } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePalette } from './theme';

export type Snap = 'low' | 'mid' | 'high';
export type SheetRef = { snap: (s: Snap) => void };
const drawer = Easing.bezier(0.32, 0.72, 0, 1);

type Props = { header: ReactNode; children: ReactNode; low: number; wide?: number; onVisible?: (h: number) => void; onSnap?: (s: Snap) => void };
export const SIDE_W = 400;

export const Sheet = forwardRef<SheetRef, Props>(function Sheet({ header, children, low, wide, onVisible, onSnap }, ref) {
  const c = usePalette();
  const { height } = useWindowDimensions();
  const ins = useSafeAreaInsets();
  const H = height - ins.top - 56; // altura total, abaixo da barra de cima
  const points = { high: 0, mid: Math.max(0, H - Math.round(height * 0.5)), low: Math.max(0, H - low - ins.bottom) };
  const y = useSharedValue(points.low);
  const start = useSharedValue(0);

  const go = (s: Snap) => { y.value = withTiming(points[s], { duration: 420, easing: drawer }); onSnap?.(s); };
  useImperativeHandle(ref, () => ({ snap: go }), [points.low, points.mid, H]);
  useEffect(() => { y.value = withTiming(points.low, { duration: 300, easing: drawer }); }, [low]);

  // Altura visível vai para o motor 3D, que centraliza o modelo no espaço que sobra.
  useAnimatedReaction(() => Math.round(Math.min(H - y.value, height * 0.5)), (v, prev) => { if (v !== prev && onVisible) scheduleOnRN(onVisible, v); });

  const pan = usePanGesture({
    onBegin: () => { start.value = y.value; },
    onUpdate: e => { const v = start.value + e.translationY; y.value = v < 0 ? v * 0.25 : v > points.low ? points.low + (v - points.low) * 0.25 : v; },
    onDeactivate: e => {
      const proj = y.value + e.velocityY * 0.18;
      const list: [Snap, number][] = [['high', points.high], ['mid', points.mid], ['low', points.low]];
      let best = list[0];
      for (const p of list) if (Math.abs(p[1] - proj) < Math.abs(best[1] - proj)) best = p;
      y.value = withTiming(best[1], { duration: 380, easing: drawer });
      if (onSnap) scheduleOnRN(onSnap, best[0]);
    },
  });

  const st = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));
  // Tela larga (tablet, computador): painel fixo à direita, sem arrasto.
  if (wide) return (
    <View style={[styles.side, { width: SIDE_W, top: ins.top + 16, bottom: ins.bottom + 16, backgroundColor: c.card, borderColor: c.line, shadowColor: '#3c2c1c' }]}>
      <View style={{ paddingTop: 14 }}>{header}</View>
      <View style={{ flex: 1 }}>{children}</View>
    </View>
  );
  return (
    <Animated.View style={[styles.sheet, { height: H + 40, backgroundColor: c.card, borderColor: c.line, shadowColor: '#3c2c1c' }, st]}>
      <GestureDetector gesture={pan}>
        <View>
          <View style={styles.grab}><View style={[styles.bar, { backgroundColor: c.line }]} /></View>
          {header}
        </View>
      </GestureDetector>
      <View style={{ flex: 1, paddingBottom: 40 }}>{children}</View>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  sheet: { position: 'absolute', left: 0, right: 0, bottom: -40, borderTopLeftRadius: 22, borderTopRightRadius: 22, borderWidth: StyleSheet.hairlineWidth, shadowOpacity: 0.12, shadowRadius: 18, shadowOffset: { width: 0, height: -4 }, elevation: 12 },
  side: { position: 'absolute', right: 16, borderRadius: 20, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden', shadowOpacity: 0.12, shadowRadius: 18, shadowOffset: { width: 0, height: 4 }, elevation: 12 },
  grab: { alignItems: 'center', paddingTop: 8, paddingBottom: 4 },
  bar: { width: 38, height: 5, borderRadius: 3 },
});
