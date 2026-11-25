# Atlas da face (app)

App em Expo (React Native + TypeScript) com o crânio 3D (three.js via expo-gl), para iPhone, Android e web.

## Abrir no iPhone (Expo Go, sem Mac)

1. No iPhone, instale o **Expo Go** pela App Store.
2. No computador, dentro desta pasta:
   ```powershell
   npm install
   npx expo start
   ```
3. Com o iPhone **na mesma rede Wi-Fi** do computador, aponte a câmera para o QR code do terminal e toque em "Abrir no Expo Go".
   Em outra rede, use `npx expo start --tunnel`.

O app só abre enquanto o `npx expo start` estiver rodando no computador.

## Estrutura

- `src/app/` telas (Expo Router): `index` (início), `atlas`, `notas`.
- `src/engine/atlas.js` motor 3D (seleção, corte, vistas anatômicas, movimento, demonstração).
- `src/engine/anatomy.js` monta o modelo a partir de `assets/model/*.atlas` (Z-Anatomy, CC BY-SA 4.0).
- `src/data/data.js` conteúdo anatômico; `notes.ts` anotações salvas no aparelho.
- `src/ui/` área 3D com gestos, ficha deslizante, peças de interface.

## Checagens

```powershell
npx tsc --noEmit
npx expo lint
npx expo-doctor
```
