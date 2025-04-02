# Nx Notes

## More nx Resources

- [nx community](https://nx.dev/community#community)
  - The slack server has a support channel for questions, sometimes I've had to go to node js subreddit and elsewhere though.
- For a quick overview of nx, check out [this video](https://www.youtube.com/watch?v=iIh5h_G52kI)
- [resolve-circular-dependencies](https://nx.dev/recipes/other/resolve-circular-dependencies)

## Nx commands

You can discover nx commands in the `project.json` files of apps and libs, they are embedded as clickable links to execute them in the terminal.

They are also in the Nx console VSCode extension.

- For moving apps or libs to new folders, there is an nx command to do this which will auto-update imports.

## App environments

Each app has it's own `apps/app-name/src/environments` folder which is favored over `.env` files. The `environment.ts` and `environment.prod.ts` files are ignored but an `environment.example.ts` is included for reference.

The `environment.ts` file is replaced with the `environment.prod.ts` file when doing a production build if the app's `project.json` `targets.build.configurations.production.fileReplacements` includes it.

- [TODO: Repo environments doc](.)
- `process.env.NODE_ENV` is NOT set to `'production'` without additional setup.

## Nx libraries

- [Library Types, Naming Conventions, Dependency Constraints](https://nx.dev/more-concepts/library-types)
- [Grouping Libraries](https://nx.dev/more-concepts/grouping-libraries)
- [Should I Make a New Library?](https://nx.dev/more-concepts/creating-libraries)

### Backend, frontend, and shared libs

- [Tags for dependency constraints and more](https://www.youtube.com/watch?v=enQDQmFquGU)

Shared libs that are intended to be usable by both node apps and web apps should use the `@nx/js` generator and must NOT use any node-only npm packages in runtime code (types are ok) otherwise the lib will crash web apps.

### Separating backend and frontend libs example

`libs/shared/api/data-access` is meant to be usable by frontend and backend apps, so this lib must not import from any other nx libs that use a node-only npm package in runtime code to keep it compatible with frontend apps.

However, the data-access lib needs to reference our custom mongoose db error types to type our api error responses. These custom mongoose error types and the runtime code to create instances of them used to exist in the `libs/shared/utils/common` lib, but the **runtime** imported from mongoose to do `error instanceof MongooseError` so this caused the react app to crash when importing from the `data-access` lib because it imported from a lib that used mongoose, a node-only package, in runtime.

The solution was to separate the custom mongoose db error types into their own lib of types so it was separate from the lib that had to import mongoose so the `data-access` lib could import the types without triggering an import from mongoose.

## ESLint warnings

Many ESLint warnings / errors are auto-fixable especially for simple things such as ordering imports. These should be auto fixed on save by the [workspace setting](../.vscode/settings.json) `"source.fixAll.eslint": true`.

ESLint auto-fixing is also added to a [pre-commit hook](../.husky/pre-commit) for staged files only where `lint-staged` settings come from the `"lint-staged"` field in the [package.json](../package.json).

When changing ESLint settings for specific projects, you can try to auto-fix the new rule on the whole project since the pre-commit hook is only for staged files: `npx nx run projectName:lint --fix`

Similarly for new lint rules for all projects (base `.eslintrc.json`) you can try to auto-fix for all projects with `npx nx run-many --target=lint --fix`

## Auto-generated

This project was generated using [Nx](https://nx.dev).

<p style="text-align: center;"><img src="https://raw.githubusercontent.com/nrwl/nx/master/images/nx-logo.png" width="450"></p>

🔎 **Smart, Fast and Extensible Build System**

### Running nx commands

To avoid needing to install the nx CLI globally, you can:

- Run `nx` commands via the `nx` script in `package.json`: `npm run nx...`
- Use `npx`: `npx nx...`
- Use the Nx Console VSCode extension
  - I've had some issues with generated libs not being placed in the specified directory before unless I used the Nx Console.

### Adding capabilities to your workspace

Nx supports many plugins which add capabilities for developing different types of applications and different tools.

These capabilities include generating applications, libraries, etc as well as the devtools to test, and build projects as well.

Below are our core plugins:

- [React](https://reactjs.org)
  - `npm install --save-dev @nx/react`
- Web (no framework frontends)
  - `npm install --save-dev @nx/web`
- [Angular](https://angular.io)
  - `npm install --save-dev @nrwl/angular`
- [Nest](https://nestjs.com)
  - `npm install --save-dev @nrwl/nest`
- [Express](https://expressjs.com)
  - `npm install --save-dev @nx/express`
- [Node](https://nodejs.org)
  - `npm install --save-dev @nx/node`

There are also many [community plugins](https://nx.dev/community) you could add.

### Generate an application

Run `nx g @nx/react:app my-app` to generate an application.

> You can use any of the plugins above to generate applications as well.

When using Nx, you can create multiple applications and libraries in the same workspace.

### Generate a library

Run `nx g @nx/react:lib my-lib` to generate a library.

> You can also use any of the plugins above to generate libraries as well.

Libraries are shareable across libraries and applications. They can be imported from `@some-tools/mylib`.

### Development server

Run `nx serve my-app` for a dev server. Navigate to [localhost](http://localhost:4200/). The app will automatically reload if you change any of the source files.

### Code scaffolding

Run `nx g @nx/react:component my-component --project=my-app` to generate a new component.

### Build

Run `nx build my-app` to build the project. The build artifacts will be stored in the `dist/` directory. Use the `--prod` flag for a production build.

### Running unit tests

Run `nx test my-app` to execute the unit tests via [Jest](https://jestjs.io).

Run `nx affected:test` to execute the unit tests affected by a change.

### Running end-to-end tests

Run `nx e2e my-app` to execute the end-to-end tests via [Cypress](https://www.cypress.io).

Run `nx affected:e2e` to execute the end-to-end tests affected by a change.

### Understand your workspace

Run `nx graph` to see a diagram of the dependencies of your projects.

### Further help

Visit the [Nx Documentation](https://nx.dev) to learn more.

### ☁ Nx Cloud

#### Distributed Computation Caching & Distributed Task Execution

<p style="text-align: center;"><img src="https://raw.githubusercontent.com/nrwl/nx/master/images/nx-cloud-card.png"></p>

Nx Cloud pairs with Nx in order to enable you to build and test code more rapidly, by up to 10 times. Even teams that are new to Nx can connect to Nx Cloud and start saving time instantly.

Teams using Nx gain the advantage of building full-stack applications with their preferred framework alongside Nx’s advanced code generation and project dependency graph, plus a unified experience for both frontend and backend developers.

Visit [Nx Cloud](https://nx.app/) to learn more.
