// Tipos do motor 3D (atlas.js) para a interface em TypeScript.
import type { ExpoWebGLRenderingContext } from 'expo-gl';

export type AtlasUI = {
  cat: string;
  sel: string | null;
  skin: boolean;
  skinReady: boolean;
  cut: { on: boolean; axis: string; depth: number };
  view: string | null;
  side: number;
  caption: string | null;
  motion: boolean;
  demo: boolean;
  jaw: boolean;
  demoStep?: string | null;
};
export type Callout = { x: number; y: number; visible: boolean };

export const CAT: Record<string, { id: string; name: string; accent: string; note: string; bone: number; view: { dir: number[]; dist: number; target: number[] } }>;
export function currentItems(cat: string): any[];

export class AtlasEngine {
  ui: AtlasUI;
  constructor(gl: ExpoWebGLRenderingContext, opts?: { reduceMotion?: boolean; background?: string });
  onChange(cb: (ui: AtlasUI) => void): () => void;
  onFrame(cb: (c: Callout) => void): () => void;
  load(buf: ArrayBuffer): void;
  loadSkin(buf: ArrayBuffer): void;
  resize(w: number, h: number): void;
  setInsetBottom(px: number): void;
  setInsetRight(px: number): void;
  orbit(dx: number, dy: number): void;
  release(vx?: number, vy?: number): void;
  zoom(scale: number): void;
  tap(x: number, y: number): boolean | undefined;
  resetView(): void;
  setCat(id: string, move?: boolean): void;
  select(id: string): void;
  deselect(): void;
  step(d: number): void;
  setSkin(on: boolean): void;
  setCut(on: boolean): void;
  setCutAxis(axis: string): void;
  setCutDepth(t: number): void;
  setView(name: string | null, side?: number): void;
  currentSide(): number;
  playMotion(): void;
  stopMotion(): void;
  startDemo(): void;
  stopDemo(): void;
  frame(t: number): void;
  dispose(): void;
}
