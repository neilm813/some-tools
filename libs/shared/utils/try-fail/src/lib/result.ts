/* eslint-disable @typescript-eslint/no-explicit-any */

import { AsyncReturnType } from '@some-tools/shared/types';

/**
 * Represents the successful result of an operation.
 */
export type Ok<T> = {
  isOk: true;
  value: T;
};

/**
 * Represents an unsuccessful result of an operation.
 */
export type Fail<F> = {
  isOk: false;
  /** The reason for the failure. */
  fault: F;
};

/**
 * Represents the result of an operation that may have succeeded or failed.
 * @template ValueT The success data type.
 * @template FaultT The error data type.
 */
export type Result<ValueT, FaultT> = Ok<ValueT> | Fail<FaultT>;
export type AnyResult = Result<any, any>;

export type ExtractOkT<ResultT> = ResultT extends Ok<infer ValueT> ? ValueT : never;
export type ExtractReturnOkT<FnT extends (...args: any[]) => Promise<Result<any, any>> | Result<any, any>> =
  FnT extends (...args: any[]) => Promise<any> ? ExtractOkT<AsyncReturnType<FnT>> : ExtractOkT<ReturnType<FnT>>;

export type ExtractFaultT<ResultT> = ResultT extends Fail<infer FaultT> ? FaultT : never;
export type ExtractReturnFaultT<FnT extends (...args: any[]) => Promise<Result<any, any>> | Result<any, any>> =
  FnT extends (...args: any[]) => Promise<any> ? ExtractFaultT<AsyncReturnType<FnT>> : ExtractFaultT<ReturnType<FnT>>;

/**
 * Creates an {@link Ok} to contain the data resulting from a successful operation.
 */
export const ok = <ValueT>(value: ValueT): Ok<ValueT> => ({ isOk: true, value });
export type MakeOk = typeof ok;

/**
 * Creates a {@link Fail} to contain the data resulting from an unsuccessful operation.
 */
export const fail = <FaultT = unknown>(fault: FaultT): Fail<FaultT> => ({ isOk: false, fault });
export type MakeFail = typeof fail;

export type ResultMaker = { ok: MakeOk; fail: MakeFail };
export const resultMaker: ResultMaker = { ok, fail };

/**
 * A type guard to check if a {@link Result} is a {@link Ok} variant.
 */
export const isOk = <ValueT, FaultT>(result: Result<ValueT, FaultT>): result is Ok<ValueT> => result.isOk === true;
export type IsOk = typeof isOk;

/**
 * A type guard to check if a {@link Result} is a {@link Fail} variant.
 */
export const isFail = <ValueT, FaultT>(result: Result<ValueT, FaultT>): result is Fail<FaultT> => result.isOk === false;
export type IsFail = typeof isFail;

/**
 * Transforms a {@link Result}'s {@link Ok.value} type to the type returned by the mapper callback.
 * * {@link Fail} {@link Result}'s are returned as is.
 * * Useful for when you want to map the value before checking if {@link isOk}.
 * @param result The {@link Result} to transform.
 * @param okMapper A callback that returns the transformed {@link Ok.value}.
 * @returns A new result with the {@link Ok.value} mapped to a new type.
 */
export const mapOk = <ValueT, FaultT, NewValueT>(
  result: Result<ValueT, FaultT>,
  okMapper: (value: ValueT) => NewValueT
): Result<NewValueT, FaultT> => (isOk(result) ? ok(okMapper(result.value)) : result);

/**
 * Transforms each {@link Ok.value} but {@link Fail}'s are left as is.
 * @param results Results to transform.
 * @param okMapper A callback that returns the transformed {@link Ok.value}.
 * @returns Results with only the ok values transformed.
 */
export const mapOkays = <ValueT, FaultT, NewValueT>(
  results: Result<ValueT, FaultT>[],
  okMapper: (value: ValueT) => NewValueT
): Result<NewValueT, FaultT>[] => results.map((result) => (isOk(result) ? ok(okMapper(result.value)) : result));

/**
 * Extracts the {@link Ok.value}'s from an array of {@link Result}'s.
 */
export const unwrapOks = <ValueT, FaultT>(results: Result<ValueT, FaultT>[]): ValueT[] =>
  results.filter((result): result is Ok<ValueT> => isOk(result)).map((okResult) => okResult.value);

/**
 * Returns the {@link Ok.value} from the given result or the provided default value if the result was a {@link Fail}.
 * @param result The result to get the {@link Ok.value} from.
 * @param defaultValue Default data to return if the result is a {@link Fail}.
 * @returns The ok value or the provided defaultValue.
 */
export const okOrDefault = <ValueT, FaultT, DefaultT>(result: Result<ValueT, FaultT>, defaultValue: DefaultT) =>
  isOk(result) ? result.value : defaultValue;

/**
 * Transforms a {@link Result}'s {@link Fail.fault} type to the type returned by the mapper callback.
 * * {@link Ok} {@link Result}s are returned as is.
 * * Useful for when you want to map the value before checking if {@link isFail}.
 * @param result The {@link Result} to transform.
 * @param failMapper A callback that returns the transformed {@link Fail.fault}.
 * @returns A new result with the {@link Fail.fault} mapped to a new type.
 */
export const mapFail = <ValueT, FaultT, NewFaultT>(
  result: Result<ValueT, FaultT>,
  failMapper: (fault: FaultT) => NewFaultT
): Result<ValueT, NewFaultT> => (isFail(result) ? fail(failMapper(result.fault)) : result);

/**
 * Transforms each {@link Fail.fault} but {@link Ok}'s are left as is.
 * @param results Results to transform.
 * @param okMapper A callback that returns the transformed {@link Ok.value}.
 * @returns Results with only the ok values transformed.
 */
export const mapFails = <ValueT, FaultT, NewFaultT>(
  results: Result<ValueT, FaultT>[],
  failMapper: (fault: FaultT) => NewFaultT
): Result<ValueT, NewFaultT>[] => results.map((result) => (isFail(result) ? fail(failMapper(result.fault)) : result));

/**
 * Extracts the {@link Fail.fault}'s from an array of {@link Result}'s.
 */
export const unwrapFails = <ValueT, FaultT>(results: Result<ValueT, FaultT>[]): FaultT[] =>
  results.filter((result): result is Fail<FaultT> => isFail(result)).map((failResult) => failResult.fault);

// TODO: mapResultAsync and mapResultsAsync
/**
 * Transforms both {@link Ok} and {@link Fail} cases in one expression without needing to check if {@link isOk}.
 * * Equivalent to running {@link mapOk} and then {@link mapFail}.
 * @param result The result to transform.
 * @param okMapper Handles transforming {@link Ok.value} data.
 * @param failMapper Handles transforming {@link Fail.fault} data.
 * @returns The result with new types for both cases.
 */
export const mapResult = <ValueT, FaultT, NewValueT, NewFaultT>(
  result: Result<ValueT, FaultT>,
  mappers: {
    ifOk: (value: ValueT) => NewValueT;
    ifFail: (fault: FaultT) => NewFaultT;
  }
): Result<NewValueT, NewFaultT> => (isOk(result) ? ok(mappers.ifOk(result.value)) : fail(mappers.ifFail(result.fault)));

/**
 * Transforms both {@link Ok} and {@link Fail} cases for an array of results in one expression.
 * * Equivalent to `results.map((result) => mapResult(result, okMapper, failMapper));`
 * @param results The results to map.
 * @param okMapper Handles transforming {@link Ok.value} data.
 * @param failMapper Handles transforming {@link Fail.fault} data.
 * @returns Results with new types for both cases.
 */
export const mapResults = <ValueT, FaultT, NewValueT, NewFaultT>(
  results: Result<ValueT, FaultT>[],
  mappers: {
    ifOk: (value: ValueT) => NewValueT;
    ifFail: (fault: FaultT) => NewFaultT;
  }
): Result<NewValueT, NewFaultT>[] => results.map((result) => mapResult(result, mappers));

/**
 * Combines {@link mapOk} and {@link mapFail} then unwraps the result.
 */
export const unwrapMapResult = <ValueT, FaultT, NewValueT, NewFaultT>(
  result: Result<ValueT, FaultT>,
  mappers: {
    ifOk: (value: ValueT) => NewValueT;
    ifFail: (fault: FaultT) => NewFaultT;
  }
) => (isOk(result) ? mappers.ifOk(result.value) : mappers.ifFail(result.fault));

type MorphResultMappers<ValueT = never, FaultT = never> = {
  ifOk?: (value: ValueT) => AnyResult;
  ifFail?: (fault: FaultT) => AnyResult;
};

type ExtractMorphedResults<ValueT, FaultT, Mappers extends MorphResultMappers<ValueT, FaultT>> = {
  [k in keyof MorphResultMappers]: Mappers[k] extends (value: never) => infer RetT
    ? RetT
    : k extends 'ifOk'
    ? Ok<ValueT>
    : Fail<FaultT>;
}[keyof MorphResultMappers];

/**
 * Morphs a result into a new result with flexibility so that `ok`'s can be turned into `fails` and vice versa.
 * @param result The result to morph.
 * @param mappers Callbacks to morph an `ok` to a new result and / or a `fail` to a new result.
 * @returns A result that is a merging of the two returned results from the `ifOk` and `ifFail` callbacks.
 */
export const morphResult = <ValueT, FaultT, Mappers extends MorphResultMappers<ValueT, FaultT>>(
  result: Result<ValueT, FaultT>,
  mappers: Mappers
): Result<
  ExtractOkT<ExtractMorphedResults<ValueT, FaultT, Mappers>>,
  ExtractFaultT<ExtractMorphedResults<ValueT, FaultT, Mappers>>
> => {
  if (isOk(result)) {
    return mappers.ifOk?.(result.value) ?? result;
  }
  return mappers.ifFail?.(result.fault) ?? result;
};

// TODO: morphResultAsync with mappers allowing async callbacks
// const x: Result<null | number, boolean> = Math.random() < 0.5 ? (Math.random() < 0.5 ? ok(1) : ok(null)) : fail(true);
// const y = morphResult(x, {
//   ifOk: (value) => (value === null ? fail('') : ok(value)),
// });

/**
 * A type guard to verify if data is a result and to also verify with the passed-in type guards the types inside the
 * result.
 * * Useful for verifying if api response data is a result.
 * @example
 * ```
 * if (isResult(data, isUser, isNotFoundError)) {
 *  // data is now detected as: Result<User, NotFoundError>
 *    if (isOk(data)) { console.log(data.value); }
 * }
 * ```
 * @param data The possible {@link Result} data.
 * @param valueTypeGuard A type guard to verify {@link Ok.value} type if the result is ok.
 * @param faultTypeGuard A type guard to verify {@link Fail.fault} type if the result is fail.
 */
export const isResult = <ValueT, FaultT>(
  data: unknown,
  valueTypeGuard: (value: unknown) => value is ValueT,
  faultTypeGuard: (fault: unknown) => fault is FaultT
): data is Result<ValueT, FaultT> => {
  if (typeof data !== 'object' || data === null) {
    return false;
  }

  const result = data as Result<ValueT, FaultT>;

  if ('isOk' in result) {
    return result.isOk
      ? 'value' in result && valueTypeGuard(result.value)
      : 'fault' in result && faultTypeGuard(result.fault);
  }

  return false;
};

export type ResultsStats = { failed: number; ok: number; total: number };
export type ResultsWithStats<ResultT extends Result<unknown, unknown>> = {
  results: ResultT[];
  stats: ResultsStats;
};

export const createResultsStats = <ValueT, FaultT>(results: Result<ValueT, FaultT>[]): ResultsStats =>
  results.reduce(
    (stats, result) => (isOk(result) ? { ...stats, ok: stats.ok + 1 } : { ...stats, failed: stats.failed + 1 }),
    { failed: 0, ok: 0, total: results.length }
  );

// TODO: Result<ValueT, FaultT> doesn't allow passing in Ok<T> | Fail<T>

export const createResultsWithStats = <ValueT, FaultT>(
  results: Result<ValueT, FaultT>[]
): ResultsWithStats<Result<ValueT, FaultT>> => ({
  results,
  stats: createResultsStats(results),
});
