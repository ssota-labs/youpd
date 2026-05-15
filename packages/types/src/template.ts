// YouPD-specific template types. The generic Template/TemplateDocument lives
// in @youpd/composer-core; this file is a thin re-export so existing imports
// `from '@youpd/types'` keep working during the migration.
export {
  TemplateSchema,
  TemplateDocumentSchema,
  FillersSchema,
} from '@youpd/composer-core';
export type {
  Template,
  TemplateDocument,
  Fillers,
} from '@youpd/composer-core';
