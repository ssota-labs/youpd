// Thin re-export for callers that still import from @youpd/api/thumbnail.
// The substitution logic moved to @youpd/composer-core so any agent product
// can apply templates without depending on YouPD's MCP toolchain.
export { applyTemplate } from '@youpd/composer-core';
