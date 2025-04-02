# Repo Conventions

## Environments

All [apps](./apps/) have an `environments` folder with `environment.ts` and `environment.prod.ts` ignored but there is an `environment.example.ts` as a guide for creating your TS environment files but you should double check with other devs that you have all the necessary environment files.

These TypeScript environment files are preferred over `.env` files. `.env` vars are not available in the built `dist` code (except maybe ones in react or other web apps).

## Casing and naming

- All folders and files: kebab-case
- Var naming: use whole words, no acronyms or abbreviations unless universally known such as `id`
  - SCREAMING_SNAKE_CASE for immutable constants, PascalCase for classes and react component var (not file) names, and camelCase for everything else

## Git protocol

Follow [this](https://docs.google.com/document/d/1ci-ObhF4dMdWEHIIJ6oopYcbnmaPpurn/edit?usp=sharing&ouid=116291619252844415179&rtpof=true&sd=true) branching strategy and naming convention with the addition of the app or lib name that the feature or bug is for, such as `api/feature/feature-name`.

## Export / import

Named exports / imports are preferred.

### Index files

- Every folder should have an `index.ts` which exports whatever should be exported from the other files in that folder
  - Unless the folder is only imported from via an `index.ts` at a higher level to help consolidate many small `index.ts` files
- Index files generally shouldn't contain logic, only imports and exports
- Index files make importing and exporting easier:
  - Imports that reference only a folder name automatically look for an `index.ts` to import from
  - An index can export from many files so that a single import from that index can import from multiple files without needing to know the subfolder and file structure to do multiple imports using file names
  - Not needing to use a file name in the import makes it easier to rename files without breaking imports, only the index files would need to update their exports with the new file name and then all imports flowing through the index are unaffected
- Only import from file names directly when they are within the same folder (neighboring files), otherwise all imports should flow through the `index.ts` when importing from an outside folder
  - This avoids circular imports, for example: neighborA and neighborB are exported by neighboring index, if neighborA tries to import from neighborB via the index, that means neighborA is importing from the index that imports from neighborA
  - This is what is meant in the nx docs and elsewhere by the phrase 'libraries should have a clearly defined public API'
  - A library or folder of files should clearly define everything that should be exported in the `index.ts` files so that the importer **_interfacing_** with the lib has a clear entry point to import everything needed without requiring deep knowledge of the folder and file structure to import from lots of nested files

#### Index files example

For an example, see [shared discord utils lib index](../libs/shared/discord/utils/src/index.ts).

This top-level index file specifies everything that this library is supposed to expose to the public (outside of this library) which means that everything needed from this lib can be imported in a single import without drilling deeper into the file structure. If something in the lib is not exported here, it is not meant to be imported and should not be imported directly by drilling deeper into the file structure.

Sometimes something needs to be exported in the lib but only internally so elsewhere in the lib can import it but outside the lib cannot import it. That can easily be done by simply not exporting it in the base `src/lib/index.ts`.

Even if you only have one fie, it's sometimes good to put it in a folder with an `index.ts` to make it easier in the future to add more files. However, when the files / folders are already inside of a folder with it's own `index.ts` it's easy add sub-folders later and only need to update the indexes so no outside code's imports are broken.

## Vertical slice / feature slice pattern

See this [blog](https://jimmybogard.com/vertical-slice-architecture/). After reading it, read the comment exchange with this text you can search for: 'If two or more slices can share parts' -- this comment relates to the below code duplication section.

This pattern is already related to the nx feature lib convention but you can also apply it more specifically in a react app (group components by feature rather where only components shared between features are in a generic `components` folder) or a RESTful api (instead of controllers, routes, and services folders). See [api app](./apps/api/src/discord/server-member/features/find-by-discord-id-or-email/find-by-discord-id-or-email.ts) for an example.

## Code duplication

Some amount of code duplication is acceptable to avoid spawning an abstract monster that will have to be slayed later. For example, if multiple features share some logic that's been prematurely abstracted to a function called by each--if the shared part starts to diverge as the features become more clear and mature over time, the abstracted logic they depend on will often become more complex and contorted to keep it working for the diverging cases or unexpected issues. So try to strike a balance instead of being extreme about following DRY (Do not Repeat Yourself).

For more explanation with visuals and humor, see [The wet codebase](https://www.youtube.com/watch?v=17KCHwOwgms) by [Dan Abramov](https://twitter.com/dan_abramov?ref_src=twsrc%5Egoogle%7Ctwcamp%5Eserp%7Ctwgr%5Eauthor) whose the #1 contributor to the [React codebase](https://github.com/facebook/react/graphs/contributors).

## Avoid deep nesting

- By using early exit guard clauses (inversion - invert condition order) and extraction to extract logic into separate functions
- [Example video](https://www.youtube.com/watch?v=CFRhGnuXG-4)

## TypeScript Conventions

### Error handling

It's encouraged to handle errors by returning errors with defined types rather than throwing them so that the possible errors of a function being called are clearly defined as part of the type-system that will enforce handling them.

- [Error handling with the either type](https://dev.to/milos192/error-handling-with-the-either-type-2b63).
- [try fail](https://dev.to/qpwo/goodbye-trycatch-hello-error-return-5hcp)
- [internal implementation](../libs/shared/utils/try-fail/src/index.ts)

### Enums

Enums are generally avoided in favor of `as const` objects. See [short video](https://www.youtube.com/watch?v=pWPClHdcvVg)
