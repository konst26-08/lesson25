/**
 * Оборачивает async-обработчик Express: отклонённые промисы уходят в error middleware.
 */
export function asyncHandler(fn) {
  return function wrapped(request, response, next) {
    Promise.resolve(fn(request, response, next)).catch(next);
  };
}
