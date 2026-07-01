'use client';

// Halaman buat brand baru (/brands/new).
// Merender BrandEditor tanpa brandId sehingga formnya kosong (mode tambah).
import { BrandEditor } from '../../../components/BrandEditor';

export default function NewBrandPage() {
  return <BrandEditor />;
}
