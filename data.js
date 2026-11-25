// Conteúdo anatômico (pt-BR). Fontes: Wikipedia (Masseter, Facial muscles, Muscles of mastication,
// Temporomandibular joint, Trigeminal nerve, Nervo mandibular) e descrições anatômicas clássicas.

export const COLORS = {
  bone: '#e9dcc0', teeth: '#f4efe2', cavity: '#2b2320',
  face: '#c45a4c', mast: '#a8443b', nerve: '#e8b829',
  disco: '#5b8ec0', ligamento: '#cbb98c', capsula: '#8fb0c9', lig_esfeno: '#cbb98c', facial: '#e8b829', skin: '#d9a68c',
};

export const CATS = [
  { id: 'face', name: 'Face', accent: '#c25443', note: 'Músculos da expressão facial · nervo facial (VII)', bone: 1,
    view: { dir: [0.38, 0.1, 1], dist: 5.2, target: [0, 0.05, 0.2] } },
  { id: 'mast', name: 'Mastigação', accent: '#a3372f', note: 'Músculos da mastigação · nervo mandibular (V3)', bone: 1,
    view: { dir: [1, 0.12, 0.45], dist: 5.2, target: [0.08, 0.05, -0.1] } },
  { id: 'atm', name: 'ATM', accent: '#3f78ab', note: 'Articulação temporomandibular', bone: 1,
    view: { dir: [1, 0.12, 0.3], dist: 1.9, target: [0.4, -0.12, -0.08] } },
  { id: 'trig', name: 'Trigêmeo', accent: '#a87a06', note: 'Nervo trigêmeo (V) e seus ramos', bone: 0.3,
    view: { dir: [0.85, 0.3, 0.75], dist: 5.2, target: [0.08, 0.05, 0] } },
  { id: 'all', name: 'Tudo', accent: '#5d6670', note: 'Todas as estruturas juntas', bone: 1,
    view: { dir: [0.6, 0.12, 1], dist: 5.2, target: [0.05, 0.05, 0] } },
];

const VII = 'Nervo facial (VII)';
const atmView = { dir: [1, -0.12, 0.25], dist: 3 };
const ptView = { dir: [0.8, -0.35, 0.5], dist: 2.7, target: [0.2, -0.25, 0.05] };

export const ITEMS = [
  // ---------------- Face ----------------
  { id: 'frontal', cat: 'face', name: 'Frontal', alt: "Ventre frontal do occipitofrontal", keys: ['frontal'], motion: { fixed: 'top', text: 'Contração do frontal: puxa a pele da fronte para cima e eleva os supercílios.' },
    view: { dir: [0.25, 0.3, 1], dist: 2.9, target: [0, 0.35, 0.5] }, rows: [
    ["Origem", "Aponeurose epicrânica (gálea aponeurótica), que o liga ao ventre occipital."],
    ["Inserção", "Pele da fronte e dos supercílios; suas fibras são verticais."],
    ["Ação", "Eleva a pele da fronte e os supercílios, criando pregas horizontais (expressão de surpresa ou atenção)."],
    ["Inervação", "Ramos temporais do nervo facial (VII), que cruzam o arco zigomático."],
    ["Na clínica", "Na paralisia facial periférica (paralisia de Bell) a fronte do lado afetado não enruga; numa lesão central, como o AVC, ela costuma ser poupada."] ] },
  { id: 'corrugador', cat: 'face', name: 'Corrugador do supercílio', keys: ['corrugador'], motion: { fixed: 'medial', text: 'Contração do corrugador: aproxima os supercílios e forma as rugas verticais da glabela.' }, rows: [
    ["Origem", "Parte medial do arco superciliar do osso frontal."],
    ["Inserção", "Pele da extremidade lateral do supercílio; fica sob o frontal e o orbicular do olho."],
    ["Ação", "Puxa o supercílio medialmente, formando pregas verticais na glabela; com o prócero, leva os supercílios para dentro e para baixo (expressão de dúvida)."],
    ["Inervação", "Ramos temporais do nervo facial (VII)."],
    ["Na clínica", "Com o prócero, forma o complexo glabelar, alvo frequente da toxina botulínica na harmonização orofacial."] ] },
  { id: 'procero', cat: 'face', name: 'Prócero', keys: ['procero'], motion: { fixed: 'bottom', text: 'Contração do prócero: abaixa a pele entre os supercílios.' }, central: true, rows: [
    ["Origem", "Osso nasal."],
    ["Inserção", "Pele da glabela, entre os supercílios."],
    ["Ação", "Puxa para baixo a parte medial dos supercílios e forma uma prega horizontal na raiz do nariz."],
    ["Inervação", "Ramos temporais do nervo facial (VII)."],
    ["Na clínica", "Tratado junto com o corrugador nas rugas de expressão da glabela."] ] },
  { id: 'orbicular_olho', cat: 'face', name: 'Orbicular do olho', keys: ['orbicular_olho'], motion: { fixed: 'ring', text: 'Contração do orbicular do olho: o anel se fecha em torno da órbita e fecha as pálpebras.' }, rows: [
    ["Origem", "Ligamentos palpebrais medial e lateral, osso lacrimal e crista lacrimal da maxila."],
    ["Inserção", "Parte palpebral: pele da pálpebra. Parte orbital: pele ao redor da órbita."],
    ["Ação", "Fecha as pálpebras: a parte palpebral faz o piscar leve, que espalha a lágrima; a parte orbital fecha com força para proteger o olho."],
    ["Inervação", "Ramos temporais (parte superior) e zigomáticos (parte inferior) do nervo facial (VII)."],
    ["Na clínica", "Na paralisia facial o olho não fecha, perde lubrificação e a córnea pode ulcerar. Anestésico depositado por engano na parótida, no bloqueio do alveolar inferior, pode causar esse quadro de forma transitória."] ] },
  { id: 'nasal', cat: 'face', name: 'Nasal', keys: ['nasal'], motion: { fixed: 'bottom', text: 'Contração do nasal: comprime a narina (parte transversa).' }, rows: [
    ["Origem", "Eminência canina da maxila."],
    ["Inserção", "Parte transversa: dorso do nariz, unindo-se à do outro lado. Parte alar: asa do nariz."],
    ["Ação", "A parte transversa (compressora) comprime a narina; a parte alar (dilatadora) a dilata."],
    ["Inervação", "Ramos bucais do nervo facial (VII)."],
    ["Na clínica", "As narinas dilatando a cada respiração são um sinal de esforço respiratório."] ] },
  { id: 'levantador_labio', cat: 'face', name: 'Levantador do lábio superior', keys: ['levantador_labio'], motion: { fixed: 'top', text: 'Contração do levantador do lábio superior: eleva e everte o lábio superior.' }, rows: [
    ["Origem", "Margem infraorbital, parcialmente coberta pelo orbicular do olho."],
    ["Inserção", "Pele do lábio superior, misturando-se ao orbicular da boca."],
    ["Ação", "Eleva o lábio superior (participa da risada)."],
    ["Inervação", "Ramos bucais do nervo facial (VII)."],
    ["Na clínica", "Cobre quase todo o levantador do ângulo da boca e fica sobre a região do forame infraorbital."],
    ["Na anestesia", "No bloqueio do infraorbital, a agulha entra pelo fórnice na altura do 2º pré-molar e sobe pela fossa canina, por baixo destes músculos, até perto do forame."] ] },
  { id: 'zigomatico_menor', cat: 'face', name: 'Zigomático menor', keys: ['zigomatico_menor'], motion: { fixed: 'mouth', text: 'Contração do zigomático menor: eleva o lábio superior.' }, rows: [
    ["Origem", "Face lateral do osso zigomático."],
    ["Inserção", "Pele do lábio superior."],
    ["Ação", "Eleva o lábio superior em direção superolateral, participando da risada."],
    ["Inervação", "Ramos zigomáticos e bucais do nervo facial (VII)."],
    ["Na clínica", "Pode estar fundido ao zigomático maior, formando um só músculo. Conta na análise estética do sorriso."] ] },
  { id: 'zigomatico_maior', cat: 'face', name: 'Zigomático maior', keys: ['zigomatico_maior'], motion: { fixed: 'mouth', text: 'Contração do zigomático maior: puxa o ângulo da boca para cima e para fora (sorriso).' }, rows: [
    ["Origem", "Face lateral do osso zigomático."],
    ["Inserção", "Pele do ângulo da boca, no modíolo."],
    ["Ação", "Por ser oblíquo, puxa o ângulo da boca para cima e para fora: é o principal músculo do sorriso."],
    ["Inervação", "Ramos zigomáticos e bucais do nervo facial (VII)."],
    ["Na clínica", "Com o levantador do lábio superior, define a altura do sorriso e a exposição gengival (sorriso gengival)."] ] },
  { id: 'levantador_angulo', cat: 'face', name: 'Levantador do ângulo da boca', keys: ['levantador_angulo'], motion: { fixed: 'top', text: 'Contração do levantador do ângulo da boca: eleva o canto da boca.' }, rows: [
    ["Origem", "Fossa canina da maxila, logo abaixo do forame infraorbital."],
    ["Inserção", "Pele do ângulo da boca (modíolo)."],
    ["Ação", "Eleva o ângulo da boca, participando da risada."],
    ["Inervação", "Ramos bucais do nervo facial (VII)."],
    ["Na clínica", "Fica quase todo coberto pelo levantador do lábio superior."],
    ["Na anestesia", "Sua origem na fossa canina marca o caminho da agulha no bloqueio do infraorbital; o forame fica cerca de 1 cm abaixo da margem da órbita, na linha da pupila."] ] },
  { id: 'risorio', cat: 'face', name: 'Risório', keys: ['risorio'], motion: { fixed: 'mouth', text: 'Contração do risório: estica o ângulo da boca para o lado.' }, rows: [
    ["Origem", "Fáscia massetérica, sem inserção óssea."],
    ["Inserção", "Pele do ângulo da boca (modíolo)."],
    ["Ação", "Puxa o ângulo da boca lateralmente; agindo sozinho, dá um sorriso pouco amplo."],
    ["Inervação", "Ramos bucais do nervo facial (VII)."],
    ["Na clínica", "Músculo inconstante: pode ser pouco desenvolvido ou faltar."] ] },
  { id: 'orbicular_boca', cat: 'face', name: 'Orbicular da boca', keys: ['orbicular_boca'], motion: { fixed: 'ring', text: 'Contração do orbicular da boca: fecha e projeta os lábios.' }, central: true,
    view: { dir: [0.35, -0.05, 1], dist: 2.3, target: [0, -0.36, 0.7] }, rows: [
    ["Origem", "Pele dos lábios e fossas incisivas da maxila e mentuais da mandíbula; recebe fibras dos músculos vizinhos."],
    ["Inserção", "Pele e mucosa dos lábios; um feixe superior chega ao septo nasal (depressor do septo)."],
    ["Ação", "Funciona como esfíncter: comprime os lábios e os projeta para a frente (\"bico\"); essencial na fala, na sucção e no selamento labial."],
    ["Inervação", "Ramos bucais (parte superior) e marginal da mandíbula (parte inferior) do nervo facial (VII)."],
    ["Na clínica", "A pressão dos lábios ajuda a equilibrar a posição dos incisivos. Na paralisia facial, a perda de tônus dificulta a fala e deixa escapar saliva e alimento."] ] },
  { id: 'bucinador', cat: 'face', name: 'Bucinador', keys: ['bucinador'], motion: { fixed: 'mouth', text: 'Contração do bucinador: comprime a bochecha contra os dentes.' }, rows: [
    ["Origem", "Base do processo alveolar da maxila e da parte alveolar da mandíbula (na altura dos fórnices) e ligamento pterigomandibular."],
    ["Inserção", "Ângulo da boca, misturando-se ao orbicular da boca."],
    ["Ação", "Empurra o alimento contra os dentes, comprime a bochecha na sucção, acompanha os movimentos da mandíbula evitando a mordedura e ajuda a puxar o ângulo da boca no sorriso."],
    ["Inervação", "Ramos bucais do nervo facial (VII)."],
    ["Na clínica", "É perfurado pelo ducto parotídeo e coberto em parte pelo corpo adiposo da bochecha. Não confundir com o nervo bucal (V3), só sensitivo. Na paralisia facial, o alimento se acumula no vestíbulo e a bochecha é mordida."] ] },
  { id: 'depressor', cat: 'face', name: 'Depressor do ângulo da boca', keys: ['depressor'], motion: { fixed: 'bottom', text: 'Contração do depressor do ângulo da boca: abaixa o canto da boca.' }, rows: [
    ["Origem", "Base da mandíbula, de forma ampla; mistura-se ao platisma."],
    ["Inserção", "Pele do ângulo da boca (modíolo)."],
    ["Ação", "Abaixa o ângulo da boca (expressão de tristeza, acentuada no choro)."],
    ["Inervação", "Ramo marginal da mandíbula do nervo facial (VII)."],
    ["Na clínica", "Uma lesão do ramo marginal, em cirurgias da região submandibular, deixa o sorriso assimétrico."] ] },
  { id: 'depressor_labio', cat: 'face', name: 'Depressor do lábio inferior', keys: ['depressor_labio'], motion: { fixed: 'bottom', text: 'Contração do depressor do lábio inferior: abaixa o lábio inferior.' }, rows: [
    ["Origem", "Base da mandíbula, logo acima do depressor do ângulo da boca, e tubérculo mentual."],
    ["Inserção", "Pele do lábio inferior."],
    ["Ação", "Abaixa o lábio inferior até evertê-lo."],
    ["Inervação", "Ramo marginal da mandíbula do nervo facial (VII)."],
    ["Na clínica", "Fica sobre a região do forame mentual e é parcialmente coberto pelo depressor do ângulo da boca; lesões do ramo marginal deixam o lábio inferior sem abaixar do lado afetado."] ] },
  { id: 'mentual_m', cat: 'face', name: 'Mentual', keys: ['mentual'], motion: { fixed: 'top', text: 'Contração do mentual: eleva a pele do queixo e projeta o lábio inferior.' }, rows: [
    ["Origem", "Fossa mentual da mandíbula, medial ao depressor do lábio inferior."],
    ["Inserção", "Pele do mento."],
    ["Ação", "Eleva a pele do mento e acentua o sulco labiomentual."],
    ["Inervação", "Ramo marginal da mandíbula do nervo facial (VII)."],
    ["Na clínica", "Fica hiperativo quando os lábios não se fecham sem esforço (queixo em \"casca de laranja\"). Precisa ser reposicionado nos acessos cirúrgicos à região anterior da mandíbula."] ] },

  { id: 'facial', cat: 'face', name: 'Nervo facial (VII)', keys: ['facial'], rows: [
    ["Saída do crânio", "Entra no temporal pelo meato acústico interno, percorre o canal facial e sai pelo forame estilomastóideo."],
    ["Trajeto", "Logo após sair dá os ramos estilo-hióideo, digástrico e auricular posterior; na parótida divide-se nos troncos temporofacial e cervicofacial (plexo intraparotídeo)."],
    ["Ramos", "Terminais: temporais, zigomáticos, bucais, marginal da mandíbula e cervical. Dentro do osso: petroso maior, nervo do estapédio e corda do tímpano."],
    ["Inerva", "Motor: músculos da expressão facial, estapédio, estilo-hióideo e ventre posterior do digástrico. Pelo nervo intermédio: paladar dos 2/3 anteriores da língua e do palato e secreção das glândulas submandibular, sublingual e lacrimal."],
    ["Na clínica", "A paralisia facial (de Bell ou por cirurgia, trauma, infecção) impede fechar o olho e desvia a boca para o lado sadio; a mastigação depende do trigêmeo e se mantém. Anestésico depositado na parótida no bloqueio do alveolar inferior pode paralisá-lo por algumas horas."] ] },

  // ---------------- Mastigação ----------------
  { id: 'masseter', cat: 'mast', name: 'Masseter', alt: "Feixes superficial e profundo", keys: ['masseter'], motion: { fixed: 'top', text: 'Contração do masseter: eleva a mandíbula e fecha a boca.', jaw: 'close' }, rows: [
    ["Origem", "Feixe superficial: margem inferior do osso zigomático até a sutura zigomaticotemporal. Feixe profundo: margem inferior do arco zigomático, dessa sutura para trás."],
    ["Inserção", "Os dois feixes se sobrepõem e se inserem juntos nos dois terços inferiores da face lateral do ramo e no ângulo (tuberosidade massetérica)."],
    ["Ação", "Principal e mais potente elevador da mandíbula; o feixe superficial, oblíquo, ajuda numa leve protrusão."],
    ["Inervação", "Nervo massetérico (V3), que cruza a incisura da mandíbula e também envia ramos à cápsula da ATM."],
    ["Na clínica", "Apertamento e bruxismo podem hipertrofiá-lo, alargando o terço inferior do rosto. Palpa-se pedindo para apertar os dentes; o ducto parotídeo passa sobre ele."] ] },
  { id: 'temporal', cat: 'mast', name: 'Temporal', keys: ['temporal'], motion: { fixed: 'top', text: 'Contração do temporal: eleva a mandíbula; as fibras posteriores a retraem.', jaw: 'close' },
    view: { dir: [1, 0.3, 0.15], dist: 3.3, target: [0.25, 0.1, 0] }, rows: [
    ["Origem", "Linha temporal inferior, todo o soalho da fossa temporal e face profunda da fáscia temporal."],
    ["Inserção", "Margens e face medial do processo coronoide e crista temporal da mandíbula; às vezes chega ao trígono retromolar."],
    ["Ação", "Eleva a mandíbula (sobretudo as fibras anteriores, verticais); as fibras posteriores, horizontais, a retraem."],
    ["Inervação", "Nervos temporais profundos anterior e posterior (V3)."],
    ["Na clínica", "Quando o tendão alcança o trígono retromolar, dificulta o descolamento do retalho na extração do terceiro molar e a extensão da prótese total inferior. A DTM muscular é a forma mais comum de DTM."] ] },
  { id: 'pterigoideo_medial', cat: 'mast', name: 'Pterigóideo medial', keys: ['pterigoideo_medial'], motion: { fixed: 'top', text: 'Contração do pterigóideo medial: eleva a mandíbula (junto com o masseter).', jaw: 'close' }, xray: 0.3, view: ptView, rows: [
    ["Origem", "Fossa pterigoide, entre as lâminas medial e lateral do processo pterigoide do esfenoide."],
    ["Inserção", "Face medial do ângulo da mandíbula (tuberosidade pterigóidea)."],
    ["Ação", "Eleva a mandíbula e ajuda numa leve protrusão, como o masseter, do qual é o equivalente medial, porém menos potente."],
    ["Inervação", "Nervo pterigóideo medial (V3), que entra pela borda posterior do músculo."],
    ["Na clínica", "Forma a parede medial do espaço pterigomandibular, onde se deposita o anestésico no bloqueio do alveolar inferior. Uma agulha que o atravessa pode causar trismo."] ] },
  { id: 'pterigoideo_lateral', cat: 'mast', name: 'Pterigóideo lateral', keys: ['pterigoideo_lateral'], motion: { fixed: 'front', text: 'Contração do pterigóideo lateral: puxa côndilo e disco para a frente (protrusão).', jaw: 'protrude' }, xray: 0.3, view: ptView, rows: [
    ["Origem", "Cabeça superior: crista infratemporal da asa maior do esfenoide. Cabeça inferior: face lateral da lâmina lateral do processo pterigoide."],
    ["Inserção", "Cabeça superior: margem anterior do disco articular (e cápsula). Cabeça inferior: fóvea pterigóidea, na face anterior do processo condilar."],
    ["Ação", "Principal protrusor; com o ventre anterior do digástrico, abaixa a mandíbula. Estabiliza o disco e, agindo de um lado só, leva o mento para o lado oposto."],
    ["Inervação", "Nervo pterigóideo lateral, ramo do nervo mandibular (V3)."],
    ["Na clínica", "Após a rotação inicial (cerca de 2 cm de abertura), puxa côndilo e disco para baixo e para a frente, permitindo abrir até uns 6 cm. Sua ligação com o disco é estudada no deslocamento de disco nas DTMs."] ] },

  // ---------------- ATM ----------------
  { id: 'condilo', cat: 'atm', name: 'Côndilo da mandíbula', alt: "Cabeça da mandíbula", keys: ['condilo'], xray: 0.5, view: atmView, rows: [
    ["O que é", "Cabeça da mandíbula: convexa, com 15 a 20 mm no sentido médio-lateral e 8 a 10 mm no anteroposterior, com polos medial e lateral; revestida por fibrocartilagem."],
    ["Movimento", "Só gira nos primeiros cerca de 20 mm de abertura; depois gira e desliza para baixo e para a frente até a borda inferior do tubérculo articular."],
    ["Na clínica", "Tem um centro de crescimento cartilaginoso até a maturidade: traumas no queixo na infância podem afetar o crescimento da mandíbula. Imobilização prolongada pode levar à anquilose da ATM."] ] },
  { id: 'fossa', cat: 'atm', name: 'Fossa mandibular', keys: ['fossa'], xray: 0.5, view: atmView, rows: [
    ["O que é", "Depressão côncava na parte escamosa do temporal, à frente do meato acústico externo; o centro é uma lâmina óssea muito fina que a separa da fossa média do crânio."],
    ["Função", "Aloja a cabeça da mandíbula e o disco com a boca fechada, mas não recebe a carga da mastigação, que recai sobre o tubérculo articular."],
    ["Na clínica", "Palpa-se a ATM à frente da orelha enquanto o paciente abre e fecha a boca; estalos e crepitação são percebidos ali."] ] },
  { id: 'eminencia', cat: 'atm', name: 'Eminência articular', alt: "Tubérculo articular", keys: ['eminencia'], xray: 0.5, view: atmView, rows: [
    ["O que é", "Saliência transversa e resistente da parte escamosa do temporal, à frente da fossa mandibular; sua vertente posteroinferior tem a fibrocartilagem mais espessa."],
    ["Função", "É a superfície de trabalho da ATM: na abertura e na mastigação, o conjunto cabeça-disco desliza sobre ela."],
    ["Na clínica", "Na abertura máxima a cabeça pode ultrapassá-la sem ser patológico; se fica presa à frente e não volta, há luxação, com a boca travada aberta."] ] },
  { id: 'disco', cat: 'atm', name: 'Disco articular', keys: ['disco'], xray: 0.45, view: atmView, rows: [
    ["O que é", "Lâmina de fibrocartilagem, espessa na periferia e fina no centro, que separa totalmente a articulação em compartimentos superior e inferior."],
    ["Função", "Preso aos polos da cabeça da mandíbula, fica parado na rotação (compartimento inferior) e a acompanha na translação (superior). À frente une-se à cabeça superior do pterigóideo lateral; atrás, à zona bilaminar."],
    ["Na clínica", "A zona bilaminar (coxim retrodiscal) é rica em fibras elásticas e nervosas. Alterações na fixação do disco costumam dar ruídos; deslocamento com redução estala ao abrir e fechar, sem redução limita a abertura."] ] },
  { id: 'ligamento', cat: 'atm', name: 'Ligamento temporomandibular', alt: "Ligamento lateral", keys: ['ligamento'], view: atmView, rows: [
    ["O que é", "Único ligamento verdadeiro da ATM: reforça a face lateral da cápsula, indo obliquamente do tubérculo articular até o colo da mandíbula."],
    ["Função", "Sustenta a articulação e limita a retrusão da mandíbula; tem fibras oblíquas e, mais profundas, horizontais."],
    ["Na clínica", "Protege a zona bilaminar (tecidos retrodiscais) de compressão quando a mandíbula é empurrada para trás."] ] },
  { id: 'lig_esfeno', cat: 'atm', name: 'Ligamento esfenomandibular', keys: ['lig_esfeno'], view: atmView, rows: [
    ["O que é", "Faixa fibrosa da espinha do esfenoide até a língula, na altura do forame mandibular."],
    ["Função", "Ligamento acessório da ATM, com pouca influência nos movimentos da mandíbula."],
    ["Na clínica", "Sua importância é anestésica: está ao lado do trajeto dos nervos alveolar inferior e lingual até o forame mandibular."],
    ["Na anestesia", "No bloqueio do alveolar inferior, a agulha costuma tocar osso na língula, onde ele se prende; se esse contato bloquear o avanço, afasta-se a agulha um pouco medialmente."] ] },
  { id: 'capsula', cat: 'atm', name: 'Cápsula articular', keys: ['capsula'], view: atmView, rows: [
    ["O que é", "Envoltório de tecido fibroso frouxo que segue os limites das superfícies articulares; na mandíbula desce mais no colo por trás e chega à fóvea pterigóidea pela frente."],
    ["Função", "Permite movimentos amplos; sua membrana sinovial produz a sinóvia, que lubrifica e nutre a fibrocartilagem, separada nos dois compartimentos."],
    ["Inervação", "Nervo auriculotemporal e ramos dos nervos massetérico e temporais profundos (V3), estes proprioceptivos."],
    ["Na clínica", "A inflamação da cápsula (capsulite) dói à palpação à frente da orelha e piora ao abrir a boca."] ] },

  // ---------------- Trigêmeo ----------------
  { id: 'ganglio', cat: 'trig', name: 'Gânglio trigeminal', alt: "Gânglio de Gasser", keys: ['ganglio', 'raiz'], xray: 0.2,
    view: { dir: [0.7, 0.55, 0.45], dist: 2.5, target: [0.18, 0, -0.05] }, rows: [
    ["Onde fica", "Na fossa média do crânio, sobre a impressão trigeminal perto do ápice da parte petrosa do temporal, protegido por uma bolsa de meninges (cavo trigeminal ou de Meckel)."],
    ["O que é", "Maior gânglio do corpo: reúne os neurônios sensitivos do trigêmeo e dele saem V1, V2 e V3. A raiz motora, menor, não passa por ele e se une só ao V3."],
    ["Na clínica", "A neuralgia do trigêmeo causa crises de dor em choque e pode ser confundida com dor de dente, levando a tratamentos de canal e extrações desnecessários."] ] },
  { id: 'v1', cat: 'trig', name: 'Nervo oftálmico (V1)', keys: ['v1'], xray: 0.3, rows: [
    ["Saída do crânio", "Fissura orbital superior."],
    ["Trajeto", "Na órbita divide-se em nervos frontal, nasociliar e lacrimal; o supraorbital, ramo do frontal, passa pelo forame supraorbital e sobe pela fronte."],
    ["Sensibilidade", "Fronte e couro cabeludo anterior, pálpebra superior, raiz do nariz, parte da mucosa nasal e dos seios frontal, etmoidal e esfenoidal; também a córnea."],
    ["Tipo", "Apenas sensitivo."],
    ["Na clínica", "Não participa da anestesia odontológica. O herpes-zóster oftálmico acomete o seu território."] ] },
  { id: 'v2', cat: 'trig', name: 'Nervo maxilar (V2)', keys: ['v2'], xray: 0.3, rows: [
    ["Saída do crânio", "Forame redondo, para a fossa pterigopalatina."],
    ["Trajeto", "Passa à fossa infratemporal e entra na órbita pela fissura orbital inferior; como nervo infraorbital percorre sulco e canal infraorbitais e sai pelo forame infraorbital."],
    ["Sensibilidade", "Pálpebra inferior, bochecha, nariz, lábio superior, dentes e gengiva superiores, palato, cavidade nasal e seio maxilar. É só sensitivo."],
    ["Ramos dentários", "Alveolares superiores posteriores: molares, menos a raiz mesiovestibular do 1º molar. Médios (muitas vezes ausentes): pré-molares e essa raiz. Anteriores: canino e incisivos."],
    ["Na clínica", "A sinusite maxilar pode imitar dor nos dentes posteriores superiores, que têm a mesma inervação do seio."],
    ["Na anestesia", "O osso maxilar pouco denso permite infiltrativas no fórnice para dentes isolados. Bloqueios: alveolares superiores posteriores, infraorbital, nasopalatino (papila incisiva) e palatino maior."] ] },
  { id: 'v3', cat: 'trig', name: 'Nervo mandibular (V3)', keys: ['v3', 'alveolar_inferior', 'mentual_n', 'lingual', 'bucal'], xray: 0.3, rows: [
    ["Saída do crânio", "Forame oval, para a fossa infratemporal."],
    ["Tipo", "O único ramo misto: recebe toda a raiz motora do trigêmeo."],
    ["Ramos", "Meníngeo (volta pelo forame espinhoso), ramos motores (massetérico, temporais profundos, pterigóideos, tensores), bucal, auriculotemporal, lingual e alveolar inferior. O auriculotemporal (ATM, orelha, parótida, têmpora) não aparece separado neste modelo."],
    ["Motor", "Músculos da mastigação, tensor do tímpano, tensor do véu palatino e, pelo nervo milo-hióideo, milo-hióideo e ventre anterior do digástrico."],
    ["Sensibilidade", "Lábio inferior, dentes e gengiva inferiores, mento, bochecha, soalho da boca, dois terços anteriores da língua, parte da orelha e da têmpora."],
    ["Na clínica", "Uma lesão motora do V3 faz a mandíbula desviar para o lado lesado ao abrir. Bloquear o tronco inteiro (troncular) é técnica extraoral, pouco usada."],
    ["Na anestesia", "Injetando cerca de 1 cm acima do forame mandibular (uns 3 cm acima do plano oclusal), bloqueiam-se de uma vez o alveolar inferior, o lingual e o bucal."] ] },
  { id: 'alveolar_inferior', cat: 'trig', name: 'Nervo alveolar inferior', keys: ['alveolar_inferior'], xray: 0.25,
    view: { dir: [1, -0.05, 0.4], dist: 2.6, target: [0.3, -0.42, 0.25] }, rows: [
    ["Trajeto", "Desce medial ao ramo, entre ele e o ligamento esfenomandibular, entra no forame mandibular (marcado pela língula) e percorre o canal mandibular até os pré-molares."],
    ["Inerva", "Molares e pré-molares e seu periodonto; antes do forame dá o nervo milo-hióideo. Na região do forame mentual divide-se em mentual e incisivo (dentes anteriores)."],
    ["Na clínica", "Passa perto das raízes dos terceiros molares: a extração pode causar parestesia do lábio. Em mandíbulas atróficas, o canal limita implantes e o nervo pode ser transposto."],
    ["Na anestesia", "Bloqueio no nível do forame mandibular: polegar na fossa retromolar, agulha entre ele e a prega pterigomandibular, cerca de 1,5 cm acima do plano oclusal, vinda dos pré-molares do lado oposto (direta) ou do mesmo lado (indireta)."] ] },
  { id: 'mentual_n', cat: 'trig', name: 'Nervo mentual', keys: ['mentual_n'], xray: 0.4,
    view: { dir: [0.6, -0.1, 1], dist: 2.4, target: [0.15, -0.5, 0.6] }, rows: [
    ["Saída", "Forame mentual, abaixo do 1º pré-molar, do 2º ou entre os dois."],
    ["Sensibilidade", "Pele e mucosa do mento, lábio inferior e gengiva vestibular inferior dos pré-molares para a frente."],
    ["Na clínica", "Localizar o forame na radiografia evita lesões em implantes e cirurgias de pré-molares. Com o nervo incisivo, permite anestesiar os dentes anteriores sem anestesiar a língua."],
    ["Na anestesia", "Injeção no fórnice dos pré-molares, com a agulha inclinada de trás para a frente e cerca de 45° de lateral para medial, seguindo a saída do forame; bloqueia também o incisivo."] ] },
  { id: 'lingual', cat: 'trig', name: 'Nervo lingual', keys: ['lingual'], xray: 0.22,
    view: { dir: [0.75, -0.45, 0.5], dist: 2.6, target: [0.25, -0.38, 0.25] }, rows: [
    ["Trajeto", "Desce entre os pterigóideos medial e lateral, onde recebe a corda do tímpano (VII), e segue medial à fossa retromolar, rente à parede lingual da mandíbula, até a língua."],
    ["Sensibilidade", "Dois terços anteriores da língua, soalho da boca, gengiva lingual inferior e glândulas submandibular e sublingual. O paladar e a secreção vêm da corda do tímpano, que só o acompanha."],
    ["Na clínica", "Fica muito perto da cortical lingual do terceiro molar: cuidado em extrações e retalhos linguais."],
    ["Na anestesia", "No nível do forame mandibular fica cerca de 8 mm à frente do alveolar inferior, por isso é bloqueado na mesma injeção."] ] },
  { id: 'bucal', cat: 'trig', name: 'Nervo bucal', keys: ['bucal'], xray: 0.3, rows: [
    ["Trajeto", "Sai do V3 descendo obliquamente junto à face medial do ramo, cruza a fossa retromolar e chega à face lateral da mandíbula e à bochecha; passa sobre o bucinador sem inervá-lo."],
    ["Sensibilidade", "Pele e mucosa da bochecha e gengiva vestibular dos molares inferiores."],
    ["Na clínica", "Complementa o bloqueio do alveolar inferior nas extrações de molares inferiores."],
    ["Na anestesia", "Injeção na fossa retromolar, mais ou menos na metade da sua altura, até tocar o osso. Também é atingido no bloqueio feito cerca de 1 cm acima do forame mandibular."] ] },
];
