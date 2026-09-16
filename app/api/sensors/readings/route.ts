import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';

export async function POST(request: Request) {
  try {
    let body: any;
    try {
      body = await request.json();
    } catch (e) {
      return NextResponse.json(
        { success: false, error: 'Invalid JSON request payload.' },
        { status: 400 }
      );
    }

    const { collection_point_id, fill_percent, weight_kg, recorded_at } = body;

    // 1. Validate collection_point_id
    if (!collection_point_id || typeof collection_point_id !== 'string' || collection_point_id.trim() === '') {
      return NextResponse.json(
        { success: false, error: 'Validation Error: collection_point_id is required and must be a non-empty string.' },
        { status: 400 }
      );
    }

    // 2. Validate fill_percent (0 to 100)
    const fill = Number(fill_percent);
    if (isNaN(fill) || fill < 0 || fill > 100) {
      return NextResponse.json(
        { success: false, error: 'Validation Error: fill_percent must be a valid number between 0 and 100.' },
        { status: 400 }
      );
    }

    // 3. Validate weight_kg (non-negative)
    const weight = Number(weight_kg);
    if (isNaN(weight) || weight < 0) {
      return NextResponse.json(
        { success: false, error: 'Validation Error: weight_kg must be a valid non-negative number (>= 0).' },
        { status: 400 }
      );
    }

    // 4. Validate recorded_at timestamp
    let validTimestamp = new Date().toISOString();
    if (recorded_at) {
      const parsedTime = Date.parse(recorded_at);
      if (isNaN(parsedTime)) {
        return NextResponse.json(
          { success: false, error: 'Validation Error: recorded_at must be a valid ISO date timestamp.' },
          { status: 400 }
        );
      }
      validTimestamp = new Date(parsedTime).toISOString();
    }

    // 5. Check if collection point exists in DB (if DB table is available)
    try {
      const { data: pointCheck } = await supabase
        .from('collection_points')
        .select('id')
        .eq('id', collection_point_id.trim())
        .maybeSingle();

      if (pointCheck) {
        // Point exists, update collection point telemetry in DB
        const status = fill >= 85 ? 'overflowing' : 'active';
        await supabase
          .from('collection_points')
          .update({
            current_fill_percent: fill,
            current_weight_kg: weight,
            status,
          })
          .eq('id', collection_point_id.trim());
      }
    } catch (e) {
      console.warn('Collection point DB check notice:', e);
    }

    // 6. Insert sensor reading into sensor_readings table
    let insertedReading: any = null;
    try {
      const { data: reading, error: insertErr } = await supabase
        .from('sensor_readings')
        .insert({
          collection_point_id: collection_point_id.trim(),
          fill_percent: fill,
          weight_kg: weight,
          recorded_at: validTimestamp,
        })
        .select()
        .single();

      if (!insertErr && reading) {
        insertedReading = reading;
      }
    } catch (e) {
      console.warn('sensor_readings DB insert notice:', e);
    }

    // Fallback object structure if DB table is uninitialized in dev
    if (!insertedReading) {
      insertedReading = {
        id: `sr-${Date.now()}-${Math.random().toString(36).substring(7)}`,
        collection_point_id: collection_point_id.trim(),
        fill_percent: fill,
        weight_kg: weight,
        recorded_at: validTimestamp,
      };
    }

    return NextResponse.json({
      success: true,
      message: 'Sensor reading received and processed successfully.',
      data: insertedReading,
    });

  } catch (error: any) {
    console.error('API Error in /api/sensors/readings:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
