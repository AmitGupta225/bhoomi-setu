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

    // 2. Multi-Engine Translation Pipeline:
    // Engine 1: Google Translate Client API (Fastest, highest accuracy for Indian languages)
    // Engine 2: MyMemory Translation API (Fallback)
    let translated = cleanText;
    let engineUsed = 'none';

    try {
      const gUrl = `https://clients5.google.com/translate_a/t?client=dict-chrome-ex&sl=${sourceLang}&tl=${targetLang}&q=${encodeURIComponent(cleanText)}`;
      const gRes = await fetch(gUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
        },
        signal: AbortSignal.timeout(4000)
      });

      if (gRes.ok) {
        const gData = await gRes.json();
        if (Array.isArray(gData) && Array.isArray(gData[0]) && typeof gData[0][0] === 'string' && gData[0][0].trim()) {
          translated = gData[0][0].trim();
          engineUsed = 'google';
        }
      }
    } catch (gErr) {
      console.warn(`[TranslationBridge] Google engine failed for "${cleanText}" to ${targetLang}:`, gErr.message);
    }

    // Fallback: MyMemory API if Google didn't return a translation
    if (translated === cleanText) {
      try {
        const pair = `${sourceLang}|${targetLang}`;
        const mUrl = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(cleanText)}&langpair=${encodeURIComponent(pair)}`;
        const mRes = await fetch(mUrl, {
          headers: {
            'User-Agent': 'BhoomiSetu-GovPortal/1.0'
          },
          signal: AbortSignal.timeout(4000)
        });

        if (mRes.ok) {
          const mJson = await mRes.json();
          if (mJson && mJson.responseData && mJson.responseData.translatedText) {
            const mResult = mJson.responseData.translatedText.trim();
            if (mResult && !mResult.startsWith('MYMEMORY WARNING:')) {
              translated = mResult;
              engineUsed = 'mymemory';
            }
          }
        }
      } catch (mErr) {
        console.warn(`[TranslationBridge] MyMemory fallback failed for "${cleanText}" to ${targetLang}:`, mErr.message);
      }
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
