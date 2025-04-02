/* eslint-disable @typescript-eslint/no-explicit-any */

export const isArray = <T>(value: T | T[]): value is T[] => Array.isArray(value);

/**
 * Gets keys in `T` that are found in `FromT`.
 */
export type SharedKeysFrom<FromT, T> = {
  [Key in keyof FromT]: Key extends keyof T ? Key : never;
};

/**
 * Gets the union of keys in `T` that are found in `FromT`.
 */
export type UnionSharedKeysFrom<FromT, T> = keyof SharedKeysFrom<FromT, T>;

export type AnyObject = {
  [key: string]: any;
};

export type UnionFromArray<T extends unknown[]> = Extract<T[number], unknown>;

/**
 * Infers the return type that a Promise resolves to.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AsyncReturnType<Fn extends (...args: any) => Promise<any>> = Fn extends (...args: any) => Promise<infer R>
  ? R
  : unknown;

export type UnwrapPromise<P> = P extends Promise<infer ValueT> ? ValueT : unknown;

/**
 * Transforms all the values types of a Record to a new type.
 * @template SourceT The type to transform.
 * @template NewValueT The type to use for the values of `SourceT`.
 */
export type MapValueTypes<SourceT extends Record<string, unknown>, NewValueT> = {
  [Key in keyof SourceT]: NewValueT;
};

/**
 * Maps the string result of `typeof` to the corresponding TypeScript type.
 * @see [mdn typeof](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/typeof#description)
 */
export interface TypeofMap {
  bigint: bigint;
  string: string;
  boolean: boolean;
  number: number;
  symbol: symbol;
  object: object;
}

export const SHARED_TYPE_NAMES = {
  CODED_FAULT: 'CODED_FAULT',
} as const;

export type SharedTypeNames = typeof SHARED_TYPE_NAMES;

/**
 * @see [Flexible nominal typing](https://spin.atomicobject.com/2018/01/15/typescript-flexible-nominal-typing/)
 */
interface Flavoring<FlavorDiscriminator> {
  /** `undefined` at runtime. */
  _flavor?: FlavorDiscriminator;
}

/**
 * Creates a higher order branded type.
 * `PlainT` can still be used, but mixing flavors will be prevented.
 * This can sometimes be useful just as an descriptive alias for a primitive type like a string instead of the type
 * name collapsing into just 'string'.
 * @see [Flexible nominal typing](https://spin.atomicobject.com/2018/01/15/typescript-flexible-nominal-typing/)
 * @example
 * ```
 * type PersonId = Flavor<number, 'Person'>;
 * ```
 */
export type Flavor<PlainT, FlavorDiscriminator> = PlainT & Flavoring<FlavorDiscriminator>;

interface TypeMap {
  string: string;
  number: number;
  boolean: boolean;
}

/**
 * Utility type to derive and intersect route params from a url with parameters following this
 * format: `:paramName<paramType>`
 */
type _DeriveRouteParams<
  RouteString,
  // Record<string, never> suppresses "property 'x' does not exist on type"
  // when accessing missing properties so we need to allow the `{}` type
  // eslint-disable-next-line
  AccumulatedParams extends Record<string, unknown> = {}
> =
  // If route param in middle: 'foo/:paramName<number>/bar/:maybeMore<string>'
  RouteString extends `${string}/:${infer ParamName extends string}<${infer ParamType extends keyof TypeMap}>/${infer RemainingString extends string}`
    ? // Then proceed to extract remaining params
      _DeriveRouteParams<
        RemainingString,
        AccumulatedParams & {
          [Name in ParamName]: TypeMap[ParamType];
        }
      >
    : // Else if route param is at end of string: 'foo/:paramName<string>'
    RouteString extends `${string}/:${infer ParamName}<${infer ParamType extends keyof TypeMap}>`
    ? // Then merge the { paramName: paramType } with previously found params
      AccumulatedParams & { [Name in ParamName]: TypeMap[ParamType] }
    : // Else no param found, return the accumulated params dictionary
      AccumulatedParams;

/**
 * Flattens intersected types so `{a: string} & {b: number}` instead appears as `{a: string, b: number}`
 * to aid readability.
 */
export type Flatten<T> = T extends infer R extends Record<string, unknown> ? { [Prop in keyof R]: R[Prop] } : unknown;

/**
 * Derives route param names and types from a url with parameters formatted as `:paramName<paramType>`
 * @example
 * ```
 * type RouteParamsA = DeriveRouteParams<typeof routeA>;
 * ```
 */
export type DeriveRouteParams<RouteStringWithParams> = Flatten<_DeriveRouteParams<RouteStringWithParams>>;
