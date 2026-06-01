import { NextRequest, NextResponse } from 'next/server';
import { FILTER_PRESETS } from '@/lib/filterEngine';
import { FilterPreset } from '@/types';

// In-memory preset storage initialized with the standard presets
const presetDatabase: FilterPreset[] = [...FILTER_PRESETS] as unknown as FilterPreset[];

export async function GET(request: NextRequest) {
  const start = performance.now();

  return NextResponse.json({
    success: true,
    data: presetDatabase,
    meta: {
      total: presetDatabase.length,
      page: 1,
      pageSize: presetDatabase.length,
      timestamp: new Date().toISOString(),
      executionTimeMs: Math.round(performance.now() - start),
    },
  });
}

export async function POST(request: NextRequest) {
  const start = performance.now();
  try {
    const payload = await request.json();
    if (!payload.name || !payload.filters) {
      return NextResponse.json({
        success: false,
        data: null,
        meta: {
          total: 0,
          page: 1,
          pageSize: 0,
          timestamp: new Date().toISOString(),
          executionTimeMs: Math.round(performance.now() - start),
        },
        error: {
          code: 'BAD_REQUEST',
          message: 'Missing required fields: name or filters',
        },
      }, { status: 400 });
    }

    const newPreset: FilterPreset = {
      id: payload.id || `custom_${Date.now()}`,
      name: payload.name,
      description: payload.description || 'Custom user saved filter preset',
      filters: payload.filters,
    };

    presetDatabase.push(newPreset);

    return NextResponse.json({
      success: true,
      data: newPreset,
      meta: {
        total: 1,
        page: 1,
        pageSize: 1,
        timestamp: new Date().toISOString(),
        executionTimeMs: Math.round(performance.now() - start),
      },
    }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({
      success: false,
      data: null,
      meta: {
        total: 0,
        page: 1,
        pageSize: 0,
        timestamp: new Date().toISOString(),
        executionTimeMs: Math.round(performance.now() - start),
      },
      error: {
        code: 'PARSE_ERROR',
        message: err.message || 'Invalid JSON body',
      },
    }, { status: 400 });
  }
}
