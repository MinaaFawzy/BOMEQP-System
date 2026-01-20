# 📊 BOMEQP Localization System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     BOMEQP Application                          │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                    React Components                       │  │
│  │                                                           │  │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐         │  │
│  │  │  Screen 1  │  │  Screen 2  │  │  Screen 3  │  ...    │  │
│  │  │            │  │            │  │            │         │  │
│  │  │ const {t}  │  │ const {t}  │  │ const {t}  │         │  │
│  │  │   = use    │  │   = use    │  │   = use    │         │  │
│  │  │Translation │  │Translation │  │Translation │         │  │
│  │  └─────┬──────┘  └─────┬──────┘  └─────┬──────┘         │  │
│  │        │               │               │                │  │
│  └────────┼───────────────┼───────────────┼────────────────┘  │
│           │               │               │                   │
│           └───────────────┴───────────────┘                   │
│                           │                                   │
│  ┌────────────────────────▼────────────────────────────────┐  │
│  │          useTranslation Hook (Custom)                   │  │
│  │  • Simplified API                                       │  │
│  │  • Language switching                                   │  │
│  │  • RTL detection                                        │  │
│  │  • Current language info                                │  │
│  └────────────────────────┬────────────────────────────────┘  │
│                           │                                   │
│  ┌────────────────────────▼────────────────────────────────┐  │
│  │          react-i18next (Library)                        │  │
│  │  • Translation management                               │  │
│  │  • Namespace handling                                   │  │
│  │  • Interpolation                                        │  │
│  └────────────────────────┬────────────────────────────────┘  │
│                           │                                   │
│  ┌────────────────────────▼────────────────────────────────┐  │
│  │          i18next (Core Library)                         │  │
│  │  • Language detection                                   │  │
│  │  • Resource loading                                     │  │
│  │  • Fallback handling                                    │  │
│  └────────────────────────┬────────────────────────────────┘  │
│                           │                                   │
│  ┌────────────────────────▼────────────────────────────────┐  │
│  │          i18n.js (Configuration)                        │  │
│  │  • Initialize i18next                                   │  │
│  │  • Load translation resources                           │  │
│  │  • Set default language                                 │  │
│  │  • Configure RTL/LTR switching                          │  │
│  │  • localStorage persistence                             │  │
│  └────────────────────────┬────────────────────────────────┘  │
│                           │                                   │
│           ┌───────────────┴───────────────┐                   │
│           │                               │                   │
│  ┌────────▼────────┐           ┌──────────▼─────────┐         │
│  │  English (en)   │           │   Arabic (ar)      │         │
│  │                 │           │                    │         │
│  │  ┌───────────┐  │           │  ┌───────────┐    │         │
│  │  │common.json│  │           │  │common.json│    │         │
│  │  │ 50+ keys  │  │           │  │ 50+ keys  │    │         │
│  │  └───────────┘  │           │  └───────────┘    │         │
│  │                 │           │                    │         │
│  │  ┌───────────┐  │           │  ┌───────────┐    │         │
│  │  │ auth.json │  │           │  │ auth.json │    │         │
│  │  │ 30+ keys  │  │           │  │ 30+ keys  │    │         │
│  │  └───────────┘  │           │  └───────────┘    │         │
│  │                 │           │                    │         │
│  │  ┌───────────┐  │           │  ┌───────────┐    │         │
│  │  │navigation │  │           │  │navigation │    │         │
│  │  │   .json   │  │           │  │   .json   │    │         │
│  │  │ 40+ keys  │  │           │  │ 40+ keys  │    │         │
│  │  └───────────┘  │           │  └───────────┘    │         │
│  │                 │           │                    │         │
│  │  ┌───────────┐  │           │  ┌───────────┐    │         │
│  │  │  [more]   │  │           │  │  [more]   │    │         │
│  │  │namespaces │  │           │  │namespaces │    │         │
│  │  └───────────┘  │           │  └───────────┘    │         │
│  │                 │           │                    │         │
│  └─────────────────┘           └────────────────────┘         │
│                                                                │
└────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                    Additional Components                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  LanguageSwitcher Component                              │  │
│  │  • Dropdown UI for language selection                    │  │
│  │  • Triggers language change                              │  │
│  │  • Shows current language                                │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Translation Utils                                       │  │
│  │  • translate() - for non-React code                      │  │
│  │  • formatDate() - locale-aware date formatting           │  │
│  │  • formatNumber() - locale-aware number formatting       │  │
│  │  • formatCurrency() - locale-aware currency formatting   │  │
│  │  • isRTL() - check if current language is RTL            │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                    Data Flow Example                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. User selects Arabic from LanguageSwitcher                  │
│                    ↓                                            │
│  2. i18n.changeLanguage('ar') is called                        │
│                    ↓                                            │
│  3. i18n loads Arabic resources from ar/*.json                 │
│                    ↓                                            │
│  4. document.dir is set to 'rtl'                               │
│                    ↓                                            │
│  5. Language is saved to localStorage                          │
│                    ↓                                            │
│  6. All components re-render with Arabic text                  │
│                    ↓                                            │
│  7. UI displays in Arabic with RTL layout                      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                    File Organization                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  src/                                                           │
│  ├── locales/                  ← Translation files             │
│  │   ├── en/                   ← English translations          │
│  │   │   ├── common.json       ← Common UI strings             │
│  │   │   ├── auth.json         ← Authentication                │
│  │   │   ├── navigation.json   ← Navigation menus              │
│  │   │   └── _template.json    ← Template for new namespaces   │
│  │   └── ar/                   ← Arabic translations           │
│  │       ├── common.json                                       │
│  │       ├── auth.json                                         │
│  │       ├── navigation.json                                   │
│  │       └── _template.json                                    │
│  │                                                              │
│  ├── components/                                                │
│  │   ├── LanguageSwitcher/     ← Language selector component   │
│  │   │   ├── LanguageSwitcher.jsx                              │
│  │   │   └── LanguageSwitcher.css                              │
│  │   └── LocalizationExample/  ← Example usage                 │
│  │       └── LocalizationExample.jsx                           │
│  │                                                              │
│  ├── hooks/                                                     │
│  │   └── useTranslation.js     ← Custom translation hook       │
│  │                                                              │
│  ├── utils/                                                     │
│  │   └── translationUtils.js   ← Utility functions             │
│  │                                                              │
│  ├── i18n.js                   ← i18n configuration            │
│  └── main.jsx                  ← Entry point (imports i18n)    │
│                                                                 │
│  Documentation/                                                 │
│  ├── LOCALIZATION.md           ← Full documentation            │
│  ├── LOCALIZATION_SUMMARY.md   ← Implementation summary        │
│  ├── QUICK_REFERENCE.md        ← Quick reference guide         │
│  ├── WORKFLOW.md               ← Collaboration workflow        │
│  └── ARCHITECTURE.md           ← This file                     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                    Key Features                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ✅ Automatic RTL/LTR switching                                │
│  ✅ Language persistence (localStorage)                        │
│  ✅ Namespace organization                                     │
│  ✅ Nested translations support                                │
│  ✅ Type-safe translation keys                                 │
│  ✅ Fallback to English if translation missing                 │
│  ✅ Easy-to-use hooks and utilities                            │
│  ✅ Locale-aware date/number formatting                        │
│  ✅ Extensible architecture                                    │
│  ✅ Developer-friendly workflow                                │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
