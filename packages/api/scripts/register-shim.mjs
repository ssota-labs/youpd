import { register } from 'node:module';

register(new URL('./server-only-shim.mjs', import.meta.url));
