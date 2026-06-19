// Re-export from the main i18n location for backward compatibility
// The actual implementation is in frontend/src/i18n/LanguageContext.jsx
export {
  useLanguage,
  LanguageProvider,
  LANGUAGES,
  LANGUAGE_NAMES,
} from '../i18n/LanguageContext'

export { default } from '../i18n/LanguageContext'
