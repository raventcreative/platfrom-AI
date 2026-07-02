import { JobAgent } from '@prisma/client';
import { OutputType } from './content.types';

/**
 * Instruksi per jenis output (user prompt). `{{DAILY_INPUT}}` diganti blok daily input.
 * Tiap output = versi enak-dibaca (Markdown) + blok JSON terstruktur.
 *
 * Prinsip kualitas (berlaku semua generator):
 *  - Hook harus SPESIFIK (angka, kontras, callout audiens) — bukan basa-basi.
 *  - HARAM kalimat template: "di era digital ini", "tunggu apa lagi", "yuk simak".
 *  - Bahasa lisan Indonesia natural (bukan bahasa skripsi), sesuai voice brand.
 *  - Konkret > umum: sebut produk/angka/situasi nyata dari profil brand.
 */
export const GENERATORS: Record<
  OutputType,
  { agent: JobAgent; label: string; instruction: string }
> = {
  script: {
    agent: 'SCRIPT',
    label: 'script Reels/TikTok',
    instruction: `Buatkan SCRIPT video pendek (Reels/TikTok) siap-shooting berdasarkan DAILY INPUT.
{{DAILY_INPUT}}

KETENTUAN KUALITAS:
- Durasi total 20-40 detik, 4-7 scene. Scene 1 = hook, maksimal 3 detik.
- Beri 3 OPSI HOOK dengan pola BERBEDA: (a) callout audiens + masalah, (b) angka/fakta mengejutkan, (c) kontras "jangan X sebelum Y" / hasil dulu. Semua spesifik ke brief, bukan generik.
- Voiceover = bahasa NGOMONG sehari-hari (boleh "nih", "tuh", "gak") sesuai sapaan brand — bacakan keras di kepala, kalau kaku tulis ulang.
- Tiap scene: visual KONKRET yang bisa dishoot pakai HP (bukan "visual menarik"), teks on-screen ≤ 8 kata, durasi realistis.
- Alur: Hook → Masalah/Build (bikin relate) → Payoff/Solusi (tunjukkan produk beraksi) → CTA tunggal yang jelas.
- Akhiri dengan saran sound/musik yang sedang relevan (deskripsi vibe, bukan judul lagu berhak-cipta).

KELUARKAN:
(1) Versi enak dibaca: **3 Opsi Hook** (tandai mana rekomendasi & alasannya 1 kalimat), tabel | Scene | Visual | Voiceover | Teks On-Screen | Durasi |, **CTA**, **Saran Sound**, **Total Durasi**.
(2) Blok JSON valid di dalam pagar kode \`\`\`json:
{"type":"script","platform":"...","duration_sec":0,"hooks":["","",""],"recommended_hook":1,"scenes":[{"scene":1,"visual":"","voiceover":"","onscreen_text":"","duration_sec":0}],"cta":"","sound_suggestion":"","caption_hint":"","compliance_notes":""}`,
  },
  carousel: {
    agent: 'CAROUSEL',
    label: 'carousel Instagram',
    instruction: `Buatkan KONSEP CAROUSEL Instagram yang SAVE-WORTHY berdasarkan DAILY INPUT.
{{DAILY_INPUT}}

KETENTUAN KUALITAS:
- 6-8 slide. Slide 1 = COVER: headline ≤ 8 kata yang bikin berhenti scroll (angka/kontras/callout), JANGAN judul deskriptif datar.
- Satu slide = SATU ide. Headline slide ≤ 10 kata; subteks 1-2 kalimat padat yang berdiri sendiri (orang skim tetap paham).
- Alur cerita jelas: Cover (janji) → Isi 4-6 slide (penuhi janji, urut logis, makin dalam) → Slide akhir 1 CTA spesifik.
- Tiap slide beri ARAH VISUAL konkret: layout, elemen grafis/foto apa, penekanan teks mana — selaras warna & gaya brand.
- Konten harus PUNYA DAGING: tips bisa langsung dipraktikkan / insight yang bikin "oh baru tau" — bukan motivasi kosong.
- Caption: kalimat pertama = hook ulang cover dengan kata beda (125 karakter pertama menentukan), lalu 2-3 kalimat nilai tambah, tutup CTA. 4-6 hashtag campur: 2 niche, 2 topik, 1 branded, 1 lokal (bila relevan).

KELUARKAN:
(1) Versi enak dibaca: **Judul**, lalu tiap slide "Slide N — [peran]: Headline / Subteks / Visual", **Caption**, **Hashtag**.
(2) Blok JSON valid di dalam pagar kode \`\`\`json:
{"type":"carousel","platform":"Instagram","title":"","slides":[{"slide":1,"role":"hook","headline":"","subtext":"","visual":""}],"caption":"","hashtags":[],"compliance_notes":""}`,
  },
  storyboard: {
    agent: 'STORYBOARD',
    label: 'storyboard video',
    instruction: `Buatkan STORYBOARD / SHOT LIST produksi video berdasarkan DAILY INPUT. Harus realistis dishoot 1 orang pakai HP + tripod.
{{DAILY_INPUT}}

KETENTUAN KUALITAS:
- Tulis konsep 1-2 kalimat + durasi target (default 20-40 detik).
- 5-9 shot urut. Tiap shot: visual konkret, angle/gerakan kamera (eye-level/top-down/pan/zoom/handheld), talent & props yang dibutuhkan, voiceover (bahasa lisan), teks on-screen ≤ 8 kata, sfx/musik, durasi.
- Shot 1 harus visual paling kuat (hasil akhir / momen paling menarik) — hook visual.
- Sertakan daftar B-ROLL (5-8 klip pendek yang gampang diambil) + catatan produksi praktis (pencahayaan, lokasi, urutan shooting biar efisien).

KELUARKAN:
(1) Versi enak dibaca: **Konsep**, tabel | Shot | Visual | Kamera | Talent/Props | Voiceover | Teks | SFX | Durasi |, **B-Roll**, **Catatan Produksi**, **CTA**.
(2) Blok JSON valid di dalam pagar kode \`\`\`json:
{"type":"storyboard","concept":"","duration_sec":0,"shots":[{"shot":1,"visual":"","camera":"","talent_props":"","voiceover":"","onscreen_text":"","sfx_music":"","duration_sec":0}],"broll":[],"production_notes":"","cta":"","compliance_notes":""}`,
  },
  caption: {
    agent: 'CAPTION',
    label: 'caption + hashtag',
    instruction: `Buatkan PAKET CAPTION siap-posting berdasarkan DAILY INPUT.
{{DAILY_INPUT}}

KETENTUAN KUALITAS:
- CAPTION UTAMA: kalimat pertama = hook kuat dalam 125 karakter pertama (angka/pertanyaan menohok/kontras). Lanjut 3-5 kalimat pendek yang ngasih nilai/cerita (bukan deskripsi produk datar), spasi antar paragraf, tutup 1 CTA jelas. Emoji sesuai aturan brand.
- CAPTION PENDEK: versi 1-2 kalimat punchy untuk repost/story.
- 5 VARIASI HOOK (masing-masing 1 baris, pola beda: pertanyaan / angka / kontras / callout / "POV:") — siap dipakai jadi pembuka konten lain.
- HASHTAG 2 SET: set "jangkauan" (5-7 tag: campuran volume besar+niche) dan set "niche" (5-7 tag: spesifik topik+branded+lokal). Tanpa tag spam generik (#fyp #viral).

KELUARKAN:
(1) Versi enak dibaca dengan heading jelas per bagian.
(2) Blok JSON valid di dalam pagar kode \`\`\`json:
{"type":"caption","caption_long":"","caption_short":"","hooks":["","","","",""],"hashtags_reach":[],"hashtags_niche":[],"compliance_notes":""}`,
  },
  ideas: {
    agent: 'IDEAS',
    label: 'ide konten mingguan',
    instruction: `Buatkan 7 IDE KONTEN siap-eksekusi untuk 1 minggu berdasarkan DAILY INPUT (kalau kosong, dari profil brand).
{{DAILY_INPUT}}

KETENTUAN KUALITAS:
- Sebar ke content pillar seimbang: ±3 edukasi/tips, ±2 relate/hiburan, ±1 bukti/testimoni, ±1 jualan (soft). Tandai pillar tiap ide.
- Sebar format: campur Reels, Carousel, Story/Post — pilih format yang PALING COCOK untuk tiap ide (jangan asal).
- Tiap ide WAJIB: hook 1 baris yang sudah jadi (bisa langsung dipakai, spesifik — bukan "tips menarik untuk kamu"), konsep eksekusi 2-3 kalimat (apa yang ditampilkan & alurnya), CTA.
- Ide harus variatif satu sama lain (beda angle, beda emosi: penasaran/relate/percaya/pengen).
- Urutkan Senin-Minggu dengan logika (edukasi awal minggu, jualan menjelang akhir pekan bila cocok).

KELUARKAN:
(1) Tabel | Hari | Pillar | Format | Hook | Konsep | CTA |.
(2) Blok JSON valid di dalam pagar kode \`\`\`json:
{"type":"ideas","ideas":[{"no":1,"day":"Senin","pillar":"","format":"","hook":"","concept":"","cta":""}]}`,
  },
};
