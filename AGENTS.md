# Guia do repositório — Experimente+ App

## Escopo e fontes de verdade

Cliente móvel React Native/Expo do Experimente+, com descoberta pública, conta, carteira, apresentação de benefícios e validação condicionada às capabilities do parceiro. A API e as regras de negócio pertencem ao repositório independente `../experimente-plus/`. Este arquivo é o guia canônico de agentes; `CLAUDE.md` o importa.

Antes de escrever código Expo, leia a documentação da versão exata usada no projeto: <https://docs.expo.dev/versions/v57.0.0/>. Não aplique exemplos de versões anteriores sem conferir APIs e compatibilidade com as dependências instaladas.

Contratos canônicos no checkout backend:

- [Produto móvel](../experimente-plus/docs/product/17-aplicativo-movel-consumer-first.md): jornadas e estados.
- [ADR 0022](../experimente-plus/docs/architecture/decisions/0022-contrato-api-movel-consumer-first.md): API, autenticação, capabilities e resgate.
- [ADR 0023](../experimente-plus/docs/architecture/decisions/0023-stack-e-navegacao-do-cliente-movel.md): stack, navegação, persistência e identidade visual.
- [OpenAPI](../experimente-plus/docs/openapi.yaml): contrato usado para gerar `src/api/schema.d.ts`.

Se o backend não estiver ao lado, os tipos versionados permitem trabalhar no app; para mudar o contrato ou regenerá-los, obtenha o checkout canônico no caminho esperado pelo script. O README ainda contém instruções do template Expo: confira scripts, `mise.toml` e este guia antes de segui-las.

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

| Caminho               | Responsabilidade                                                  |
| --------------------- | ----------------------------------------------------------------- |
| `src/app/`            | Rotas Expo Router, layouts, abas e telas de detalhe               |
| `src/api/`            | Cliente HTTP, sessão, endpoints, QueryClient e schema gerado      |
| `src/session/`        | Provider de sessão, estados e composição por capabilities         |
| `src/catalog/`        | Queries, filtros, cidade persistida, horários e contatos          |
| `src/wallet/`         | Queries, tipos, comprovantes, histórico e parsing de apresentação |
| `src/maps/`           | Renderizadores Google/MapLibre, configuração e pins               |
| `src/analytics/`      | Eventos de descoberta                                             |
| `src/components/`     | Componentes reutilizáveis                                         |
| `src/theme/`          | Tokens visuais e seleção de cores                                 |
| `src/**/__tests__/`   | Testes próximos aos domínios                                      |
| `app.json`, `assets/` | Configuração Expo, plugins e assets                               |

Use `@/*` para `src/*` e `@/assets/*` para `assets/*`, conforme `tsconfig.json`. Preserve nomes kebab-case, convenções especiais de rotas (`_layout.tsx`, `[param]`, grupos entre parênteses), componentes PascalCase e variáveis/funções camelCase. Siga a formatação do arquivo vizinho; não há configuração de Prettier versionada.

O root layout mantém o navigator montado e usa a splash para cobrir o carregamento da sessão. Preserve esse comportamento e o cleanup dos listeners de foco/rede. Os estados `loading`, `anonymous`, `authenticated` e `unavailable` são distintos.

Abas: visitante tem Explorar/Entrar; consumidor tem Explorar/Carteira/Conta; parceiro habilitado acrescenta Validar. Histórico pertence ao fluxo de Validar. Lista e mapa compartilham um único estado de filtro em Explorar, sem criar uma aba de mapa ou duplicar controles.

Use `src/theme/tokens.ts` e `useColors`; os tokens derivam de `../experimente-plus/inertia/css/app.css`. Preserve `primary` para marca/navegação, `cta` para conversão, estados semânticos e suporte claro/escuro. `src/constants/theme.ts` e componentes do template não justificam criar outra paleta.

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
| `pnpm lint`                      | Script `expo lint`; configuração ESLint ainda não está versionada           |

O app usa módulos nativos e `expo-dev-client`; valide com development build, especialmente câmera, mapas, SecureStore e MMKV. Android é construído localmente; o ADR prevê serviço remoto para iOS/distribuição. Ainda não há `eas.json` versionado nem comando de release configurado.

`android/`, `ios/` e `.expo/` são gerados e ignorados. Mudanças permanentes de configuração nativa devem partir de `app.json` e config plugins. Preserve customizações locais antes de qualquer regeneração limpa.

Não use `pnpm reset-project` como limpeza: o script do template move ou remove `src/` e `scripts/`, apagando a estrutura implementada. O script `expo lint` pode iniciar configuração/instalação de ESLint; não o descreva como gate já pronto sem conferir e revisar seus efeitos. `pnpm-workspace.yaml` também mantém a decisão de build do MSW como placeholder; não habilite scripts de dependências indiscriminadamente.

## Configuração da API e mapas

`src/api/config.ts` lê `EXPO_PUBLIC_API_BASE_URL` e atualmente possui fallback para uma operação remota. Configure explicitamente o backend de desenvolvimento antes de testes manuais que escrevam dados. Em emulador/dispositivo, use uma origem alcançável e compatível com a resolução pública da operação; `localhost` do dispositivo não é o host de desenvolvimento.

As variáveis `EXPO_PUBLIC_*` entram no bundle e não guardam segredos. Não versione `.env`, credenciais de assinatura ou tokens. Use `resolveMediaUrl` para URLs relativas de mídia retornadas pela API.

`EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` seleciona o renderizador Google; sem ela, o código usa MapLibre. `EXPO_PUBLIC_MAP_STYLE_URL` configura o estilo do MapLibre; o fallback de demo é destinado ao desenvolvimento. Preserve os dois caminhos enquanto essa for a decisão vigente e valide a configuração nativa de cada provedor.

`app.json` usa o identificador `br.com.experimentemais` e scheme `experimenteplus`. O README registra a identidade de distribuição como pendente de confirmação antes da primeira release; não a trate como decisão de loja já concluída.

## Testes e entrega

Jest está configurado em `package.json` com `jest-expo`. Os testes usam `*.test.ts`/`*.test.tsx` em `__tests__`, com mocks de serviços nativos. Execute `pnpm typecheck` e os testes afetados após mudanças de código; valide em development build quando houver impacto em navegação ou módulos nativos. Não afirme que câmera, mapas ou iOS foram testados apenas porque Jest passou.

Priorize regressões de rotação concorrente, capabilities, filtros/cidade, horários/contatos, pins e parsing de QR. Mudanças de contrato exigem regenerar e versionar `src/api/schema.d.ts`, revisar o diff e testar consumidores; não edite esse arquivo manualmente.

O histórico segue Conventional Commits, como `feat(app):`, `feat(session):` e `feat(wallet):`. Entregas devem explicar resultado, contrato afetado, plataformas verificadas e limitações. Para documentação, confira caminhos, scripts e diff; builds nativos e chamadas à API não são necessários.
