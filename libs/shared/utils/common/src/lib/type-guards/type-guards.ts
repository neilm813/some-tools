/**
 * This is most useful as the first condition in a more specific type guard.
 * @example
 * ```
 * if (isNonNullObject(foo) && 'bar' in foo) {
 *   console.log(foo.bar);
 * }
 * ```
 */
export const isNonNullObject = (item: unknown): item is Record<string, unknown> =>
  typeof item === 'object' && item !== null;
