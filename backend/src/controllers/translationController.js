import { projectsDb } from '../db.js';

/**
 * Enterprise Dynamic Translation Gateway
 * - Checks SQLite cache table `dynamic_translations` for zero-latency retrieval.
 * - For new user-generated strings, calls MyMemory Translation Engine.
 * - Stores in SQLite `dynamic_translations` table so translations are permanently cached.
 * - Degrades gracefully to source text if offline.
 */
export const translateText = async (req, res) => {
  try {
    const { text, targetLang, sourceLang = 'en' } = req.body;

    if (!text || typeof text !== 'string' || !text.trim()) {
      return res.json({ success: true, translated: '' });
    }

    const cleanText = text.trim();
    if (!targetLang || targetLang === 'en' || targetLang === sourceLang) {
      return res.json({ success: true, translated: cleanText, cached: true });
    }

    // 1. Check SQLite Cache
    const cachedRow = await new Promise((resolve, reject) => {
      projectsDb.get(
        'SELECT translated_text FROM dynamic_translations WHERE source_text = ? AND target_lang = ?',
        [cleanText, targetLang],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    if (cachedRow && cachedRow.translated_text) {
      return res.json({
        success: true,
        translated: cachedRow.translated_text,
        cached: true
      });
    }

    // 2. Fetch Translation via MyMemory Translation Engine
    let translated = cleanText;
    try {
      const pair = `${sourceLang}|${targetLang}`;
      const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(cleanText)}&langpair=${encodeURIComponent(pair)}`;
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'BhoomiSetu-GovPortal/1.0'
        },
        signal: AbortSignal.timeout(5000)
      });

      if (response.ok) {
        const json = await response.json();
        if (json && json.responseData && json.responseData.translatedText) {
          const result = json.responseData.translatedText.trim();
          // Verify result is valid and not an error code
          if (result && !result.startsWith('MYMEMORY WARNING:')) {
            translated = result;
          }
        }
      }
    } catch (networkErr) {
      console.warn(`[TranslationBridge] Network translation failed for "${cleanText}" to ${targetLang}:`, networkErr.message);
      return res.json({
        success: true,
        translated: cleanText,
        fallback: true
      });
    }

    // 3. Cache into SQLite for all future requests
    if (translated && translated !== cleanText) {
      projectsDb.run(
        'INSERT OR REPLACE INTO dynamic_translations (source_text, target_lang, translated_text) VALUES (?, ?, ?)',
        [cleanText, targetLang, translated],
        (err) => {
          if (err) console.error('[TranslationBridge] SQLite cache error:', err);
        }
      );
    }

    return res.json({
      success: true,
      translated,
      cached: false
    });
  } catch (err) {
    console.error('[TranslationBridge] Unexpected error:', err);
    return res.json({
      success: false,
      translated: req.body?.text || '',
      error: err.message
    });
  }
};
