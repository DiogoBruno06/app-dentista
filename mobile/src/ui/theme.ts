// Paleta bege do atlas (clara e escura) e tipografia.
import { useColorScheme } from 'react-native';

export const LIGHT = {
  bg: '#f2ece2', ink: '#2b241e', mute: '#73675a', line: '#ddd2c1', card: '#fbf8f2', well: '#e9e0d2', glass: 'rgba(251,248,242,0.86)', scrim: 'rgba(43,36,30,0.28)',
};
export const DARK: typeof LIGHT = {
  bg: '#1c1915', ink: '#f0e8dc', mute: '#b2a594', line: '#3a332b', card: '#25211c', well: '#2d2822', glass: 'rgba(37,33,28,0.86)', scrim: 'rgba(0,0,0,0.45)',
};
export type Palette = typeof LIGHT;
export function usePalette(): Palette & { dark: boolean } {
  const dark = useColorScheme() === 'dark';
  return { ...(dark ? DARK : LIGHT), dark };
}

export const F = {
  serif: 'Newsreader_500Medium',
  serifItalic: 'Newsreader_400Regular_Italic',
  sans: 'InstrumentSans_400Regular',
  sansMed: 'InstrumentSans_500Medium',
  sansBold: 'InstrumentSans_600SemiBold',
};
// Curvas: ease-out forte para entradas, ease-in-out para movimentos na tela.
export const EASE_OUT = [0.23, 1, 0.32, 1] as const;
export const EASE_IN_OUT = [0.77, 0, 0.175, 1] as const;
