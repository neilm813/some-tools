/* eslint-disable @typescript-eslint/no-explicit-any */

import { AsyncReturnType } from '@some-tools/shared/types';

import { fail, ok, type Result } from './result';

// Overloading makes it easier to use `ReturnType` on the optional 2nd callback.
interface OverloadedTryResult {
  /**
   * @param fn A callback to wrap logic that may throw.
   */
  <Fn extends () => any>(fn: Fn): Result<ReturnType<Fn>, unknown>;
  /**
   * @param fn A callback to wrap logic that may throw.
   * @param errorMapper A callback to receive and transform any caught error from {@link fn} into a known error type.
   */
  <Fn extends () => any, MapErrFn extends (error: unknown) => any>(fn: Fn, errorMapper: MapErrFn): Result<
    ReturnType<Fn>,
    ReturnType<MapErrFn>
  >;
}

/**
 * Wraps a maybe error throwing `async` callback in a try catch to return a {@link Result} of the {@link ok} or
 * {@link fail} data.
 *
 * @example
 * ```ts
 * const result = tryFail(() => {
 *   return mightThrow();
 * }, makeUnidentifiedFault);
 * ```
 *
 * @example
 * ```ts
 * const result = await tryFailAsync(async () => {
 *   return mightThrow();
 * }, (error) => {
 *  if (error instanceof SomeError) {
 *    if (error.code === 1024) {
 *      return makeMoreDescriptiveFault();
 *    }
 *  }
 *  return makeUnidentifiedFault(error);
 * });
 */
export const tryFail: OverloadedTryResult = (
  fn: () => any,
  errorMapper?: (error: unknown) => any
): Result<any, any> => {
  try {
    return ok(fn());
  } catch (error) {
    return fail(errorMapper ? errorMapper(error) : error);
  }
};

// Overloading makes it easier to use `ReturnType` on the optional 2nd callback.
interface OverloadedTryResultAsync {
  /**
   * @param fn A callback to wrap logic that may throw.
   *    ! **WARNING**: async functions called inside must use `await`, `return` the promise, or `.catch` if not wanting to
   *    `await` to avoid an unhandled promise rejection error.
   */
  <Fn extends () => Promise<any>>(fn: Fn): Promise<Result<AsyncReturnType<Fn>, unknown>>;
  /**
   * @param fn A callback to wrap logic that may throw.
   *    ! **WARNING**: async functions called inside must use `await`, `return` the promise, or `.catch` if not wanting to
   *    `await` to avoid an unhandled promise rejection error.
   * @param errorMapper A callback to receive and transform any caught error from {@link fn} into a known error type.
   */
  <Fn extends () => Promise<any>, MapErrFn extends (error: unknown) => any>(fn: Fn, errorMapper: MapErrFn): Promise<
    Result<AsyncReturnType<Fn>, ReturnType<MapErrFn>>
  >;
}

/**
 * Wraps a maybe error throwing `async` callback in a try catch to return a safe `Promise` that resolves to a
 * {@link Result} of the {@link ok} or {@link fail} data.
 *
 * @example
 * ```ts
 * const result = await tryFailAsync(async () => {
 *   // async calls must use await, have their promise returned, or .catch if neither to avoid unhandled promise rejection.
 *   const x = await mightThrow1();
 *   return mightThrow2(x);
 * }, makeUnidentifiedFault);
 * ```
 *
 * @example
 * ```ts
 * const result = await tryFailAsync(async () => {
 *   return mightThrow();
 * }, (error) => {
 *  if (error instanceof SomeError) {
 *    if (error.code === 1024) {
 *      return makeMoreDescriptiveFault();
 *    }
 *  }
 *  return makeUnidentifiedFault(error);
 * });
 * ```
 */
export const tryFailAsync: OverloadedTryResultAsync = async (
  fn: () => Promise<any>,
  errorMapper?: (error: unknown) => any
): Promise<Result<any, any>> => {
  try {
    const okData = await fn();
    return ok(okData);
  } catch (error) {
    return fail(errorMapper ? errorMapper(error) : error);
  }
};
