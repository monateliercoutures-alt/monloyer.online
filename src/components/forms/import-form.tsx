'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { FileSpreadsheet, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Field } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { apiRequest } from '@/lib/api-client';
import { ErrorMessage } from '@/components/forms/form-utils';

type ImportRow = {
  ownerName: string;
  reference: string;
  type: string;
  address: string;
  district: string;
  rentAmount: number;
  chargesAmount?: number;
  depositAmount?: number;
  bedrooms?: number;
};

const HEADERS: Record<string, keyof ImportRow> = {
  proprietaire: 'ownerName',
  'propriétaire': 'ownerName',
  owner: 'ownerName',
  reference: 'reference',
  'référence': 'reference',
  type: 'type',
  adresse: 'address',
  address: 'address',
  quartier: 'district',
  district: 'district',
  loyer: 'rentAmount',
  rentamount: 'rentAmount',
  charges: 'chargesAmount',
  caution: 'depositAmount',
  chambres: 'bedrooms',
};

function normalizeHeader(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, '');
}

function rowsToObjects(rows: string[][]): { data: ImportRow[]; errors: string[] } {
  if (rows.length < 2) return { data: [], errors: ['Le fichier ne contient aucune ligne de données.'] };
  const header = rows[0].map(normalizeHeader);
  const keys = header.map((cell) => HEADERS[cell]);
  const data: ImportRow[] = [];
  const errors: string[] = [];

  rows.slice(1).forEach((row, index) => {
    if (row.every((cell) => !cell?.trim())) return;
    const record: Record<string, string> = {};
    keys.forEach((key, columnIndex) => {
      if (key) record[key] = row[columnIndex]?.trim() ?? '';
    });

    if (!record.ownerName || !record.reference || !record.address || !record.district) {
      errors.push(`Ligne ${index + 2} : propriétaire, référence, adresse et quartier sont obligatoires.`);
      return;
    }

    data.push({
      ownerName: record.ownerName,
      reference: record.reference,
      type: record.type || 'Appartement',
      address: record.address,
      district: record.district,
      rentAmount: Number(record.rentAmount) || 0,
      chargesAmount: Number(record.chargesAmount) || 0,
      depositAmount: Number(record.depositAmount) || 0,
      bedrooms: record.bedrooms ? Number(record.bedrooms) : undefined,
    });
  });

  return { data, errors };
}

/** Import Excel / CSV avec prévisualisation avant validation. */
export function ImportForm() {
  const router = useRouter();
  const [rows, setRows] = React.useState<ImportRow[]>([]);
  const [errors, setErrors] = React.useState<string[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [apiError, setApiError] = React.useState<string | null>(null);
  const [result, setResult] = React.useState<{ created: number; ownersCreated: number } | null>(null);

  async function handleFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setErrors([]);
    setResult(null);
    setApiError(null);

    try {
      if (file.name.toLowerCase().endsWith('.csv')) {
        const text = await file.text();
        const separator = text.includes(';') ? ';' : ',';
        const parsed = text
          .split(/\r?\n/)
          .filter((line) => line.trim().length > 0)
          .map((line) => line.split(separator).map((cell) => cell.replace(/^"|"$/g, '')));
        const { data, errors: rowErrors } = rowsToObjects(parsed);
        setRows(data);
        setErrors(rowErrors);
      } else {
        const readXlsxFile = (await import('read-excel-file')).default;
        const parsed = (await readXlsxFile(file)) as unknown[][];
        const stringRows = parsed.map((row) => row.map((cell) => (cell == null ? '' : String(cell))));
        const { data, errors: rowErrors } = rowsToObjects(stringRows);
        setRows(data);
        setErrors(rowErrors);
      }
    } catch {
      setErrors(["Impossible de lire ce fichier. Formats acceptés : .csv, .xlsx"]);
    }
  }

  async function handleImport() {
    setLoading(true);
    setApiError(null);
    try {
      const response = await apiRequest<{ data: { created: number; ownersCreated: number; errors: string[] } }>(
        '/api/properties/import',
        { method: 'POST', body: JSON.stringify({ rows }) },
      );
      setResult(response.data);
      setRows([]);
      toast.success(`${response.data.created} bien(s) importé(s)`);
      router.refresh();
    } catch (caught) {
      setApiError(caught instanceof Error ? caught.message : 'Import impossible.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="size-4" /> Fichier à importer
          </CardTitle>
          <CardDescription>
            Colonnes attendues : proprietaire, reference, type (Appartement, Villa, Studio, Chambre, Boutique,
            Bureau, Immeuble), adresse, quartier, loyer, charges, caution, chambres. Les propriétaires inconnus
            sont créés automatiquement.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Field label="Fichier Excel (.xlsx) ou CSV" htmlFor="file">
            <Input id="file" type="file" accept=".csv,.xlsx" onChange={handleFile} />
          </Field>
          <a
            href="data:text/csv;charset=utf-8,proprietaire%2Creference%2Ctype%2Cadresse%2Cquartier%2Cloyer%2Ccharges%2Ccaution%2Cchambres%0AKouadio%20Bamba%2CB-0101%2CAppartement%2CRiviera%203%2CCocody%2C250000%2C20000%2C500000%2C3"
            download="modele-import-biens.csv"
            className="text-xs font-medium text-primary hover:underline"
          >
            Télécharger le modèle CSV
          </a>
        </CardContent>
      </Card>

      {errors.length > 0 ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">
          <p className="font-medium">{errors.length} ligne(s) ignorée(s) :</p>
          <ul className="mt-1 list-inside list-disc space-y-0.5">
            {errors.slice(0, 6).map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {rows.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Prévisualisation ({rows.length} ligne(s))</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Référence</TableHead>
                  <TableHead>Propriétaire</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Quartier</TableHead>
                  <TableHead>Loyer</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.slice(0, 8).map((row) => (
                  <TableRow key={row.reference}>
                    <TableCell className="font-medium">{row.reference}</TableCell>
                    <TableCell>{row.ownerName}</TableCell>
                    <TableCell>{row.type}</TableCell>
                    <TableCell>{row.district}</TableCell>
                    <TableCell>{new Intl.NumberFormat('fr-FR').format(row.rentAmount)} FCFA</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <Button onClick={handleImport} loading={loading}>
              <Upload className="size-4" /> Importer {rows.length} bien(s)
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <ErrorMessage error={apiError} />

      {result ? (
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3 text-sm">
          {result.created} bien(s) importé(s) · {result.ownersCreated} propriétaire(s) créé(s).
        </div>
      ) : null}
    </div>
  );
}
