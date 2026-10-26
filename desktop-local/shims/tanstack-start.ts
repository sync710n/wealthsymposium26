export function useServerFn<T extends (...args: never[]) => unknown>(fn: T): T {
  return fn;
}
