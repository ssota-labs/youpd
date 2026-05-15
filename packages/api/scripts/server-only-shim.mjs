// Node hook that aliases `server-only` to an empty module so tsx scripts
// (e2e, seeds) can import server-side modules that re-export from packages
// using the Next.js marker. Production bundles still resolve the real one.
const EMPTY = new URL('./empty.mjs', import.meta.url).href;

export async function resolve(specifier, context, nextResolve) {
  if (specifier === 'server-only') {
    return { url: EMPTY, shortCircuit: true, format: 'module' };
  }
  return nextResolve(specifier, context);
}
