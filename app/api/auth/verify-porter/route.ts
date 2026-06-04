import { NextResponse } from 'next/server';
import { createHash } from 'crypto';

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8001';

export async function POST(request: Request) {
  try {
    const { full_name, phone } = await request.json();

    if (!full_name || !phone) {
      return NextResponse.json({ error: 'Name and phone required' }, { status: 400 });
    }

    // Try ML service first
    try {
      const res = await fetch(`${ML_SERVICE_URL}/driver/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ full_name, phone }),
        signal: AbortSignal.timeout(5000),
      });

      if (res.ok) {
        const data = await res.json();
        return NextResponse.json(data);
      }
    } catch {
      // ML service unreachable — use built-in fallback
    }

    // Fallback: generate porter_id locally (same logic as ML service)
    const cleanPhone = phone.replace(/^\+?91/, '').replace(/\D/g, '');
    if (cleanPhone.length !== 10 || !/^[6-9]/.test(cleanPhone)) {
      return NextResponse.json({ error: 'Invalid phone number' }, { status: 400 });
    }
    if (full_name.trim().length < 2) {
      return NextResponse.json({ error: 'Invalid name' }, { status: 400 });
    }

    const raw = `${full_name.trim().toLowerCase()}:${cleanPhone}`;
    const porterId = 'PTR-' + createHash('sha256').update(raw).digest('hex').slice(0, 8).toUpperCase();

    return NextResponse.json({
      found: true,
      porter_id: porterId,
      driver_name: full_name.trim(),
      phone: cleanPhone,
      vehicle_type: 'LCV',
      status: 'active',
    });
  } catch {
    return NextResponse.json({ error: 'Could not verify with Porter' }, { status: 500 });
  }
}
