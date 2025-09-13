import { Head } from '@inertiajs/react';
import FrontendLayout from '@/layouts/frontend-layout';
import ThreeD from '@/components/frontend/3d';

export default function ThreeDPage() {
  return (
    <>
      <Head title="3D" />
      <FrontendLayout>
        <main>
          <ThreeD />
        </main>
      </FrontendLayout>
    </>
  );
}

