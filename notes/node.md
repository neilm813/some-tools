# Node & TS version

Uninstall node and then install `nvm`[[windows]](https://github.com/coreybutler/nvm-windows) [[mac]](https://github.com/nvm-sh/nvm) to easily switch node versions. This is used on the prod server as well so updating node in the future is easier.

See [.nvmrc](../.nvmrc) for the node version used by the project. [package.json](../package.json) has an `"engines"` property that is enforced by [.npmrc](../.npmrc)

## [node.green](https://node.green/#ES2022)

The [tsconfig.base.json](./tsconfig.base.json)'s `"target",` option can be looked up on node.green to find the minimum node version needed to run the compiled code in production by finding the minimum column that is all green, however, it's easiest to just keep the node versions on dev and prod synced.

[tsconfig by node version package](https://www.npmjs.com/package/@tsconfig/node16) can be used / referenced for recommended settings based on the node version being used.
