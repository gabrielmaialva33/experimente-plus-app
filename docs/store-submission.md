# Publicação nas lojas

Preparado em 23/09/2026 para a cláusula 6.3 e o item 17 do Anexo I: a submissão
inicial à Google Play e à App Store é feita pelos contratados **depois** que o
contratante fornecer contas, materiais e credenciais. Tudo o que não depende
delas já está no repositório; o que falta está listado abaixo, e nada aqui deve
receber segredo versionado.

## O que já está pronto

- **`eas.json`** com três perfis de build — `development` (dev client,
  distribuição interna), `preview` (APK/IPA interno apontando para a
  homologação) e `production` (loja) — e o perfil de envio `production`, que no
  Android sobe para a trilha **internal**. Validado com o parser oficial
  (`@expo/eas-json`) para as duas plataformas. Node 24.19.0 e pnpm 11.22.0,
  como no `mise.toml`.
- **Numeração de versão remota** (`appVersionSource: remote`, `autoIncrement`
  em produção): o EAS mantém `buildNumber` e `versionCode`, então nenhum
  contador de build é versionado nem colide entre máquinas. A versão pública
  continua sendo `expo.version` no `app.json`.
- **Trava de produção em `app.config.ts`.** O `.env` é ignorado pelo Git e o
  EAS não o envia. Sem as variáveis, um build de loja cairia em silêncio no
  servidor de homologação e no mapa de demonstração, sem ruas. O build de
  produção **falha** se `EXPO_PUBLIC_API_BASE_URL` faltar, apontar para
  `experimente-plus.mahina.fun` ou não usar https, e se
  `EXPO_PUBLIC_MAP_STYLE_URL` faltar ou for o estilo de demonstração.
- **Permissões declaradas só para o que o app usa**, conferidas no Info.plist e
  no manifesto resultantes (`npx expo config --type introspect`) e travadas na
  CI (`scripts/ci/verify-apk.py` falha se o APK pedir algo fora do conjunto
  revisado):
  - **Câmera**, só para ler o código do benefício em Validar. As fotos de uma
    avaliação vêm da galeria, não da câmera.
  - **Fotos** no iOS, para escolher imagens da avaliação. No Android elas vêm
    do seletor do sistema, sem permissão de armazenamento ou de mídia.
  - **Rede** (`INTERNET`, `ACCESS_NETWORK_STATE`, `ACCESS_WIFI_STATE`).
  - **Bloqueadas em `android.blockedPermissions`**: localização, microfone,
    armazenamento e mídia (`READ_EXTERNAL_STORAGE`, `WRITE_EXTERNAL_STORAGE`,
    `READ_MEDIA_*`), sobreposição de tela, biometria, vibração e o ID de
    publicidade. O plugin do seletor de imagens declarava `RECORD_AUDIO` e o
    SecureStore declarava Face ID, ambos por padrão, e o app não usa nenhum.
  - **Localização não é pedida**, porque o app não usa a posição do aparelho.
    Se o comportamento em falha de GPS (item 15) introduzir localização, a
    permissão entra no plugin `expo-maps` (`requestLocationPermission`)
    junto com o texto de uso, e na lista do `verify-apk.py`.
- **Criptografia de exportação:** `ios.config.usesNonExemptEncryption: false`.
  O app só usa HTTPS e hash da plataforma, que é a categoria isenta. O
  contratante confirma a declaração como publicador.
- **Requisitos de conta e privacidade:** exclusão de conta no app
  (`Conta → Excluir minha conta`) e no site (`/settings`), Termos em
  `/termos`, Política de Privacidade em `/privacidade`.

## O que o contratante precisa fornecer

1. **Conta Expo** (organização) onde o projeto EAS vai morar, e acesso dos
   contratados a ela.
2. **Apple Developer Program** (conta de organização, com D-U-N-S) e acesso ao
   App Store Connect. O certificado de distribuição e o perfil de provisionamento
   são gerados pelo EAS dentro dessa conta.
3. **Google Play Console** (conta de organização) e uma **chave de conta de
   serviço** com permissão de release, entregue fora do repositório.
4. **Confirmação do identificador `br.com.experimentemais`.** Ele está no
   `app.json` desde o primeiro commit e nunca foi confirmado. Depois da primeira
   distribuição, trocar significa publicar outro aplicativo.
5. **Domínio de produção** da API e do site, para `EXPO_PUBLIC_API_BASE_URL`, e
   o estilo de mapa de produção (item 15, provedor de mapas). A chave do Google
   Maps é opcional: sem ela o app usa MapLibre.
6. **Identidade visual:** ícone 1024×1024, ícone adaptativo Android (frente,
   fundo e monocromático), splash e capturas de tela. O app usa um **monograma
   provisório "E+"** da direção visual A (E branco e "+" laranja sobre o azul
   da marca), em `assets/images/` e `assets/expo.icon/`, no lugar dos ícones do
   template do Expo. A marca definitiva e as capturas das lojas continuam com o
   contratante: criá-las está fora do escopo (Anexo I item 16). Para trocar,
   substitua esses arquivos mantendo nomes e dimensões.
7. **Textos das lojas e privacidade:** nome, descrições, categoria, e-mail e
   site de suporte, o conteúdo final de Termos e Política de Privacidade
   (cláusula 10.1), e as respostas do formulário _Data safety_ do Google Play e
   dos rótulos de privacidade da Apple.

## Comandos, depois que as contas existirem

```bash
mise exec -- npx eas-cli login               # com a conta do contratante
mise exec -- npx eas-cli init                # vincula o projeto (grava owner/projectId no app.json)

# Variáveis de produção no servidor do EAS (públicas: entram no bundle)
mise exec -- npx eas-cli env:create --environment production \
  --name EXPO_PUBLIC_API_BASE_URL --value https://<dominio-de-producao> --visibility plaintext
mise exec -- npx eas-cli env:create --environment production \
  --name EXPO_PUBLIC_MAP_STYLE_URL --value https://<estilo-de-producao>/style.json --visibility plaintext

mise exec -- npx eas-cli build --profile preview --platform android   # conferência interna
mise exec -- npx eas-cli build --profile production --platform all
mise exec -- npx eas-cli submit --profile production --platform android
mise exec -- npx eas-cli submit --profile production --platform ios
```

A chave de conta de serviço do Google Play e as credenciais da Apple são
registradas no EAS (`eas credentials`) ou apontadas por caminho fora do
repositório. **Nenhuma entra no `eas.json`.**

## Pendências fora do app

- A escolha de fotos sem permissão de armazenamento depende do seletor do
  sistema, que existe em todo Android atual; conferir em um aparelho com
  Android 12 ou anterior antes da primeira release, já que
  `READ_EXTERNAL_STORAGE` está bloqueada.
- `NSLocalNetworkUsageDescription` vem do `expo-dev-client` e tem texto em
  inglês. É o padrão dos apps Expo com dev client; se a revisão da Apple
  questionar, o caminho é excluir o dev client do build de produção.

- `expo-doctor` passa em 20 de 21 verificações. A que falha pede 21
  atualizações de patch dentro do SDK 57 (`npx expo install --check`). Aplicar
  exige uma rodada própria de testes em development build.
- Aprovação, prazo de análise e permanência nas lojas dependem das plataformas
  (cláusula 6.4) e não são garantidos pelos contratados.
