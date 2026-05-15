/** REST-specific helpers shared by HTTP route handlers (`apps/web`). */
export { requireYoupdRestToken, RestAuthError } from './auth';
export {
  wrapRestEnvelope,
  splitQuotaSession,
  metaFromResult,
  type YoupdRestMeta,
} from './envelope';
