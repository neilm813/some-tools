import type { AnyObject } from '@some-tools/shared/types';
import type { CodedHttpFault } from '@some-tools/shared/utils/common';

export const SHARED_DB_FAULT_CODES = {
  DB_INVALID_MODEL: 'DB_INVALID_MODEL',
  DB_CREATE_ONE_FAILED: 'DB_CREATE_ONE_FAILED',
  DB_DELETE_ONE_FAILED: 'DB_DELETE_ONE_FAILED',
  DB_UPDATE_ONE_FAILED: 'DB_UPDATE_ONE_FAILED',
  DB_FIND_MANY_FAILED: 'DB_FIND_MANY_FAILED',
  DB_FIND_ONE_FAILED: 'DB_FIND_ONE_FAILED',
  DB_RECORD_NOT_FOUND: 'DB_RECORD_NOT_FOUND',
} as const;

export type SharedDbFaultCodes = typeof SHARED_DB_FAULT_CODES;

/**
 * The 'failed' fault naming convention is used as the least specific but still readable error for errors that haven't
 * been more specifically typed yet.
 */
export interface DbOperationFailedFault extends CodedHttpFault {
  /**
   * The original error message.
   */
  cause: string;
}

export interface MongooseDuplicateKeyErrorClone extends Error {
  name: 'MongoServerError';
  code: 11000;
  keyValue: object;
}

// TODO: Rename to DbRecordNotFoundFault and add it to each DbXOneFault?
export interface RecordNotFoundFault extends CodedHttpFault {
  _code: SharedDbFaultCodes['DB_RECORD_NOT_FOUND'];
  message: string;
  httpStatus: 404;
}

export type NormalizedModelFieldFault = {
  /** The model field name that has an error. */
  field: string;
  /** The error message for this individual field error. */
  message: string;
  /** The value given by the client. */
  givenValue?: unknown;
};

/**
 * @template DocT The DB model's document interface. These should be the fields without hydrated db keys.
 */
export interface DbInvalidModelFault<DocT extends AnyObject> extends CodedHttpFault {
  _code: SharedDbFaultCodes['DB_INVALID_MODEL'];
  errors: {
    [K in keyof DocT]?: NormalizedModelFieldFault;
  };
}
export interface DbCreateOneFailedFault extends CodedHttpFault {
  _code: SharedDbFaultCodes['DB_CREATE_ONE_FAILED'];
  message: 'The database failed to create the requested record.';
  cause: string;
}

export type DbCreateOneFault<DocT extends AnyObject> = DbInvalidModelFault<DocT> | DbCreateOneFailedFault;

export interface DbFindManyFailedFault extends DbOperationFailedFault {
  _code: SharedDbFaultCodes['DB_FIND_MANY_FAILED'];
  message: 'The database failed when finding requested records.';
}

export type DbFindManyFault = DbFindManyFailedFault; /* | MoreFaultsTBD */

export interface DbFindOneFailedFault extends DbOperationFailedFault {
  _code: SharedDbFaultCodes['DB_FIND_ONE_FAILED'];
  message: 'The database failed when finding the requested record.';
}

export type DbFindOneFault = DbFindOneFailedFault /* | MoreFaultsTBD */;

export interface DbUpdateOneFailedFault extends DbOperationFailedFault {
  _code: SharedDbFaultCodes['DB_UPDATE_ONE_FAILED'];
  message: 'The database failed when updating the requested record.';
}
export type DbUpdateOneFault<DocT extends AnyObject> = DbInvalidModelFault<DocT> | DbUpdateOneFailedFault;

export interface DbDeleteOneFailedFault extends DbOperationFailedFault {
  _code: SharedDbFaultCodes['DB_DELETE_ONE_FAILED'];
  message: 'The database failed when deleting the requested record.';
}
export type DbDeleteOneFault = DbDeleteOneFailedFault | DbFindOneFault;
