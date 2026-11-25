// Área 3D: GLView + gestos (girar, aproximar, tocar) + linha de chamada sobre a estrutura selecionada.
import { Asset } from 'expo-asset';
import { File } from 'expo-file-system';
import { ExpoWebGLRenderingContext, GLView } from 'expo-gl';
import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Platform, StyleSheet, View, useWindowDimensions } from 'react-native';
import { GestureDetector, usePanGesture, usePinchGesture, useSimultaneousGestures, useTapGesture, useExclusiveGestures } from 'react-native-gesture-handler';
import Animated, { useAnimatedProps, useAnimatedStyle, useSharedValue, withDelay, withTiming, Easing } from 'react-native-reanimated';
import Svg, { Circle, Line } from 'react-native-svg';
import { AtlasEngine } from '@/engine/atlas';
import { T } from './kit';
import { EASE_OUT, usePalette } from './theme';

const ALine = Animated.createAnimatedComponent(Line);
const ACircle = Animated.createAnimatedComponent(Circle);
const ease = Easing.bezier(...EASE_OUT);

async function readAsset(mod: number): Promise<ArrayBuffer> {
  const a = Asset.fromModule(mod);
  await a.downloadAsync();
  const uri = a.localUri || a.uri;
  if (Platform.OS === 'web') return fetch(uri).then(r => r.arrayBuffer());
  const bytes = await new File(uri).bytes();
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

type Props = { onEngine: (e: AtlasEngine) => void; label: string | null; accent: string; onError: (m: string) => void };

export function Viewer({ onEngine, label, accent, onError }: Props) {
  const c = usePalette();
  const eng = useRef<AtlasEngine | null>(null);
  // A área 3D ocupa a tela toda: o tamanho da janela vale até o primeiro onLayout chegar.
  const win = useWindowDimensions();
  const size = useRef({ w: win.width, h: win.height });
  const [loading, setLoading] = useState(true);

  // Linha de chamada: posição atualizada a cada quadro pelo motor.
  const px = useSharedValue(0), py = useSharedValue(0), vis = useSharedValue(0), side = useSharedValue(1);
  const tagW = useSharedValue(120), sw = useSharedValue(win.width);
  const draw = useSharedValue(0);
  useEffect(() => {
    draw.set(0);
    if (label) draw.set(withDelay(380, withTiming(1, { duration: 320, easing: ease })));
  }, [label, draw]);

  useEffect(() => () => { eng.current?.dispose(); eng.current = null; }, []);
  // Na web, a roda do mouse (ou o gesto de pinça do trackpad) aproxima e afasta.
  const box = useRef<any>(null);
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const el = box.current as unknown as HTMLElement | null;
    if (!el?.addEventListener) return;
    const onWheel = (ev: WheelEvent) => { ev.preventDefault(); eng.current?.zoom(Math.exp(-ev.deltaY * 0.0015)); };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);
  useEffect(() => { size.current = { w: win.width, h: win.height }; sw.set(win.width); eng.current?.resize(win.width, win.height); }, [win.width, win.height, sw]);

  async function onContextCreate(gl: ExpoWebGLRenderingContext) {
    try {
      const reduce = await AccessibilityInfo.isReduceMotionEnabled().catch(() => false);
      const e = new AtlasEngine(gl, { reduceMotion: reduce, background: c.bg });
      e.resize(size.current.w, size.current.h);
      e.load(await readAsset(require('../../assets/model/head.atlas')));
      eng.current = e;
      if (__DEV__) (globalThis as any).__atlas = e;
      e.onFrame(p => {
        vis.value = p.visible ? 1 : 0;
        px.value = p.x; py.value = p.y;
        if (p.x < size.current.w * 0.4) side.value = -1; else if (p.x > size.current.w * 0.6) side.value = 1;
      });
      onEngine(e);
      setLoading(false);
      const loop = (t: number) => { if (!eng.current) return; e.frame(t); requestAnimationFrame(loop); };
      requestAnimationFrame(loop);
      readAsset(require('../../assets/model/skin.atlas')).then(b => e.loadSkin(b)).catch(() => {});
    } catch (err) {
      console.warn(err);
      onError('Não foi possível montar o modelo 3D neste aparelho.');
    }
  }

  const pan = usePanGesture({
    runOnJS: true, minDistance: 4,
    onUpdate: ev => eng.current?.orbit(ev.changeX, ev.changeY),
    onDeactivate: ev => eng.current?.release((ev as any).velocityX ?? 0, (ev as any).velocityY ?? 0),
  });
  const pinch = usePinchGesture({ runOnJS: true, onUpdate: ev => eng.current?.zoom(ev.scaleChange) });
  const tap = useTapGesture({ runOnJS: true, maxDistance: 8, onActivate: ev => { eng.current?.tap(ev.x, ev.y); } });
  const gesture = useExclusiveGestures(useSimultaneousGestures(pan, pinch), tap);

  // Etiqueta acima (ou abaixo, perto do topo) do ponto, para o lado de fora da tela.
  const geo = () => {
    'worklet';
    const ly = py.value - 64 < 28 ? py.value + 64 : py.value - 64;
    const lx = px.value + side.value * 54;
    const left = Math.min(Math.max(side.value > 0 ? lx : lx - tagW.value, 10), sw.value - tagW.value - 10);
    return { ly, left, endX: side.value > 0 ? left : left + tagW.value };
  };
  const tagStyle = useAnimatedStyle(() => {
    const g = geo();
    return { opacity: withTiming(vis.value, { duration: 160 }), transform: [{ translateX: g.left }, { translateY: g.ly - 16 }] };
  });
  const lineProps = useAnimatedProps(() => {
    const g = geo();
    const x2 = px.value, y2 = py.value;
    return { x1: x2 + (g.endX - x2) * draw.value, y1: y2 + (g.ly - y2) * draw.value, x2, y2, strokeOpacity: vis.value };
  });
  const dotProps = useAnimatedProps(() => ({ cx: px.value, cy: py.value, r: 4, fillOpacity: vis.value }));
  const haloProps = useAnimatedProps(() => ({ cx: px.value, cy: py.value, r: 4 + 7 * draw.value, strokeOpacity: vis.value * 0.55 * draw.value }));

  return (
    <View ref={box} style={StyleSheet.absoluteFill} onLayout={ev => { const { width, height } = ev.nativeEvent.layout; size.current = { w: width, h: height }; sw.set(width); eng.current?.resize(width, height); }}>
      <GestureDetector gesture={gesture}>
        <View style={StyleSheet.absoluteFill}>
          <GLView style={StyleSheet.absoluteFill} onContextCreate={onContextCreate} msaaSamples={4} />
        </View>
      </GestureDetector>
      {label && (
        <>
          <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
            <ALine animatedProps={lineProps} stroke={c.ink} strokeWidth={1.4} />
            <ACircle animatedProps={haloProps} stroke={accent} strokeWidth={2} fill="none" />
            <ACircle animatedProps={dotProps} fill={accent} stroke={c.card} strokeWidth={2} />
          </Svg>
          <Animated.View pointerEvents="none" style={[styles.tag, { backgroundColor: c.ink }, tagStyle]} onLayout={ev => tagW.set(ev.nativeEvent.layout.width)}>
            <T weight="bold" style={{ color: c.bg, fontSize: 13.5 }}>{label}</T>
          </Animated.View>
        </>
      )}
      {loading && (
        <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.center]}>
          <T serif style={{ fontSize: 19, color: c.mute }}>Montando o crânio…</T>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  tag: { position: 'absolute', left: 0, top: 0, paddingHorizontal: 11, height: 32, borderRadius: 16, justifyContent: 'center' },
  center: { alignItems: 'center', justifyContent: 'center' },
});
