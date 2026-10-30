import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Bed, Building2, MapPin, Ruler, ShowerHead } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/ui/page-header';
import { LeaseStatusBadge, PropertyStatusBadge, UnitStatusBadge } from '@/components/ui/status-badge';
import { EmptyState } from '@/components/ui/empty-state';
import { PropertyFormDialog } from '@/components/forms/property-form';
import { UnitFormDialog } from '@/components/forms/unit-form';
import { getTenantContext } from '@/server/session';
import { getProperty } from '@/server/services/properties.service';
import { listOwners } from '@/server/services/owners.service';
import { ApiError } from '@/server/http';
import { formatDate, formatFCFA } from '@/lib/format';
import { EXPENSE_CATEGORY_LABELS, PROPERTY_TYPE_LABELS } from '@/lib/constants';

export const metadata: Metadata = { title: 'Fiche bien' };
export const dynamic = 'force-dynamic';

export default async function PropertyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { organizationId } = await getTenantContext();
  const { id } = await params;

  const property = await getProperty(organizationId, id).catch((error) => {
    if (error instanceof ApiError) return null;
    throw error;
  });
  if (!property) notFound();

  const owners = await listOwners(organizationId);

  return (
    <div className="space-y-4">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link href="/biens">
          <ArrowLeft className="size-4" /> Biens
        </Link>
      </Button>

      <PageHeader
        title={`${property.reference}${property.name ? ` · ${property.name}` : ''}`}
        description={`${PROPERTY_TYPE_LABELS[property.type]} · ${property.address}, ${property.district}, ${property.city}`}
        actions={
          <>
            <Button asChild variant="outline" size="sm">
              <Link href={`/contrats/nouveau?propertyId=${property.id}`}>Créer un bail</Link>
            </Button>
            <PropertyFormDialog
              owners={owners.map((owner) => ({
                id: owner.id,
                firstName: owner.firstName,
                lastName: owner.lastName,
              }))}
              property={{
                ...property,
                photos: property.photos,
                description: property.description,
                name: property.name,
                bedrooms: property.bedrooms,
                bathrooms: property.bathrooms,
                areaSqm: property.areaSqm,
              }}
            />
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Informations</CardTitle>
            <PropertyStatusBadge status={property.status} />
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-xs text-muted-foreground">Loyer de base</p>
              <p className="font-semibold">{formatFCFA(property.rentAmount)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Charges</p>
              <p className="font-semibold">{formatFCFA(property.chargesAmount)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Caution</p>
              <p className="font-semibold">{formatFCFA(property.depositAmount)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Propriétaire</p>
              <Link href={`/proprietaires/${property.owner.id}`} className="font-semibold text-primary hover:underline">
                {property.owner.firstName} {property.owner.lastName}
              </Link>
            </div>
            <div className="flex gap-4 text-sm text-muted-foreground sm:col-span-2">
              {property.bedrooms != null ? (
                <span className="flex items-center gap-1">
                  <Bed className="size-4" /> {property.bedrooms} chambre(s)
                </span>
              ) : null}
              {property.bathrooms != null ? (
                <span className="flex items-center gap-1">
                  <ShowerHead className="size-4" /> {property.bathrooms} SDB
                </span>
              ) : null}
              {property.areaSqm != null ? (
                <span className="flex items-center gap-1">
                  <Ruler className="size-4" /> {property.areaSqm} m²
                </span>
              ) : null}
            </div>
            {property.description ? (
              <p className="rounded-lg bg-muted/50 p-3 text-sm sm:col-span-2">{property.description}</p>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="size-4" /> Localisation
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p className="font-medium">{property.address}</p>
            <p className="text-muted-foreground">
              {property.district}, {property.city}
            </p>
            <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
              {property.leases.filter((lease) => lease.status === 'ACTIF').length > 0
                ? 'Bien actuellement occupé (bail actif).'
                : 'Aucun bail actif sur ce bien.'}
            </div>
            {property.photos.length > 0 ? (
              <div className="grid grid-cols-2 gap-2">
                {property.photos.slice(0, 4).map((photo, index) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={index} src={photo} alt="" className="h-20 w-full rounded-lg object-cover" />
                ))}
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Building2 className="size-4" /> Logements ({property.units.length})
          </CardTitle>
          <UnitFormDialog propertyId={property.id} />
        </CardHeader>
        <CardContent>
          {property.units.length === 0 ? (
            <EmptyState
              title="Aucun logement"
              description="Pour un immeuble ou une résidence, ajoutez chaque lot pour suivre les baux individuellement."
            />
          ) : (
            <ul className="divide-y divide-border">
              {property.units.map((unit) => (
                <li key={unit.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                  <div>
                    <p className="text-sm font-medium">{unit.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {unit.floor != null ? `Étage ${unit.floor} · ` : ''}
                      {unit.rentAmount ? formatFCFA(unit.rentAmount) : 'Loyer du bien'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {unit.leases.length > 0 ? (
                      <span className="text-xs text-muted-foreground">
                        {unit.leases[0].tenant.firstName} {unit.leases[0].tenant.lastName}
                      </span>
                    ) : null}
                    <UnitStatusBadge status={unit.status} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Historique des contrats</CardTitle>
        </CardHeader>
        <CardContent>
          {property.leases.length === 0 ? (
            <EmptyState title="Aucun contrat" description="Créez un bail pour ce bien." />
          ) : (
            <ul className="divide-y divide-border">
              {property.leases.map((lease) => (
                <li key={lease.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                  <div>
                    <Link href={`/contrats/${lease.id}`} className="text-sm font-medium hover:underline">
                      {lease.reference} · {lease.tenant.firstName} {lease.tenant.lastName}
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(lease.startDate)} → {formatDate(lease.endDate)}
                      {lease.unit ? ` · ${lease.unit.name}` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{formatFCFA(lease.rentAmount)}</Badge>
                    <LeaseStatusBadge status={lease.status} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Dépenses sur ce bien</CardTitle>
        </CardHeader>
        <CardContent>
          {property.expenses.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucune dépense enregistrée.</p>
          ) : (
            <ul className="divide-y divide-border">
              {property.expenses.map((expense) => (
                <li key={expense.id} className="flex items-center justify-between gap-2 py-2.5 text-sm">
                  <div>
                    <p className="font-medium">{expense.label}</p>
                    <p className="text-xs text-muted-foreground">
                      {EXPENSE_CATEGORY_LABELS[expense.category]} · {formatDate(expense.date)}
                    </p>
                  </div>
                  <span className="font-medium">{formatFCFA(expense.amount)}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
