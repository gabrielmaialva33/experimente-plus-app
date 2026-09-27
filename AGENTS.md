# Guia do repositório — Experimente+ App

## Escopo e fontes de verdade

Cliente móvel React Native/Expo do Experimente+, com descoberta pública, conta, carteira, apresentação de benefícios e validação condicionada às capabilities do parceiro. A API e as regras de negócio pertencem ao repositório independente `../experimente-plus/`. Este arquivo é o guia canônico de agentes; `CLAUDE.md` o importa.

Antes de escrever código Expo, leia a documentação da versão exata usada no projeto: <https://docs.expo.dev/versions/v57.0.0/>. Não aplique exemplos de versões anteriores sem conferir APIs e compatibilidade com as dependências instaladas.

O contrato da API é o [OpenAPI](../experimente-plus/docs/openapi.yaml) do checkout backend, usado para gerar `src/api/schema.d.ts`. Se o backend não estiver ao lado, os tipos versionados permitem trabalhar no app; para mudar o contrato ou regenerá-los, obtenha o checkout canônico no caminho esperado pelo script. O [README](README.md) descreve setup, variáveis, build, CI, permissões e solução de problemas.

A especificação de produto do app (`docs/product/17-aplicativo-movel-consumer-first.md`) e os ADRs do backend foram removidos de propósito. Os números citados em comentários do código (ADR-0022, ADR-0023 e outros) são histórico; o que aqueles documentos fixavam para o app está resumido abaixo e nas seções seguintes:

- **Jornadas e estados (produto 17):** visitante explora sem login (lista e mapa, lugar, agenda, Concierge); consumidor tem conta, carteira, compra, apresentação por QR, histórico, favoritos, seguidos, roteiros, interesses e avaliações; parceiro valida e consulta utilizações. Toda tela tem estado de carregamento, vazio com caminho de saída, erro com nova tentativa e sem conexão. Leituras podem ter retry com backoff; regra de negócio nunca é repetida sozinha.
- **API e sessão (ADR 0022):** JWT de acesso e refresh opaco com rotação única em voo; capabilities vêm de `GET /api/v1/me/context`; Validar e Histórico dependem de `partner.redemptions.validate`/`read`; resgate em prévia e confirmação explícita, idempotente pelo token, com validade dada pelo servidor.
- **Stack, navegação e persistência (ADR 0023):** Expo com development build, Expo Router, TanStack Query, credenciais só no SecureStore e preferências no MMKV; abas compostas pela sessão (`Tabs.Protected`) só depois de o contexto resolver, com a splash cobrindo o carregamento; cidade é estado local de descoberta; identidade visual derivada dos tokens do web; Android construído localmente e distribuição/iOS por serviço remoto (EAS).

## Contratos de produto e segurança

- Experimente+ é multicidade e multicategoria. Cidade é estado de descoberta, tenant é operação e organização pode administrar várias unidades. `Sobral` é uma pessoa; Tour Londrina é apenas referência de experiência.
- Explorar funciona sem login. A base URL seleciona a operação por hostname; o app não envia `tenant_id` em rotas públicas. Mudar de cidade não troca tenant nem rotaciona credenciais.
- O cliente é fino: elegibilidade, horários, limites, autorização e validade de benefícios são decididos no backend. Não introduza checkout, cobrança, avaliações, push, SDK gerado ou resgate offline fora dos marcos aceitos.
- `GET /api/v1/me/context` fornece as capabilities. `partner.redemptions.validate` controla Validar e `partner.redemptions.read` controla Histórico; `partner.enabled` ou um papel global isolado não bastam. Não monte áreas privilegiadas antes de o contexto resolver.
- Access e refresh tokens persistem somente em SecureStore/Keychain/Keystore. MMKV guarda preferências e flags locais, não credenciais. Preserve a limpeza de credenciais remanescentes após reinstalação.
- Centralize requisições em `src/api/client.ts` e rotação em `src/api/session.ts`. Chamadas que consomem refresh compartilham uma única rotação em voo. `401` autenticado permite uma renovação e um replay; `401` no refresh encerra a sessão.
- Erros de regra e outros 4xx não entram em retry automático; `429` respeita `Retry-After`. Mutations não são repetidas automaticamente pelo QueryClient. Falha de rede não deve descartar uma credencial ainda válida.
- QR e URL de apresentação são privados e temporários. Não persistir, registrar em logs/analytics, copiar automaticamente ou abrir conteúdo arbitrário lido da câmera. Extraia o token usando o helper existente.
- Preview nunca resgata. Confirmação exige ação explícita da pessoa; após resposta ambígua, repetir o mesmo token deve retornar o comprovante original. A contagem regressiva usa `expires_at` do servidor e não estende a validade localmente.

## Arquitetura e organização

Stack declarada: Expo SDK 57, React Native 0.86, React 19, Expo Router, TypeScript strict, TanStack Query, SecureStore e MMKV. `main` aponta para `expo-router/entry`.

| Caminho                | Responsabilidade                                                  |
| ---------------------- | ----------------------------------------------------------------- |
| `src/app/`             | Rotas Expo Router, layouts, abas e telas de detalhe               |
| `src/api/`             | Cliente HTTP, sessão, endpoints, QueryClient e schema gerado      |
| `src/session/`         | Provider de sessão, estados e composição por capabilities         |
| `src/catalog/`         | Queries, filtros, cidade persistida, horários e contatos          |
| `src/wallet/`          | Queries, tipos, comprovantes, histórico e parsing de apresentação |
| `src/purchases/`       | Produtos, compra, pedidos e intenção de compra persistida         |
| `src/place/`           | Página do lugar: cabeçalho, ações, benefício, informações         |
| `src/explorer/`        | Favoritos, seguidos, roteiros, interesses e "Para você"           |
| `src/partner-content/` | Experiências, eventos e vitrine publicados pelo parceiro          |
| `src/reviews/`         | Avaliações, fotos e denúncias                                     |
| `src/concierge/`       | Assistente de descoberta ancorado no catálogo                     |
| `src/maps/`            | Renderizadores Google/MapLibre, configuração e pins               |
| `src/analytics/`       | Eventos de descoberta                                             |
| `src/components/`      | Componentes reutilizáveis                                         |
| `src/theme/`           | Tokens visuais e seleção de cores                                 |
| `src/**/__tests__/`    | Testes próximos aos domínios                                      |
| `app.json`, `assets/`  | Configuração Expo, plugins e assets                               |

Use `@/*` para `src/*` e `@/assets/*` para `assets/*`, conforme `tsconfig.json`. Preserve nomes kebab-case, convenções especiais de rotas (`_layout.tsx`, `[param]`, grupos entre parênteses), componentes PascalCase e variáveis/funções camelCase. A formatação é do Prettier (`.prettierrc.json`, os mesmos valores do backend: sem ponto e vírgula, aspas simples, 100 colunas); rode `pnpm format` antes de commitar. Reformatações mecânicas entram em `.git-blame-ignore-revs`.

O root layout mantém o navigator montado e usa a splash para cobrir o carregamento da sessão. Preserve esse comportamento e o cleanup dos listeners de foco/rede. Os estados `loading`, `anonymous`, `authenticated` e `unavailable` são distintos.

Abas: visitante tem Explorar/Entrar; consumidor tem Explorar/Carteira/Conta; parceiro habilitado acrescenta Validar. Histórico pertence ao fluxo de Validar. Lista e mapa compartilham um único estado de filtro em Explorar, sem criar uma aba de mapa ou duplicar controles.

Use `src/theme/tokens.ts` e `useColors`; os tokens derivam de `../experimente-plus/inertia/css/app.css`. Preserve `primary` para marca/navegação, `cta` para conversão, estados semânticos e suporte claro/escuro. A paleta e os componentes do template Expo (`src/constants/theme.ts`, `ThemedText`, `ThemedView`) foram removidos; não os recrie nem crie outra paleta.

Acessibilidade: controles têm `accessibilityRole`, nome em português quando o texto visível falta ou é ambíguo e `accessibilityState` para seleção, marcação, expansão e desabilitado; alvos de toque têm ao menos 44 dentro do próprio pai (no Android o `hitSlop` não passa da borda do pai). Mensagens que surgem após uma ação usam `useAnnouncement`/`announce` (`src/components/announce.ts`), sem `accessibilityLiveRegion` no mesmo texto. Ícones que só repetem o texto ao lado recebem `decorative`; imagens com significado recebem `accessible` e descrição. Limites de linha passam por `useLineCap` (`src/theme/font-scale.ts`) e caixas com texto usam `minHeight`, não altura fixa. Blocos lado a lado (preço e ação, duas datas, total e botão, título e ação de seção) empilham com `useStackedLayout` a partir do tamanho "Grande" do sistema (1.3); cartões de trilho horizontal usam `useCompactCardWidth`, que cresce com o texto. Os pares de cor de texto estão em `src/theme/__tests__/contrast.test.ts`.

Telas largas: a partir de 600 dp o Android 16 ignora a trava de retrato, e tablets e dobráveis abertos rodam o app em largura total e em paisagem. O conteúdo fica numa coluna de `src/components/content-frame.tsx`: `useContentFrame()` dá a medida legível (`MEASURE.readable`) com o gutter do telefone e distância de recortes laterais; Explorar usa `useFeedLayout()` (grade de cartões de lugar, 2 colunas em tablet retrato, 3 em paisagem, menos com texto grande) e repassa a coluna por `ContentFrameProvider`, lida com `useScreenFrame()` por faixa, filas horizontais e seções. Faixas azuis, fotos, mapa, barra fixa e abas continuam de ponta a ponta; só o conteúdo delas segue a coluna. Folhas de baixo usam `BottomSheet` (`src/components/bottom-sheet.tsx`), que mantém medida de telefone centralizada e reserva a barra de navegação.

Estados: vazio e falha usam `EmptyState` com uma ação; carregamento usa `ContentSkeleton` ou `useLoadingCopy` (`src/api/online.ts`), que dizem "Sem conexão com a internet" enquanto o `onlineManager` estiver offline, porque o TanStack pausa a busca em vez de falhar; `usePullToRefresh` não gira sem conexão. Telas com a faixa azul sob a barra de status chamam `useBandStatusBar`. Links sem rota caem em `src/app/+not-found.tsx`.

## Ambiente e comandos

Execute na raiz deste repositório. `mise.toml` define Node 24, pnpm 11, Java Temurin 21 e os caminhos do Android SDK. Use `mise install` para preparar as ferramentas e `mise exec -- <comando>` quando o shell não ativar o ambiente local. Não use inadvertidamente Node ou Java globais de outra versão.

| Comando                          | Finalidade                                                                  |
| -------------------------------- | --------------------------------------------------------------------------- |
| `pnpm install --frozen-lockfile` | Instalar dependências do lockfile                                           |
| `pnpm start`                     | Iniciar Metro/Expo para desenvolvimento                                     |
| `pnpm android`                   | Compilar e executar o cliente Android local                                 |
| `pnpm ios`                       | Build local iOS; exige host macOS com ferramentas Apple                     |
| `pnpm web`                       | Iniciar alvo web do Expo; não comprova compatibilidade das jornadas nativas |
| `pnpm typecheck`                 | TypeScript sem emissão                                                      |
| `pnpm test --runInBand`          | Jest em execução serial, com preset `jest-expo`                             |
| `pnpm api:types`                 | Regenerar tipos a partir de `../experimente-plus/docs/openapi.yaml`         |
| `pnpm lint`                      | `expo lint` com `eslint-config-expo` e a regra do Prettier; roda na CI      |
| `pnpm format`                    | Formatar com Prettier (`pnpm format:check` só confere)                      |

O app usa módulos nativos e `expo-dev-client`; valide com development build, especialmente câmera, mapas, SecureStore e MMKV. Android é construído localmente; iOS e distribuição usam serviço remoto (EAS). `eas.json` define os perfis `development`, `preview` e `production` e o envio às lojas; `app.config.ts` recusa build de produção sem URL de API e estilo de mapa de produção. O que falta para publicar depende do contratante e está em [`docs/store-submission.md`](docs/store-submission.md).

`android/`, `ios/` e `.expo/` são gerados e ignorados. Mudanças permanentes de configuração nativa devem partir de `app.json` e config plugins. Preserve customizações locais antes de qualquer regeneração limpa.

Não use `pnpm reset-project` como limpeza: o script do template move ou remove `src/` e `scripts/`, apagando a estrutura implementada. `pnpm-workspace.yaml` também mantém a decisão de build do MSW como placeholder; não habilite scripts de dependências indiscriminadamente.

## Configuração da API e mapas

`src/api/config.ts` lê `EXPO_PUBLIC_API_BASE_URL` e atualmente possui fallback para uma operação remota. Configure explicitamente o backend de desenvolvimento antes de testes manuais que escrevam dados. Em emulador/dispositivo, use uma origem alcançável e compatível com a resolução pública da operação; `localhost` do dispositivo não é o host de desenvolvimento.

As variáveis `EXPO_PUBLIC_*` entram no bundle e não guardam segredos. Não versione `.env`, credenciais de assinatura ou tokens. Use `resolveMediaUrl` para URLs relativas de mídia retornadas pela API.

`EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` seleciona o renderizador Google; sem ela, o código usa MapLibre. Em homologação, defina no `.env` local `EXPO_PUBLIC_MAP_STYLE_URL=https://midia-experimente.mahina.fun/maps/norte-parana/style.json`: é a URL pública esperada, alias estável do basemap regional Protomaps servido do R2 próprio (caminho A da antiga ADR 0026 do backend). Sem a variável, permanece o fallback `demotiles.maplibre.org`, cujo tileset termina no zoom 6 e não fornece detalhe de rua para a câmera inicial no zoom 11. MapLibre Native lê fontes `pmtiles://` diretamente; não adicione a biblioteca JavaScript `pmtiles`. Preserve os dois renderizadores e valide a configuração nativa de cada provedor.

No MapLibre os lugares são camadas de um `GeoJSONSource` com agrupamento nativo, não `Marker`: views de marcador no Android desenham fora do mapa. O leitor de tela chega aos lugares pela lista, para a qual o próprio mapa leva. Emulador com `-gpu swiftshader_indirect` não desenha camadas de símbolos (rótulos, pontos, agrupamentos); valide o mapa com `-gpu host`. A validação visual em Android e iOS reais ainda não foi feita e exige development build: zoom 11 a 15 nas nove cidades da demonstração (de Maringá a Bandeirantes), acentos nos rótulos e atribuição Protomaps/OpenStreetMap visível.

`app.json` usa o identificador `br.com.experimentemais` e scheme `experimenteplus`. O README registra a identidade de distribuição como pendente de confirmação antes da primeira release; não a trate como decisão de loja já concluída.

## Testes e entrega

Jest está configurado em `package.json` com `jest-expo`; `jest.setup.js` aplica o mock oficial de `react-native-safe-area-context` (insets zero sem provider; um teste que mocka o módulo prevalece) e `jest.resolver.js` compõe o resolver do preset com o filtro do Worklets para que Reanimated rode em Jest com sua implementação JavaScript (o estado derivado do scroll é testável; a animação em si só se verifica em development build). Os testes usam `*.test.ts`/`*.test.tsx` em `__tests__`, com mocks de serviços nativos. Execute `pnpm typecheck` e os testes afetados após mudanças de código; valide em development build quando houver impacto em navegação ou módulos nativos. Não afirme que câmera, mapas ou iOS foram testados apenas porque Jest passou.

Priorize regressões de rotação concorrente, capabilities, filtros/cidade, horários/contatos, pins e parsing de QR. Mudanças de contrato exigem regenerar e versionar `src/api/schema.d.ts`, revisar o diff e testar consumidores; não edite esse arquivo manualmente.

O histórico segue Conventional Commits, como `feat(app):`, `feat(session):` e `feat(wallet):`. Entregas devem explicar resultado, contrato afetado, plataformas verificadas e limitações. Para documentação, confira caminhos, scripts e diff; builds nativos e chamadas à API não são necessários.
