import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/page-header';
import { ImportForm } from '@/components/forms/import-form';
import { requirePermission } from '@/server/session';

export const metadata: Metadata = { title: 'Importer des biens' };

export default async function ImportPropertiesPage() {
  await requirePermission('properties:write');

  return (
    <div className="space-y-4">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link href="/biens">
          <ArrowLeft className="size-4" /> Biens
        </Link>
      </Button>
      <PageHeader
        title="Importer des biens"
        description="Chargez votre portefeuille existant depuis Excel ou CSV — idéal pour reprendre une gérance."
      />
      <ImportForm />
    </div>
  );
}
