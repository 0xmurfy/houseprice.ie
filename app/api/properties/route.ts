import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Force the route to be dynamic and disable static generation
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    // Get pagination parameters from the request
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const searchTerm = searchParams.get('search')?.toLowerCase();
    const start = (page - 1) * limit;
    const end = start + limit - 1;

    let query = supabase
      .from('property_sale')
      .select('*', { count: 'exact' });

    // Add search functionality if search term is provided
    if (searchTerm) {
      query = query.or(
        `address.ilike.%${searchTerm}%,eircode.ilike.%${searchTerm}%,county.ilike.%${searchTerm}%`
      );
    }

    // Get properties with pagination and search
    const { data: properties, error: queryError, count } = await query
      .order('id', { ascending: false })
      .range(start, end);

    if (queryError) {
      console.error('Error fetching properties:', queryError);
      return NextResponse.json({ 
        error: 'Database Query Error',
        details: queryError.message
      }, { status: 500 });
    }

    return NextResponse.json({
      properties,
      total: count,
      page,
      limit
    });
  } catch (error) {
    console.error('Error in GET /api/properties:', error);
    return NextResponse.json({ 
      error: 'Internal Server Error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 