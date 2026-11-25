// Roteiros: demonstrações por aba, vistas anatômicas e planos de corte.
import * as THREE from 'three';

export const DEMOS = {
  face: [
    { ids: ['zigomatico_maior', 'zigomatico_menor', 'risorio', 'levantador_angulo'], text: 'Sorriso: zigomáticos maior e menor, risório e levantador do ângulo da boca puxam os cantos da boca para cima e para fora.' },
    { ids: ['frontal'], text: 'Surpresa: o frontal eleva os supercílios e enruga a fronte.' },
    { ids: ['corrugador', 'procero'], text: 'Franzir: o corrugador aproxima os supercílios e o prócero abaixa a pele da glabela.' },
    { ids: ['orbicular_olho'], text: 'Fechar os olhos com força: orbicular do olho.' },
    { ids: ['orbicular_boca', 'bucinador', 'mentual_m'], text: 'Bico e sopro: o orbicular da boca projeta os lábios, o bucinador comprime as bochechas e o mentual eleva o queixo.' },
    { ids: ['depressor', 'depressor_labio'], text: 'Tristeza: os depressores do ângulo da boca e do lábio inferior puxam para baixo.' },
    { ids: ['levantador_labio', 'nasal'], text: 'Desdém: o levantador do lábio superior eleva o lábio e o nasal comprime a narina.' },
  ],
  mast: [
    { ids: ['pterigoideo_lateral'], jaw: 'open', text: 'Abertura: o pterigóideo lateral puxa côndilo e disco para a frente enquanto a boca abre.' },
    { ids: ['masseter', 'temporal', 'pterigoideo_medial'], jaw: 'close', text: 'Fechamento: masseter, temporal e pterigóideo medial elevam a mandíbula.' },
    { ids: ['pterigoideo_lateral', 'pterigoideo_medial'], jaw: 'side', text: 'Lateralidade: os pterigóideos de um lado levam a mandíbula para o lado oposto, na moagem.' },
    { ids: ['masseter', 'temporal', 'pterigoideo_medial'], jaw: 'close', text: 'Novo fechamento: o ciclo mastigatório se repete.' },
  ],
  atm: [
    { ids: ['condilo', 'disco'], jaw: 'atmOpen', bone: 0.55, text: 'Abertura: primeiro o côndilo gira; depois côndilo e disco deslizam juntos sobre a eminência.' },
    { ids: ['condilo', 'disco', 'fossa'], jaw: 'atmClose', bone: 0.55, text: 'Fechamento: côndilo e disco voltam à fossa mandibular.' },
  ],
  trig: [
    { ids: ['ganglio'], bone: 0.25, text: 'Gânglio trigeminal: dele partem os nervos oftálmico (V1), maxilar (V2) e mandibular (V3).' },
    { ids: ['v1'], bone: 0.25, text: 'V1, oftálmico: fronte, pálpebra superior, córnea e dorso do nariz.' },
    { ids: ['v2'], bone: 0.25, text: 'V2, maxilar: dentes e gengiva superiores, palato, bochecha e lábio superior.' },
    { ids: ['v3'], bone: 0.25, text: 'V3, mandibular: dentes inferiores, língua, lábio inferior e os músculos da mastigação.' },
    { ids: ['alveolar_inferior', 'mentual_n'], bone: 0.25, text: 'Alveolar inferior e mentual: o alvo do bloqueio mandibular.' },
    { ids: ['lingual', 'bucal'], bone: 0.25, text: 'Lingual (língua e gengiva lingual) e bucal (bochecha e gengiva vestibular dos molares).' },
  ],
};
DEMOS.all = [...DEMOS.face, ...DEMOS.mast];

// Normas do crânio, com o plano de Frankfurt (órbita–pório) na horizontal.
export const VIEWS = {
  lateral: { label: 'Lateral', dir: s => [s, 0, 0], title: 'Norma lateral', text: 'Plano de Frankfurt na horizontal. Masseter, temporal, mímica e ligamento lateral da ATM.' },
  oblique: { label: '¾', dir: s => [s * 0.8, 0.12, 0.6], title: 'Anterolateral ¾', text: 'Mímica, masseter e temporal juntos, como nos atlas.' },
  frontal: { label: 'Frontal', dir: () => [0, 0, 1], title: 'Norma frontal', text: 'Mímica, simetria e forames supraorbital, infraorbital e mentual.' },
  medial: { label: 'Medial', dir: s => [-s, 0.05, 0.12], title: 'Vista medial', text: 'Corte sagital visto por dentro: pterigóideos, ligamentos esfenomandibular e estilomandibular, forame mandibular.' },
};

export const CUT_AXES = {
  x: { label: 'Sagital', v: new THREE.Vector3(1, 0, 0), min: -0.6, max: 0.6, def: 0 },
  z: { label: 'Coronal', v: new THREE.Vector3(0, 0, 1), min: -1.2, max: 0.8, def: -0.12 },
  y: { label: 'Horizontal', v: new THREE.Vector3(0, 1, 0), min: -0.9, max: 1.3, def: -0.05 },
};
