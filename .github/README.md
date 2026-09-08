# CI e APK de teste

`workflows/ci.yml` executa typecheck e toda a suíte Jest em cada push e pull request.
Após essas verificações, gera APK nos pushes da branch padrão e em **Actions →
Mobile CI → Run workflow** (permite escolher a branch). PRs e branches de trabalho
recebem as verificações rápidas; o build nativo fica para integração ou pedido
explícito. Uma execução mais nova cancela a anterior do mesmo evento/ref.

O artefato `experimente-plus-pilot-debug-key-<commit>-<UTC>-<tentativa>` contém APK
e SHA-256, retidos por 14 dias. Suporta aparelhos Android **arm64-v8a** e emuladores
**x86_64**; não inclui aparelhos ARM de 32 bits. A conta Expo não é necessária.

## APK autônomo

É uma **variante release assinada com a chave de debug do template Expo**, não um
`assembleDebug`: release embute JS/assets e desliga o caminho de desenvolvimento.
Pode iniciar sem Metro. `scripts/ci/verify-apk.py` impede publicar sem bundle,
origem do piloto, ABIs esperadas, manifest não debuggable e assinatura idêntica ao
certificado de debug gerado. Não é uma assinatura de distribuição/loja.

O CI gera `android/` com `expo prebuild --platform android --no-install`, usando
`app.json` e os config plugins existentes; não versiona nem modifica o template
nativo para assinar. Se um futuro template trocar a assinatura, o gate falha para
exigir reconciliação. Não execute prebuild limpo sobre customizações locais.

## Ambiente

Node, pnpm e Java/Temurin vêm de `mise.toml`, sem versões duplicadas no workflow.
O SDK já presente no runner é ligado ao caminho de SDK declarado pelo mise antes
do setup Android. As licenças são aceitas; o Gradle gerado resolve e instala os
pacotes SDK/NDK/build-tools exigidos pelo Expo/RN. Mise, store pnpm e Gradle têm
cache; dependências usam lockfile congelado. O build tem limite de 60 minutos e
dois workers; não existe cache de `node_modules` ou `android/` gerado.

`pnpm-workspace.yaml` nega explicitamente o postinstall do MSW: os testes nativos
não usam o worker de navegador. O placeholder anterior interrompia instalações
limpas com `ERR_PNPM_IGNORED_BUILDS`; nenhum script de dependência foi autorizado.
`tsconfig.json` inclui `expo/types` explicitamente, permitindo checar imports CSS
em um clone limpo sem depender do `expo-env.d.ts` gerado e ignorado pelo Git.

`EXPO_PUBLIC_API_BASE_URL=https://experimente-plus.mahina.fun` é fixado no job APK
e inlinado no bundle. O aplicativo acessa **dados reais do piloto**, inclusive nas
ações autenticadas; autonomia de Metro não significa funcionamento offline da
API. `EXPO_NO_DOTENV=1` evita incluir configurações locais por acidente. Não há
segredos `EXPO_PUBLIC_*`, keystore próprio, EAS ou publicação em loja.

O mapa mantém o comportamento atual sem chave Google: MapLibre com o estilo de
demo padrão. O CI não resolve a pendência de cartografia detalhada do piloto.

Antes de distribuir, confira o artefato da execução aprovada, instale em um
dispositivo/emulador de teste sem redirecionamento de porta Metro e abra o app.
Os gates de arquivo não substituem essa verificação de execução nativa.
