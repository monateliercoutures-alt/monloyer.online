import { NextResponse } from 'next/server';
import { propertySchema } from '@/lib/validations';
import { handleApiError, requireApiUser } from '@/server/http';
import { createProperty, listProperties } from '@/server/services/properties.service';
import { logActivity } from '@/server/activity';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const user = await requireApiUser('properties:read');
    return NextResponse.json({ data: await listProperties(user.organizationId) });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireApiUser('properties:write');
    const input = propertySchema.parse(await request.json());
    const property = await createProperty(user.organizationId, input);
    await logActivity({
      organizationId: user.organizationId,
      actorId: user.id,
      actorName: `${user.firstName} ${user.lastName}`,
      action: 'property.create',
      entityType: 'Property',
      entityId: property.id,
      description: `Bien ${property.reference} créé (${property.district})`,
    });
    return NextResponse.json({ data: property }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
