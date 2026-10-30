import { NextResponse } from 'next/server';
import { tenantSchema } from '@/lib/validations';
import { handleApiError, requireApiUser } from '@/server/http';
import { createTenant, listTenants } from '@/server/services/tenants.service';
import { logActivity } from '@/server/activity';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const user = await requireApiUser('tenants:read');
    return NextResponse.json({ data: await listTenants(user.organizationId) });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireApiUser('tenants:write');
    const input = tenantSchema.parse(await request.json());
    const tenant = await createTenant(user.organizationId, input);
    await logActivity({
      organizationId: user.organizationId,
      actorId: user.id,
      actorName: `${user.firstName} ${user.lastName}`,
      action: 'tenant.create',
      entityType: 'Tenant',
      entityId: tenant.id,
      description: `Locataire ${tenant.firstName} ${tenant.lastName} créé`,
    });
    return NextResponse.json({ data: tenant }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
