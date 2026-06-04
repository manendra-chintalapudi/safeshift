// ============================================================================
// API Utilities — Standard response helpers
// ============================================================================

import { NextResponse } from 'next/server';
import { ZodError, type ZodSchema } from 'zod';

/**
 * Parse and validate request body against a Zod schema
 */
export async function parseBody<T>(request: Request, schema: ZodSchema<T>): Promise<T> {
  const body = await request.json();
  return schema.parse(body);
}

/**
 * Standard error response handler
 */
export function errorResponse(error: unknown, status = 500) {
  if (error instanceof ZodError) {
    return NextResponse.json(
      { error: 'Validation error', details: error.issues },
      { status: 400 }
    );
  }

  const message = error instanceof Error ? error.message : 'Internal server error';

  if (message === 'UNAUTHORIZED') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  console.error('[API Error]', error);
  return NextResponse.json({ error: message }, { status });
}

/**
 * Success response helper
 */
export function successResponse<T>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}
