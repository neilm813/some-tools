/*
Most of the known errors currently are only validation errors so for now most operations only result in an
generic 'failed' error being created. As more error types become known we should make our own types for them.
*/

import { Error as MongooseError } from 'mongoose';

import { type AnyObject, SHARED_TYPE_NAMES } from '@some-tools/shared/types';
import type {
  DbCreateOneFailedFault,
  DbCreateOneFault,
  DbDeleteOneFailedFault,
  DbDeleteOneFault,
  DbFindManyFailedFault,
  DbFindManyFault,
  DbFindOneFailedFault,
  DbFindOneFault,
  DbInvalidModelFault,
  DbUpdateOneFailedFault,
  DbUpdateOneFault,
  MongooseDuplicateKeyErrorClone,
  NormalizedModelFieldFault,
  RecordNotFoundFault,
} from '@some-tools/shared/utils/backend/types';
import { SHARED_DB_FAULT_CODES } from '@some-tools/shared/utils/backend/types';
import { isNonNullObject, messageFromError } from '@some-tools/shared/utils/common';
import { fail, morphResult, ok, type Result } from '@some-tools/shared/utils/try-fail';

export const makeRecordNotFoundFault = (): RecordNotFoundFault => ({
  _code: SHARED_DB_FAULT_CODES.DB_RECORD_NOT_FOUND,
  _type: SHARED_TYPE_NAMES.CODED_FAULT,
  message: `The requested record was not found`,
  httpStatus: 404,
});

export const isMongooseDuplicateKeyError = (error: unknown): error is MongooseDuplicateKeyErrorClone =>
  error instanceof Error &&
  'code' in error &&
  error['code'] === 11000 &&
  error.name === 'MongoServerError' &&
  'keyValue' in error &&
  isNonNullObject(error['keyValue']);

const makeNormalizedFieldFault = (field: string, message: string, givenValue: unknown): NormalizedModelFieldFault => ({
  field,
  message,
  givenValue,
});

/**
 * Normalizes a mongoose error structure into our own structure so if the DB or ORM changes we only need to update this
 * logic to keep the same error structure so the consumers of the api don't need to change.
 */
export const makeInvalidModelFaultFromMongooseValidationError = <DocT extends AnyObject = never>(
  error: MongooseError.ValidationError
): DbInvalidModelFault<DocT> => {
  const normalizedFaults = Object.entries(error.errors).reduce<DbInvalidModelFault<DocT>['errors']>(
    (payload, [modelField, fieldError]) => {
      if (fieldError.name === 'CastError') {
        return {
          ...payload,
          [modelField]: makeNormalizedFieldFault(modelField, 'invalid format', fieldError.value),
        };
      }

      // Mongoose validation error
      return {
        ...payload,
        [modelField]: makeNormalizedFieldFault(modelField, fieldError.properties.message, fieldError.value),
      };
    },
    {}
  );

  const errorMessages: string[] = [];

  // Avoid Object.entries due to unknown value
  for (const key in normalizedFaults) {
    const normalizedFieldError = normalizedFaults[key];

    if (normalizedFieldError) {
      errorMessages.push(`${normalizedFieldError.field}: ${normalizedFieldError.message}`);
    }
  }

  return {
    _code: SHARED_DB_FAULT_CODES.DB_INVALID_MODEL,
    _type: SHARED_TYPE_NAMES.CODED_FAULT,
    httpStatus: 400,
    message: `Validation failed - ${errorMessages.join(', ')}.`,
    errors: normalizedFaults,
  };
};

const makeInvalidModelFaultFromMongooseDuplicateKeyError = <DocT extends AnyObject = never>(
  error: MongooseDuplicateKeyErrorClone
): DbInvalidModelFault<DocT> => {
  /*
  Example of the error. Mongoose doesn't seem to export this type so we can't `instanceof` it.

    {
      name: 'MongoServerError',
      message: 'E11000 duplicate key error collection: some-discord.servermembers index: email_1 dup key: { email: "tools@test.com" }',
      index: 0,
      code: 11000,
      keyPattern: { email: 1 },
      keyValue: { email: 'tools@test.com' },
    }
  */

  return {
    _type: SHARED_TYPE_NAMES.CODED_FAULT,
    _code: SHARED_DB_FAULT_CODES.DB_INVALID_MODEL,
    httpStatus: 400,
    message: `Validation failed, unique values required - ${Object.entries(error.keyValue)
      .map(([modelField, nonUniqueValue]) => `${modelField}: ${nonUniqueValue}`)
      .join(', ')}`,
    errors: Object.entries(error.keyValue).reduce<DbInvalidModelFault<DocT>['errors']>(
      (payload, [modelField, nonUniqueValue]) => ({
        ...payload,
        [modelField]: makeNormalizedFieldFault(modelField, 'must be unique', nonUniqueValue),
      }),
      {}
    ),
  };
};

export const makeDbCreateOneFailedFault = (error: unknown): DbCreateOneFailedFault => ({
  _type: SHARED_TYPE_NAMES.CODED_FAULT,
  _code: SHARED_DB_FAULT_CODES.DB_CREATE_ONE_FAILED,
  message: 'The database failed to create the requested record.',
  cause: messageFromError(error),
  httpStatus: 500,
});

/**
 * Normalizes the error structures into a consistent form so the error structure stays the same regardless of which db
 * is used.
 */
export const mapDbCreateOneFaults = <DocT extends AnyObject>(error: unknown): DbCreateOneFault<DocT> => {
  if (error instanceof MongooseError.ValidationError) {
    return makeInvalidModelFaultFromMongooseValidationError<DocT>(error);
  }

  if (isMongooseDuplicateKeyError(error)) {
    return makeInvalidModelFaultFromMongooseDuplicateKeyError<DocT>(error);
  }

  return makeDbCreateOneFailedFault(error);
};

export const makeDbFindManyFailedFault = (error: unknown): DbFindManyFailedFault => ({
  _type: SHARED_TYPE_NAMES.CODED_FAULT,
  _code: SHARED_DB_FAULT_CODES.DB_FIND_MANY_FAILED,
  message: 'The database failed when finding requested records.',
  cause: messageFromError(error),
  httpStatus: 500,
});

export const mapDbFindManyFaults = (error: unknown): DbFindManyFault => {
  // if... return makeSomeFault
  return makeDbFindManyFailedFault(error);
};

export const makeDbFindOneFailedFault = (error: unknown): DbFindOneFailedFault => ({
  _type: SHARED_TYPE_NAMES.CODED_FAULT,
  _code: SHARED_DB_FAULT_CODES.DB_FIND_ONE_FAILED,
  message: 'The database failed when finding the requested record.',
  cause: messageFromError(error),
  httpStatus: 500,
});

export const mapDbFindOneFaults = (error: unknown): DbFindOneFault => {
  // if... return makeSomeFault
  return makeDbFindOneFailedFault(error);
};

export const makeDbUpdateOneFailedFault = (error: unknown): DbUpdateOneFailedFault => ({
  _type: SHARED_TYPE_NAMES.CODED_FAULT,
  _code: SHARED_DB_FAULT_CODES.DB_UPDATE_ONE_FAILED,
  message: 'The database failed when updating the requested record.',
  cause: messageFromError(error),
  httpStatus: 500,
});

export const mapDbUpdateOneFaults = <DocT extends AnyObject>(error: unknown): DbUpdateOneFault<DocT> => {
  if (error instanceof MongooseError.ValidationError) {
    return makeInvalidModelFaultFromMongooseValidationError<DocT>(error);
  }

  if (isMongooseDuplicateKeyError(error)) {
    return makeInvalidModelFaultFromMongooseDuplicateKeyError<DocT>(error);
  }

  return makeDbUpdateOneFailedFault(error);
};

export const makeDbDeleteOneFailedFault = (error: unknown): DbDeleteOneFailedFault => ({
  _type: SHARED_TYPE_NAMES.CODED_FAULT,
  _code: SHARED_DB_FAULT_CODES.DB_DELETE_ONE_FAILED,
  message: 'The database failed when deleting the requested record.',
  cause: messageFromError(error),
  httpStatus: 500,
});

export const mapDbDeleteOneFault = (error: unknown): DbDeleteOneFault => {
  // if... return makeSomeFault
  return makeDbDeleteOneFailedFault(error);
};

export const mapNullOkToNotFound = <ValueT, FaultT>(result: Result<ValueT, FaultT>) =>
  morphResult(result, {
    ifOk: (value) => (value === null ? fail(makeRecordNotFoundFault()) : ok(value)),
  });
