import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

// Define valid sort fields and directions
const VALID_SORT_FIELDS = ['id', 'price', 'saledate', 'year'] as const;
const VALID_SORT_DIRECTIONS = ['asc', 'desc'] as const;

type SortField = typeof VALID_SORT_FIELDS[number];
type SortDirection = typeof VALID_SORT_DIRECTIONS[number];

interface QueryParams {
  page: number;
  limit: number;
  search?: string;
  county?: string;
  minPrice?: number;
  maxPrice?: number;
  year?: number;
  sortBy: SortField;
  sortDirection: SortDirection;
}

function validateAndParseQueryParams(searchParams: URLSearchParams): QueryParams {
  // Parse and validate pagination
  const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50')));

  // Parse and validate sorting
  const sortBy = (searchParams.get('sortBy') || 'id') as SortField;
  const sortDirection = (searchParams.get('sortDirection') || 'desc') as SortDirection;

  if (!VALID_SORT_FIELDS.includes(sortBy)) {
    throw new Error(`Invalid sort field. Must be one of: ${VALID_SORT_FIELDS.join(', ')}`);
  }
  if (!VALID_SORT_DIRECTIONS.includes(sortDirection)) {
    throw new Error(`Invalid sort direction. Must be one of: ${VALID_SORT_DIRECTIONS.join(', ')}`);
  }

  // Parse and validate numeric filters
  const minPrice = searchParams.get('minPrice') ? parseFloat(searchParams.get('minPrice')!) : undefined;
  const maxPrice = searchParams.get('maxPrice') ? parseFloat(searchParams.get('maxPrice')!) : undefined;
  const year = searchParams.get('year') ? parseInt(searchParams.get('year')!) : undefined;

  if (minPrice && isNaN(minPrice)) throw new Error('Invalid minPrice');
  if (maxPrice && isNaN(maxPrice)) throw new Error('Invalid maxPrice');
  if (year && isNaN(year)) throw new Error('Invalid year');

  // Get other filters
  const search = searchParams.get('search') || undefined;
  const county = searchParams.get('county') || undefined;

  return {
    page,
    limit,
    search,
    county,
    minPrice,
    maxPrice,
    year,
    sortBy,
    sortDirection,
  };
}

function buildWhereClause(params: QueryParams): { whereClause: string; values: any[] } {
  const conditions: string[] = [];
  const values: any[] = [];
  let paramCount = 1;

  // Add search condition
  if (params.search) {
    conditions.push(`(
      address ILIKE $${paramCount} 
      OR county ILIKE $${paramCount}
      OR eircode ILIKE $${paramCount}
    )`);
    values.push(`%${params.search}%`);
    paramCount++;
  }

  // Add county filter
  if (params.county) {
    conditions.push(`county ILIKE $${paramCount}`);
    values.push(`%${params.county}%`);
    paramCount++;
  }

  // Add price range filter
  if (params.minPrice !== undefined) {
    conditions.push(`price >= $${paramCount}`);
    values.push(params.minPrice);
    paramCount++;
  }
  if (params.maxPrice !== undefined) {
    conditions.push(`price <= $${paramCount}`);
    values.push(params.maxPrice);
    paramCount++;
  }

  // Add year filter
  if (params.year !== undefined) {
    conditions.push(`year = $${paramCount}`);
    values.push(params.year);
    paramCount++;
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  return { whereClause, values };
}

export async function GET(request: NextRequest) {
  let pool: Pool | null = null;
  
  try {
    // Parse and validate query parameters
    const searchParams = request.nextUrl.searchParams;
    const params = validateAndParseQueryParams(searchParams);
    const offset = (params.page - 1) * params.limit;

    // Create database pool
    pool = new Pool({
      host: process.env.POSTGRES_HOST,
      port: 5432,
      user: process.env.POSTGRES_USER,
      password: process.env.POSTGRES_PASSWORD,
      database: process.env.POSTGRES_DATABASE,
      ssl: process.env.NODE_ENV === "production" ? {
        rejectUnauthorized: false
      } : false
    });

    // Build where clause and get values for parameterized query
    const { whereClause, values } = buildWhereClause(params);
    
    // Get total count with filters
    const countQuery = `
      SELECT COUNT(*) 
      FROM property_sale 
      ${whereClause}
    `;
    const countResult = await pool.query(countQuery, values);
    const total = parseInt(countResult.rows[0].count);

    // Get filtered and sorted properties
    const propertiesQuery = `
      SELECT *
      FROM property_sale 
      ${whereClause}
      ORDER BY ${params.sortBy} ${params.sortDirection}
      LIMIT $${values.length + 1} OFFSET $${values.length + 2}
    `;
    const propertiesResult = await pool.query(
      propertiesQuery, 
      [...values, params.limit, offset]
    );

    return NextResponse.json({
      properties: propertiesResult.rows,
      total,
      page: params.page,
      limit: params.limit,
      filters: {
        search: params.search,
        county: params.county,
        minPrice: params.minPrice,
        maxPrice: params.maxPrice,
        year: params.year,
      },
      sorting: {
        field: params.sortBy,
        direction: params.sortDirection,
      }
    });

  } catch (error) {
    console.error('Error in GET /api/properties:', error);
    
    // Determine appropriate error response
    if (error instanceof Error) {
      if (error.message.includes('Invalid')) {
        return NextResponse.json({ 
          error: 'Validation Error', 
          details: error.message 
        }, { status: 400 });
      }
      
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
    }

    return NextResponse.json({ 
      error: 'Internal Server Error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });

  } finally {
    // Ensure pool is always closed
    if (pool) {
      await pool.end();
    }
  }
} 