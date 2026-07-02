// Toast notifikasi sederhana: panggil toast('...') dari mana saja.
export type ToastType = 'success' | 'error';
export type ToastItem = { id: number; message: string; type: ToastType };

let seq = 0; // penghasil id unik yang selalu naik
let items: ToastItem[] = []; // daftar toast yang sedang aktif
const listeners = new Set<(items: ToastItem[]) => void>(); // pelanggan (mis. komponen Toaster)

// Beritahu semua pelanggan bahwa daftar toast berubah.
function emit() {
  for (const l of listeners) l(items);
}

// Tampilkan toast baru; otomatis hilang setelah TTL.
export function toast(message: string, type: ToastType = 'success') {
  const id = ++seq;
  items = [...items, { id, message, type }];
  emit();
  setTimeout(() => {
    items = items.filter((i) => i.id !== id);
    emit();
  }, 2800); // TTL toast: hapus setelah 2,8 detik
}

// Berlangganan perubahan daftar toast; mengembalikan fungsi unsubscribe.
export function subscribeToasts(l: (items: ToastItem[]) => void) {
  listeners.add(l);
  l(items);
  return () => {
    listeners.delete(l);
  };
}
