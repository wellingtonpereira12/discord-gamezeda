# FakeDC Mobile (React Native + Expo)

Este é o aplicativo móvel nativo do **FakeDC**, construído com **React Native** e **Expo**.

## Recursos
- Interface idêntica e responsiva com WebView integrada de alto desempenho.
- Permissões nativas de microfone e câmera para WebRTC.
- Suporte a áudio em segundo plano no Android e iOS.
- Totalmente compatível com Expo Go e geração de APK para Android.

## Como Executar Localmente
```bash
cd mobile
npm install
npx expo start
```
Abra o aplicativo **Expo Go** no seu celular Android ou iOS e escaneie o QR Code no terminal.

## Como Gerar a APK do Android (EAS Build)
Para compilar uma APK instalável diretamente para Android sem precisar publicar na Play Store:
```bash
# 1. Instalar o CLI do EAS (se ainda não tiver)
npm install -g eas-cli

# 2. Fazer login na sua conta Expo
eas login

# 3. Gerar a APK diretamente
eas build -p android --profile preview
```
O Expo EAS irá compilar nos servidores em nuvem e fornecer um link direto para baixar o arquivo `Jogos-Bolados.apk`!
