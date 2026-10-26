export function createServerFn() {
  const api = {
    validator(_parse: unknown) {
      return api;
    },
    handler<T>(fn: (ctx: { data: T }) => unknown) {
      return (input?: { data?: T }) => fn({ data: (input?.data ?? {}) as T });
    },
  };
  return api;
}
