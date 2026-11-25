// Pranchas do Gray's Anatomy (1918, domínio público) usadas como referência em cada ficha.
export const PLATES: Record<string, { title: string; src: number }> = {
  Gray378: { title: 'Músculos da cabeça, da face e do pescoço', src: require('../../assets/gray/Gray378.png') },
  Gray381: { title: 'Músculos ao redor da boca', src: require('../../assets/gray/Gray381.png') },
  Gray382: { title: 'Músculo temporal', src: require('../../assets/gray/Gray382.png') },
  Gray309: { title: 'Articulação temporomandibular, vista lateral', src: require('../../assets/gray/Gray309.png') },
  Gray311: { title: 'Corte sagital da articulação temporomandibular', src: require('../../assets/gray/Gray311.png') },
  Gray777: { title: 'Nervos da órbita (nervo oftálmico), vista lateral', src: require('../../assets/gray/Gray777.png') },
  Gray778: { title: 'Distribuição dos nervos maxilar e mandibular', src: require('../../assets/gray/Gray778.png') },
  Gray788: { title: 'Esquema do nervo facial e suas comunicações', src: require('../../assets/gray/Gray788.png') },
};
const FOR: Record<string, string> = { orbicular_boca: 'Gray381', bucinador: 'Gray381', levantador_angulo: 'Gray381', depressor: 'Gray381', facial: 'Gray788', temporal: 'Gray382', disco: 'Gray311', pterigoideo_lateral: 'Gray311', v1: 'Gray777' };
const CAT: Record<string, string> = { face: 'Gray378', mast: 'Gray378', atm: 'Gray309', trig: 'Gray778' };
export function plateFor(id: string, cat: string) {
  const key = FOR[id] || CAT[cat];
  return { key, ...PLATES[key] };
}
