# Welcome to your Expo app 👋

This is an [Expo](https://expo.dev) project created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
   npx expo start
   ```

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **app-example** directory and create a blank **app** directory where you can start developing.

### Other setup steps

- To set up ESLint for linting, run `npx expo lint`, or follow our guide on ["Using ESLint and Prettier"](https://docs.expo.dev/guides/using-eslint/)
- If you'd like to set up unit testing, follow our guide on ["Unit Testing with Jest"](https://docs.expo.dev/develop/unit-testing/)
- Learn more about the TypeScript setup in this template in our guide on ["Using TypeScript"](https://docs.expo.dev/guides/typescript/)

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.

## Decisões pendentes de confirmação

- **Identificador do aplicativo** — `br.com.experimentemais`, escolhido por convenção
  (reverso do domínio comercial, como a referência de mercado). Trocar depois de
  qualquer distribuição significa um aplicativo novo para as lojas e a quebra de
  App Links já verificados, então confirme antes do primeiro build de release.
- **`src/api/schema.d.ts` é versionado.** É gerado de `docs/openapi.yaml` por
  `pnpm api:types`, mas fica no repositório para que o aplicativo compile sem
  depender do backend estar disponível. Regere sempre que o contrato mudar.

## Mapa

O aplicativo carrega dois renderizadores e escolhe por configuração:

- **Google Maps** (`expo-maps`) quando `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` existe;
- **MapLibre** (`@maplibre/maplibre-react-native`) caso contrário, que não exige
  credencial e mantém o mapa funcionando em desenvolvimento e em builds sem chave.

O estilo do MapLibre vem de `EXPO_PUBLIC_MAP_STYLE_URL`. O padrão são as tiles de
demonstração, documentadas como uso apenas de desenvolvimento. Em produção aponte
para um estilo próprio — um arquivo Protomaps no armazenamento da operação também
dispensa chave, já que o MapLibre Native lê fontes `pmtiles://` diretamente.

> Manter os dois renderizadores custa tamanho de binário e uma segunda
> implementação para manter. É uma escolha deliberada e revisitável: consolidar
> em um só, provavelmente MapLibre, elimina a dependência de credencial de vez.
