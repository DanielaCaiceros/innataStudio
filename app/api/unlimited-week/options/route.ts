// app/api/unlimited-week/options/route.ts
import { NextResponse } from 'next/server';
import { getAvailableWeekOptions } from '@/lib/utils/unlimited-week';

export async function GET() {
  try {
    const weekOptions = getAvailableWeekOptions();
    
    return NextResponse.json({
      weekOptions,
      currentDate: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error getting week options:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
