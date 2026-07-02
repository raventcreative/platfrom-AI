import { JobAgent } from '@prisma/client';
import { OutputType } from './content.types';

/**
 * Instruksi per jenis output (user prompt). `{{DAILY_INPUT}}` diganti blok daily input.
 * Tiap output = versi enak-dibaca + blok JSON terstruktur.
 * Sumber: Content Engine Handbook §8.
 */
export const GENERATORS: Record<
  OutputType,
  { agent: JobAgent; label: string; instruction: string }
> = {
  script: {
    agent: 'SCRIPT',
    label: 'script Reels/TikTok',
    instruction: `Buatkan SCRIPT video pendek (Reels/TikTok) berdasarkan DAILY INPUT. Terapkan PLAYBOOK (hook kuat, struktur Hook->Build->Payoff->CTA, panjang pas).
{{DAILY_INPUT}}
Ketentuan: durasi 15-45 detik; 2 OPSI HOOK (pola playbook); tiap scene kasih visual + durasi + teks on-screen; 1 CTA sesuai tujuan; bahasa lisan natural.
Keluarkan: (1) versi enak dibaca (2 hook, tabel Scene|Visual|Voiceover|Teks on-screen|Durasi, CTA, sound, durasi); (2) blok JSON valid di dalam pagar kode \`\`\`json:
{"type":"script","platform":"...","duration_sec":0,"hooks":["",""],"scenes":[{"scene":1,"visual":"","voiceover":"","onscreen_text":"","duration_sec":0}],"cta":"","sound_suggestion":"","caption_hint":"","compliance_notes":""}`,
  },
  carousel: {
    agent: 'CAROUSEL',
    label: 'carousel Instagram',
    instruction: `Buatkan KONSEP CAROUSEL Instagram berdasarkan DAILY INPUT. Terapkan PLAYBOOK carousel (slide 1 cover/hook kuat, 1 ide/slide, save-worthy, slide akhir 1 CTA).
{{DAILY_INPUT}}
Ketentuan: 6-8 slide; tiap slide headline + subteks + saran visual; caption (hook 125 karakter pertama) + 3-5 hashtag.
Keluarkan: (1) versi enak dibaca (Judul, Slide 1..n, Caption, Hashtag); (2) blok JSON valid di dalam pagar kode \`\`\`json:
{"type":"carousel","platform":"Instagram","title":"","slides":[{"slide":1,"role":"hook","headline":"","subtext":"","visual":""}],"caption":"","hashtags":[],"compliance_notes":""}`,
  },
  storyboard: {
    agent: 'STORYBOARD',
    label: 'storyboard video',
    instruction: `Buatkan STORYBOARD/shot list produksi video berdasarkan DAILY INPUT. Realistis dishoot pakai HP.
{{DAILY_INPUT}}
Ketentuan: konsep & durasi (default 20-40s); SHOT urut (visual, angle/gerakan kamera, talent/props, voiceover, teks on-screen, sfx/musik, durasi); daftar B-ROLL & aset + catatan produksi.
Keluarkan: (1) versi enak dibaca; (2) blok JSON valid di dalam pagar kode \`\`\`json:
{"type":"storyboard","concept":"","duration_sec":0,"shots":[{"shot":1,"visual":"","camera":"","talent_props":"","voiceover":"","onscreen_text":"","sfx_music":"","duration_sec":0}],"broll":[],"production_notes":"","cta":"","compliance_notes":""}`,
  },
  caption: {
    agent: 'CAPTION',
    label: 'caption + hashtag',
    instruction: `Buatkan CAPTION siap posting + hashtag + variasi hook berdasarkan DAILY INPUT. Terapkan PLAYBOOK caption.
{{DAILY_INPUT}}
Ketentuan: 1 caption utama (hook di 125 karakter pertama, ada CTA brand), 1 caption pendek, 5 variasi hook (1 baris each), 3-5 hashtag (niche+topik+branded+lokal).
Keluarkan: (1) versi enak dibaca; (2) blok JSON valid di dalam pagar kode \`\`\`json:
{"type":"caption","caption_long":"","caption_short":"","hooks":["","","","",""],"hashtags":[],"compliance_notes":""}`,
  },
  ideas: {
    agent: 'IDEAS',
    label: 'ide konten mingguan',
    instruction: `Buatkan 7 IDE KONTEN siap-eksekusi (~1 minggu) berdasarkan DAILY INPUT (kalau kosong, dari profil brand). Sebar ke content pillars (80% value / 20% jualan).
{{DAILY_INPUT}}
Tiap ide: pillar, format (Reels/Carousel/Story), hook (1 baris pola kuat), konsep singkat, CTA.
Keluarkan: (1) tabel (No|Pillar|Format|Hook|Konsep|CTA); (2) blok JSON valid di dalam pagar kode \`\`\`json:
{"type":"ideas","ideas":[{"no":1,"pillar":"","format":"","hook":"","concept":"","cta":""}]}`,
  },
};
