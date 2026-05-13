// Empty stub: in Vitest we are running server code directly under Node, and
// the real `server-only` package errors on import in that environment. Files
// under apps/mcp still import it normally; the resolve.alias in vitest.config
// swaps it for this no-op.
export {};
