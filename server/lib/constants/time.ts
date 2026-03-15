/** Time constants (ms) */
export const ONE_MINUTE_MS = 60 * 1000;
export const ONE_HOUR_MS = 60 * 60 * 1000;
export const ONE_DAY_MS = 24 * 60 * 60 * 1000;

/** AI analysis: مهلات طويلة لأن التحليل قد يأخذ دقائق (Claude/OpenAI) */
export const ANALYSIS_CLAUDE_TIMEOUT_MS = 180_000;   // 3 دقائق
export const ANALYSIS_OPENAI_TIMEOUT_MS = 120_000;  // 2 دقيقة
export const ANALYSIS_GEMINI_TIMEOUT_MS = 90_000;   // 1.5 دقيقة
/** وقت أقصى لجمع البيانات قبل استدعاء المحرك (سعر، أخبار، أساسي، إلخ) */
export const ANALYSIS_DATA_GATHER_TIMEOUT_MS = 25_000;
