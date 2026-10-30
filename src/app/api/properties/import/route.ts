import { NextResponse } from 'next/server';
import { propertyImportSchema } from '@/lib/validations';
import { handleApiError, requireApiUser } from '@/server/http';
import { importProperties } from '@/server/services/properties.service';
import { logActivity } from '@/server/activity';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const user = await requireApiUser('properties:write');
    const input = propertyImportSchema.parse(await request.json());
    const result = await importProperties(user.organizationId, input.rows);
    await logActivity({
      organizationId: user.organizationId,
      actorId: user.id,
      actorName: `${user.firstName} ${user.lastName}`,
      action: 'property.import',
      entityType: 'Property',
      description: `Import de ${result.created} bien(s) (${result.ownersCreated} propriétaire(s) créé(s))`,
    });
    return NextResponse.json({ data: result }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
