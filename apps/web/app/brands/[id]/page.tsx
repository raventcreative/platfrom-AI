'use client';

// Halaman edit brand (/brands/[id]).
// Meneruskan id dari route ke BrandEditor sehingga formnya diisi data brand tersebut.
import { BrandEditor } from '../../../components/BrandEditor';

export default function EditBrandPage({ params }: { params: { id: string } }) {
  return <BrandEditor brandId={params.id} />;
}
