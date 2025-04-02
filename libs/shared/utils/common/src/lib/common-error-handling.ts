import axios, { AxiosError } from 'axios';
import { type Request } from 'express';

import { MapValueTypes, SHARED_TYPE_NAMES, SharedTypeNames } from '@some-tools/shared/types';

import { isNonNullObject } from './type-guards';

export const SHARED_FAULT_CODES = {
  UNIDENTIFIED_FAULT: 'UNIDENTIFIED_FAULT',
  NO_RESPONSE: 'NO_RESPONSE',
} as const;

export type SharedFaultCodes = typeof SHARED_FAULT_CODES;

/**
 * A fault is a known error that shouldn't be thrown because in a `.catch` the type is unknown.
 */
export interface CodedFault {
  message: string;
  payload?: Record<string, unknown>;
  _code: string;
  _type: SharedTypeNames['CODED_FAULT'];
}

export interface CodedHttpFault extends CodedFault {
  /** The http status code to be used in `res.status` */
  httpStatus: number;
}

const isCodedError = (error: unknown): error is CodedFault =>
  isNonNullObject(error) && '_type' in error && error['_type'] === SHARED_TYPE_NAMES.CODED_FAULT;

/**
 * Used as a default error for both http and non-http errors that haven't been identified yet with their own types.
 * Whenever an unidentified error is seen, it should be investigated and identified with it's own type for clarity.
 *
 * The most specific message found is used to increase the chance that it's relevant in the case that a more specific
 * error hasn't been typed yet.
 *
 * Conditional logic can be done on the `_code` or the `cause` can be used to map the error to specific coded error.
 */
export interface UnidentifiedFault extends CodedHttpFault {
  /**
   * This is one of the following:
   * * `AxiosError.response.data.message` if exists.
   * * `Error.message` if `instanceof Error`. This could be the top-level `AxiosError.message` if no `response`.
   * * If non of the above: a generic 'Unexpected error' fallback message.
   */
  message: string;
  /**
   * The original error if it was an `Error` instance. This could be an axios `Error`.
   * * Wont exist if `UnidentifiedError` is passed as JSON.
   */
  cause?: Error;
  /**
   * If it was an axios error this is the same as `cause` but narrowed to `AxiosError`.
   * If there is a `.response` the `.data` could contain another UnidentifiedError if sent through `res.json`.
   * * Wont exist if `UnidentifiedError` is passed as JSON.
   */
  axiosCause?: AxiosError;
  /**The original error if **not** an error instance.
   * * Wont exist if `UnidentifiedError` is passed as JSON.
   */
  unknownCause?: unknown;
  /**
   * * UnidentifiedError may **not** be an http error. This exists in case it's used in an http response
   */
  httpStatus: 500;
  /** Stack trace if available and if environment is dev. */
  stack?: string;
  _code: SharedFaultCodes['UNIDENTIFIED_FAULT'];
  /**
   * Auto-called when `JSON.stringify` is used or `res.json` in express.
   * The `cause` and `axiosCause` are removed during `JSON.stringify` because they would no longer be error instances
   * and because `Error` instances become an empty object when stringified.
   */
  toJSON?: () => UnidentifiedFault;
}

export const isUnidentifiedFault = (error: unknown): error is UnidentifiedFault =>
  isCodedError(error) && '_code' in error && error['_code'] === SHARED_FAULT_CODES.UNIDENTIFIED_FAULT;

/**
 * Converts an unknown error into a default {@link UnidentifiedFault} that's easier to work with.
 * If the passed in error is not an `instanceof Error`, a default error message will be used.
 */
export const makeUnidentifiedFault = (error: unknown = undefined): UnidentifiedFault => {
  if (isUnidentifiedFault(error)) {
    return error;
  }

  const unidentifiedError: UnidentifiedFault = {
    message: 'There was an unexpected error.',
    httpStatus: 500,
    _type: SHARED_TYPE_NAMES.CODED_FAULT,
    _code: SHARED_FAULT_CODES.UNIDENTIFIED_FAULT,
    toJSON() {
      const { message, _type, _code, httpStatus, stack } = this;
      return { message, _type, _code, httpStatus, ...(stack && { stack }) };
    },
  };

  if (error instanceof Error) {
    unidentifiedError.cause = error;
    unidentifiedError.message = error.message;

    if (error.stack && process.env['NODE_ENV'] === 'development') {
      unidentifiedError.stack = error.stack;
    }

    // If it was an axios error the message above is the top-level axios error message
    if (axios.isAxiosError(error)) {
      unidentifiedError.axiosCause = error;

      const resData = error.response?.data;
      if (isNonNullObject(resData) && 'message' in resData && typeof resData['message'] === 'string') {
        unidentifiedError.message = resData['message'];
      }
    }
    return unidentifiedError;
  }

  unidentifiedError.unknownCause = error;
  return unidentifiedError;
};

export interface NoResponseFault extends CodedHttpFault {
  _code: SharedFaultCodes['NO_RESPONSE'];
  message: 'The server was unresponsive, please try again.';
  httpStatus: 504;
}

/**
 * With axios, this happens when `AxiosError` has no `response` key.
 */
export const makeNoResponseFault = (): NoResponseFault => ({
  _type: SHARED_TYPE_NAMES.CODED_FAULT,
  _code: SHARED_FAULT_CODES.NO_RESPONSE,
  message: 'The server was unresponsive, please try again.',
  httpStatus: 504,
});

/**
 * Takes an `AxiosError` that should be from an internal api call and casts the `response.data` to the coded error
 * types that should have been enforced in the back-end.
 * * For use with internal apis only.
 * that could error.
 * @template CodedApiFaults The coded error types that were enforced in the back-end for the requested route.
 * @param error The type is `unknown` for convenience so the caller doesn't have to constantly check `isAxiosError`.
 * @returns If the given error wasn't an `AxiosError` or an `UnidentifiedError` with an `.axiosCause` then an
 *    `UnidentifiedError` is returned.
 * @example
 * ```
 * const result = tryFailAsync(async () => {
 *   const response = await axios.get('/foo');
 *   return response.data;
 * }, axiosErrorResBodyToCodedErrors<TheRouteInfo['api']['error']>)
 * ```
 */
export const axiosErrorResBodyToCodedFault = <CodedApiFaultT extends CodedFault = UnidentifiedFault>(
  error: unknown
): CodedApiFaultT | NoResponseFault | UnidentifiedFault => {
  let axiosError: AxiosError | undefined = undefined;

  if (axios.isAxiosError(error)) {
    axiosError = error;
  }

  if (isUnidentifiedFault(error) && error.axiosCause) {
    axiosError = error.axiosCause;
  }

  if (axiosError) {
    if (axiosError.response) {
      const resBody = axiosError.response.data;

      // This should always be true if `CodedApiErrors` were the types enforced in the back-end.
      if (isCodedError(resBody)) {
        return resBody as CodedApiFaultT;
      } else {
        return makeUnidentifiedFault(error);
      }
    } else {
      return makeNoResponseFault();
    }
  }
  return makeUnidentifiedFault(error);
};

/**
 * @param genericUnknownErrorMessage A message to use if the error was not a string, Error, or object with a message key
 * @returns
 */
export const messageFromError = (
  error: unknown,
  stringifyNonError = false,
  genericUnknownErrorMessage = 'There was an unexpected error'
): string => {
  if (typeof error === 'string') {
    return error;
  }

  if (axios.isAxiosError(error)) {
    const resData = error.response?.data;
    if (isNonNullObject(resData) && 'message' in resData && typeof resData['message'] === 'string') {
      return resData['message'];
    }
    return error.message;
  }

  if (isNonNullObject(error) && 'message' in error && typeof error['message'] === 'string') {
    return error['message'];
  }

  if (!stringifyNonError) {
    return genericUnknownErrorMessage;
  }

  try {
    return `${genericUnknownErrorMessage}: ${JSON.stringify(error)}`;
  } catch {
    return `${genericUnknownErrorMessage}: ${String(error)}`;
  }
};

export const toValidHttpStatusRange = (num: unknown, fallbackStatusCode = 500) => {
  let code = fallbackStatusCode;

  if (typeof num === 'string') {
    const parsed = parseInt(num);

    if (isNaN(parsed) === false) {
      code = parsed;
    }
  } else if (typeof num === 'number') {
    code = num;
  }

  if (code >= 100 && code <= 599) {
    return code;
  }

  return fallbackStatusCode >= 100 && fallbackStatusCode <= 599 ? fallbackStatusCode : 500;
};

/**
 * Helpful when recreating errors and wanting to copy the http code from the original error without having to first
 * type-narrow the error.
 */
export const httpStatusFromErrorOrResponse = (error: unknown, fallbackStatusCode = 500): number => {
  if (axios.isAxiosError(error) && error.response) {
    return error.response.status;
  }

  if (isNonNullObject(error)) {
    // Used internally
    if ('httpStatus' in error) {
      return toValidHttpStatusRange(error['httpStatus']);
    }

    // fetch api
    if ('status' in error) {
      return toValidHttpStatusRange(error['status']);
    }

    // node http lib
    if ('statusCode' in error) {
      return toValidHttpStatusRange(error['statusCode']);
    }

    // node request lib
    if ('code' in error) {
      return toValidHttpStatusRange(error['code']);
    }
  }

  return toValidHttpStatusRange(fallbackStatusCode);
};

export const unknownErrorToError = (unknownError: unknown) =>
  unknownError instanceof Error ? unknownError : new Error(messageFromError(unknownError));

/**
 * Organizes types together that need to be used together.
 * An api app uses these to enforce types in the api so the data-access lib for that api can use these same types.
 * @template UrlParamsT The url parameter dictionary before the parameters have been stringified.
 * @template ReqBodyT The type of the **request** body for POST, PUT, etc. HTTP methods.
 * @template OkDataT The successful **response** body data.
 * @template ErrDataT The types of errors that could be in the **response** body.
 * @template OkErrorT Used for when the ok response
 */
export type RouteInfo<
  UrlParamsT extends Record<string, string | number | boolean> = Record<string, never>,
  ReqBodyT = unknown,
  OkDataT = unknown,
  ErrDataT = never
> = {
  req: {
    /** Url params may be other primitives before inserted into the url. */
    params: UrlParamsT;
    /**
     * Technically unknown since there's no guarantee the consumer of the endpoint used the right types or passed in
     * any data at all--requires server-side validation.
     *
     * The api project lets database validations handle most errors for convenience for now and a catch-all error
     * handler for the rest so if this is unknown it will be caught so it's fine for now.
     */
    body: ReqBodyT;
  };
  api: {
    /** Url params have becomes strings via insertion into the url. */
    params: MapValueTypes<UrlParamsT, string>;
    body: ReqBodyT;
    ok: OkDataT;
    error: ErrDataT | NoResponseFault | UnidentifiedFault;
    /** Data that the api can `res.json`. */
    resBody: OkDataT | ErrDataT | NoResponseFault | UnidentifiedFault;
  };
};

/**
 * Maps {@link RouteInfo} types onto the server libs {@link Request} type.
 */
export type RouteInfoToLibRequest<
  T extends RouteInfo<Record<string, string | number | boolean>, unknown, unknown, unknown>
> = Request<T['api']['params'], T['api']['resBody'], T['req']['body'], never>;
