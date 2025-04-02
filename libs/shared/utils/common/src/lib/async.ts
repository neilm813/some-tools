/**
 * @param ms The amount of milliseconds before the returned promise will be resolved.
 * @returns A safe promise.
 */
export const sleep = (ms = 1000) => new Promise((resolve) => setTimeout(() => resolve(null), ms));
