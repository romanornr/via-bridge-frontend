/**
 * Standard error name for abort errors.
 * 
 * @constant {string}
 */
export const ABORT_ERROR_NAME = "AbortError";

/**
 * Creates a standardized AbortError with a custom message.
 * 
 * Creates an Error with the name set to "AbortError" for consistent error identification.
 * 
 * @param {string} [message="Operation aborted"] - The error message to use. Defaults to "Operation aborted".
 * @returns {Error} An Error object with name set to "AbortError".
 * 
 * @example
 * // Create an abort error with a custom message
 * const error = createAbortError("User cancelled the transaction");
 */
export function createAbortError(message = "Operation aborted"): Error {
  const err = new Error(message);
  err.name = ABORT_ERROR_NAME;
  return err as Error;
}

/**
 * Type guard that checks if an error is an AbortError.
 * 
 * Safely checks the error's name property with null/type validation.
 * Acts as a TypeScript type guard, narrowing the type to Error when true.
 * 
 * @param {unknown} e - The value to check. Can be any type.
 * @returns {boolean} True if the value is an Error with name "AbortError", false otherwise.
 * 
 * @example
 * function handleError(error: unknown) {
 *   if (isAbortError(error)) {
 *     console.log(error.message);
 *   }
 * }
 */
export function isAbortError(e: unknown): e is Error {
  if (e == null || typeof e !== "object") return false;
  const anyErr = e as { name?: unknown };
  return anyErr.name === ABORT_ERROR_NAME;
}

/**
 * Wraps a Promise to make it abortable using an AbortSignal.
 * 
 * When aborted, rejects with the signal's reason or a default AbortError.
 * Event listeners are automatically cleaned up to prevent memory leaks.
 * If no signal is provided, returns the original promise unchanged.
 * 
 * @template T - The type of value the promise resolves to.
 * @param {Promise<T>} promise - The promise to make abortable.
 * @param {AbortSignal} [signal] - Optional AbortSignal to control cancellation.
 * @returns {Promise<T>} A new promise that can be aborted via the signal.
 * 
 * @example
 * // Basic usage with AbortController
 * const controller = new AbortController();
 * const promise = abortablePromise(
 *   fetch('/api/data'),
 *   controller.signal
 * );
 * 
 * // Cancel the operation
 * controller.abort();
 * 
 * @example
 * // Handle abort in async function
 * async function loadData(signal?: AbortSignal) {
 *   try {
 *     const data = await abortablePromise(
 *       fetchDataFromAPI(),
 *       signal
 *     );
 *     return data;
 *   } catch (error) {
 *     if (isAbortError(error)) {
 *       console.log("Data loading was cancelled");
 *     } else {
 *       throw error;
 *     }
 *   }
 * }
 * 
 * @example
 * // Use with timeout
 * const controller = new AbortController();
 * setTimeout(() => controller.abort(), 5000);
 * 
 * const result = await abortablePromise(
 *   longRunningOperation(),
 *   controller.signal
 * );
 */
export function abortablePromise<T>(promise: Promise<T>, signal?: AbortSignal) : Promise<T> {
  if (!signal) return promise;

  return new Promise<T>((resolve, reject) => {
    const rejectWithReason = () =>
      reject((signal as any).reason ?? createAbortError());

    if (signal.aborted) {
      rejectWithReason();
      return;
    }
    const onAbort = () => rejectWithReason();
    signal.addEventListener("abort", onAbort, { once: true });

    promise.then(resolve, reject).finally(() => {
      signal.removeEventListener("abort", onAbort);
    });
  });
}

/**
 * Wraps a Promise with timeout functionality, rejecting if it doesn't complete within the specified time.
 * 
 * Note: This doesn't cancel the underlying operation, only stops waiting for it.
 * For cancellable operations, consider combining with `abortablePromise()`.
 * 
 * @template T - The type of value the promise resolves to.
 * @param {Promise<T>} p - The promise to wrap with timeout functionality.
 * @param {number} ms - The timeout duration in milliseconds.
 * @param {string} msg - The error message to use when the timeout occurs.
 * @returns {Promise<T>} A new promise that resolves/rejects with the original promise, or rejects on timeout.
 * 
 * @example
 * // Timeout for a fetch request
 * const data = await withTimeout(
 *   fetch('/api/data').then(r => r.json()),
 *   5000,
 *   'Request timed out after 5 seconds'
 * );
 * 
 * @example
 * // Combine with abortablePromise for cancellable timeout
 * const controller = new AbortController();
 * const promise = withTimeout(
 *   abortablePromise(fetch('/api/data'), controller.signal),
 *   5000,
 *   'Operation timed out'
 * );
 */
export function withTimeout<T>(p: Promise<T>, ms: number, msg: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(msg)), ms);
    p.finally(() => clearTimeout(t)).then(resolve, reject);
  });
}
