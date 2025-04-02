# shared-discord-some-bot-data-access

This lib is for discord functionality that is specific to the some-bot.

Currently the libs/shared/discord/utils lib has common discord utils and some-bot specific discord utils which should be separated.

After separating so that this lib contains the some-bot specific discord code and this lib uses the libs/shared/discord/utils, the discord utils lib should be moved with the nx move command into libs/shared/discord/data-access.

The libs/shared/discord/types also need to be separated

Most of the discord utils are actually data-access since discord.js is a wrapper for the discord api. If desired the pure utils that have no data-access can be separated from libs/shared/discord/data-access to libs/shared/discord/utils/common but it will create even more libs and import statements.

## nx auto generated readme

This library was generated with [Nx](https://nx.dev).

## Running unit tests

Run `nx test shared-discord-some-bot-data-access` to execute the unit tests via [Jest](https://jestjs.io).

## Running lint

Run `nx lint shared-discord-some-bot-data-access` to execute the lint via [ESLint](https://eslint.org/).
