// Back-compat aliases. The canonical schema moved to ./design-documents so
// non-thumbnail agent profiles (detail-page, etc.) can share the same table.
// Existing YouPD imports of `thumbnails` / `thumbnailVersions` keep working.
export {
  designDocuments as thumbnails,
  designDocumentVersions as thumbnailVersions,
} from './design-documents';
export type {
  DesignDocumentRow as ThumbnailRow,
  DesignDocumentVersionRow as ThumbnailVersionRow,
} from './design-documents';
