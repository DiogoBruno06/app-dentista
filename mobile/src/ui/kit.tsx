// Peças pequenas reutilizadas: botão com resposta ao toque, ícones e texto.
import * as Haptics from 'expo-haptics';
import { ReactNode } from 'react';
import { Platform, Pressable, PressableProps, StyleProp, Text, TextProps, ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming, Easing } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import { EASE_OUT, F, usePalette } from './theme';

const ease = Easing.bezier(...EASE_OUT);
export const tick = () => { if (Platform.OS !== 'web') Haptics.selectionAsync().catch(() => {}); };

// Botão que encolhe levemente ao tocar (feedback em 120 ms, ease-out).
export function Press({ children, style, wrap, onPress, haptic = true, scaleTo = 0.97, ...rest }: PressableProps & { style?: StyleProp<ViewStyle>; wrap?: StyleProp<ViewStyle>; haptic?: boolean; scaleTo?: number; children: ReactNode }) {
  const s = useSharedValue(1);
  const a = useAnimatedStyle(() => ({ transform: [{ scale: s.value }] }));
  return (
    <Pressable
      {...rest}
      style={wrap}
      onPressIn={() => s.set(withTiming(scaleTo, { duration: 120, easing: ease }))}
      onPressOut={() => s.set(withTiming(1, { duration: 160, easing: ease }))}
      onPress={e => { if (haptic) tick(); onPress?.(e); }}
    >
      <Animated.View style={[style, a]}>{children}</Animated.View>
    </Pressable>
  );
}

export function T({ style, serif, weight = 'regular', ...p }: TextProps & { serif?: boolean; weight?: 'regular' | 'medium' | 'bold' }) {
  const c = usePalette();
  const family = serif ? F.serif : weight === 'bold' ? F.sansBold : weight === 'medium' ? F.sansMed : F.sans;
  return <Text {...p} style={[{ color: c.ink, fontFamily: family, fontSize: 15 }, style]} />;
}

const PATHS: Record<string, string> = {
  back: 'M15 5l-7 7 7 7',
  next: 'M9 5l7 7-7 7',
  close: 'M6 6l12 12M18 6L6 18',
  reset: 'M4 12a8 8 0 1 0 2.4-5.7M4 4v4h4',
  play: 'M8 5.5v13l10-6.5z',
  stop: 'M7 7h10v10H7z',
  cut: 'M12 3v18M5 7.5c0-2.5 3-4.5 7-4.5M19 7.5c0-2.5-3-4.5-7-4.5M5 7.5v6c0 3.6 3.1 6.5 7 6.5M19 7.5v6c0 3.6-3.1 6.5-7 6.5',
  skin: 'M12 3c-3.6 0-6 2.9-6 6.6 0 2.3.8 4.2 1.6 5.6.5.9.8 1.9.8 2.9V20h7.2v-1.9c0-1 .3-2 .8-2.9.8-1.4 1.6-3.3 1.6-5.6C18 5.9 15.6 3 12 3z',
  view: 'M9 3.5c4.4 0 7.5 3 7.5 7.2 0 .8.6 1.4 1.3 2.2l1 1.1-1.8.8v2.4c0 1.2-1 2.1-2.2 2.1h-1.6V21H7.5v-4c-1.9-1.4-3-3.6-3-6.3C4.5 6.7 6 3.5 9 3.5z',
  search: 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM20 20l-4-4',
  note: 'M5 4h14v16H5zM9 9h6M9 13h6M9 17h3',
  atlas: 'M12 3c4 0 7 3 7 7.5 0 3-1.4 5-3 6.3V20H8v-3.2C6.4 15.5 5 13.5 5 10.5 5 6 8 3 12 3zM9.5 11.5h.01M14.5 11.5h.01',
};
export function Icon({ name, size = 20, color, fill }: { name: keyof typeof PATHS | string; size?: number; color?: string; fill?: boolean }) {
  const c = usePalette();
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d={PATHS[name]} stroke={color || c.ink} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" fill={fill ? color || c.ink : 'none'} />
    </Svg>
  );
}
