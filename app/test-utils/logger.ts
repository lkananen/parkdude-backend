const errorLogger = console.error;

/**
 * Some tests may test error paths, which can give
 * distracting error logs.
 * This function can be used to disable those temporarily.
 */
export function disableErrorLogs() {
  console.error = () => {};
}

export function enableErrorLogs() {
  console.error = errorLogger;
}
