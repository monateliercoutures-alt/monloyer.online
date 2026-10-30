import { NextResponse } from 'next/server';
import { unitSchema } from '@/lib/validations';
import { handleApiError, requireApiUser } from '@/server/http';
import { createUnit } from '@/server/services/properties.service';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const user = await requireApiUser('properties:write');
    const input = unitSchema.parse(await request.json());
    return NextResponse.json({ data: await createUnit(user.organizationId, input) }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
