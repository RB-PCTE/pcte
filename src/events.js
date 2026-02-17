const handlersByEvent = new Map();

export function on(eventName, handler) {
  if (!handlersByEvent.has(eventName)) {
    handlersByEvent.set(eventName, new Set());
  }
  const handlers = handlersByEvent.get(eventName);
  handlers.add(handler);
  return () => {
    handlers.delete(handler);
  };
}

export function emit(eventName, payload) {
  const handlers = handlersByEvent.get(eventName);
  if (!handlers) {
    return;
  }
  handlers.forEach((handler) => handler(payload));
}
