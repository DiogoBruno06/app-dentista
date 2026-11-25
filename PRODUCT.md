# Atlas da face

## O que é
App para celular (página web) com um crânio em 3D que mostra os músculos da face, os músculos da mastigação, a ATM e o nervo trigêmeo. Cada estrutura tem um botão com o nome; ao tocar, a câmera vai até ela, a estrutura se destaca e uma linha de chamada liga o nome à parte do crânio. Uma ficha mostra origem, inserção, ação, inervação e uma nota clínica.

## Para quem
Uma dentista (namorada de quem encomendou). Uso de estudo e consulta rápida, no celular, em qualquer luz.

## Plataforma
Web mobile primeiro, publicada como link privado no Claude. Deve funcionar também em tela larga.

## Tom
Clínico, delicado, preciso. Prancha de atlas anatômico: osso em marfim, músculo em vermelho, nervo em amarelo, disco articular em azul.

## Decisões já tomadas pelo usuário
- Crânio modelado em código (Three.js), esquemático, sem baixar modelos externos.
- Entrega por link privado.
- Animações mínimas (filosofia Emil Kowalski).

## Suposições (inferidas do pedido, sem entrevista)
- Idioma pt-BR, termos da Terminologia Anatômica em português.
- Sem login, sem dados salvos.
- O conteúdo é educativo e deve indicar a fonte (Wikipedia e descrições anatômicas clássicas) e recomendar conferir num atlas.
