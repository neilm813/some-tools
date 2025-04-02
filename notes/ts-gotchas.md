# TypeScript Gotchas

## Built in utility types

- `Parameters<>` doesn't work with overloaded functions, it always returns the last overload's params.
