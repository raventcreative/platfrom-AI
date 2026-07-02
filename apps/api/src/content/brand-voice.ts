/**
 * Prompt "training" brand voice: menganalisis konten IG (hasil scrape atau
 * contoh caption manual) → menghasilkan brand voice profile terstruktur yang
 * disimpan & disuntik ke setiap generate. Ini ekstraksi + few-shot, bukan
 * fine-tuning model.
 */

export const VOICE_SYSTEM_PROMPT =
  'Kamu adalah Brand Strategist senior di agency konten Indonesia. Tugasmu: menganalisis konten Instagram sebuah brand dan mengekstrak BRAND VOICE PROFILE yang presisi, supaya AI copywriter bisa meniru gaya brand itu secara konsisten. Jawab dalam Bahasa Indonesia. Jangan mengarang fakta di luar data yang diberikan.';

export function buildVoiceUserPrompt(
  brandInfo: string,
  contentData: string,
): string {
  const intro = brandInfo
    ? `INFO BRAND SAAT INI:\n${brandInfo}\n\n`
    : '';
  return `${intro}DATA KONTEN:\n${contentData}

TUGAS: analisis pola dari data di atas — nada & kepribadian brand, sapaan ke audiens, frasa/kata khas (signature), kata yang dihindari, pemakaian emoji, pola hook pembuka, pilar konten yang terlihat, dan gaya penulisan caption secara umum.

Keluarkan: (1) ringkasan analisis singkat yang enak dibaca (maks ~10 baris); (2) blok JSON valid di dalam pagar kode \`\`\`json:
{"tone_attributes":["",""],"style_summary":"","sapaan":"","signature_phrases":[""],"preferred_words":[""],"avoid_words":[""],"emoji_usage":"banyak|secukupnya|none","hook_patterns":[""],"content_pillars":[""],"sample_captions":["",""],"do":[""],"dont":[""]}

Catatan: sample_captions = 2-3 caption ASLI yang paling mewakili gaya brand (salin persis dari data, jangan diubah). style_summary = 1-2 kalimat ringkas yang bisa dipakai langsung sebagai instruksi gaya untuk AI copywriter.`;
}
