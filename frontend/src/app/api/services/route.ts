import { NextResponse } from 'next/server';
import { ApiRequestError } from '@/lib/api/client';
import { getServices } from '@/lib/api/services';

export const dynamic = 'force-dynamic';

// Lets the browser refetch services (retry after an error) without calling the Express backend directly.
export async function GET() {
  try {
    return NextResponse.json({ success: true, data: await getServices() });
  } catch (err) {
    if (err instanceof ApiRequestError) {
      return NextResponse.json({ success: false, message: err.message }, { status: err.status >= 400 ? err.status : 502 });
    }
    return NextResponse.json({ success: false, message: 'Unable to load services.' }, { status: 500 });
  }
}
