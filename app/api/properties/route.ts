import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

// Trigger new deployment with updated Supabase host configuration
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

function getPoolConfig() {
  // If DATABASE_URL is provided (common in production), use it
  if (process.env.DATABASE_URL) {
    return {
      connectionString: process.env.DATABASE_URL,
      ssl: {
        rejectUnauthorized: false
      }
    };
  }

  // Otherwise, use individual config variables
  return {
    host: process.env.POSTGRES_HOST?.replace('db.', ''), // Remove 'db.' prefix if present
    port: 5432,
    user: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD,
    database: process.env.POSTGRES_DATABASE,
    ssl: {
      rejectUnauthorized: false
    }
  };
}

export async function GET(request: NextRequest) {
  let pool: Pool | null = null;
  
  try {
    // Log environment variables (excluding sensitive data)
    console.log('Environment:', {
      NODE_ENV: process.env.NODE_ENV,
      DATABASE_URL: process.env.DATABASE_URL ? 'Set' : 'Not set',
      POSTGRES_HOST: process.env.POSTGRES_HOST || 'Not set',
      hasUser: !!process.env.POSTGRES_USER,
      hasPassword: !!process.env.POSTGRES_PASSWORD,
      hasDatabase: !!process.env.POSTGRES_DATABASE
    });

    // Parse and validate query parameters
    const searchParams = request.nextUrl.searchParams;
    const params = validateAndParseQueryParams(searchParams);
    const offset = (params.page - 1) * params.limit;

    console.log('Attempting database connection...');

    // Get database configuration
    const poolConfig = getPoolConfig();

    // Log non-sensitive config
    console.log('Pool config (excluding sensitive data):', {
      host: poolConfig.connectionString ? 'Using connection string' : poolConfig.host,
      ssl: poolConfig.ssl ? 'Enabled with sslmode=require' : 'Disabled'
    });

    if (!process.env.DATABASE_URL && !process.env.POSTGRES_HOST) {
      throw new Error('Database configuration is missing. Please set either DATABASE_URL or individual database environment variables.');
    }

    pool = new Pool(poolConfig);

    // Test the connection with a timeout
    console.log('Testing database connection...');
    const connectionTestPromise = pool.query('SELECT NOW()');
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Database connection timeout')), 5000)
    );
    await Promise.race([connectionTestPromise, timeoutPromise]);
    console.log('Database connection successful');

    // Build where clause and get values for parameterized query
    const { whereClause, values } = buildWhereClause(params);
    
    // Log the queries being executed (without values for security)
    console.log('Executing count query:', `SELECT COUNT(*) FROM property_sale ${whereClause}`);
    
    // Get total count with filters
    const countQuery = `
      SELECT COUNT(*) 
      FROM property_sale 
      ${whereClause}
    `;
    const countResult = await pool.query(countQuery, values);
    const total = parseInt(countResult.rows[0].count);
    console.log('Total count:', total);

    // Log the main query
    console.log('Executing properties query:', `SELECT * FROM property_sale ${whereClause} ORDER BY ${params.sortBy} ${params.sortDirection} LIMIT $${values.length + 1} OFFSET $${values.length + 2}`);

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

    console.log(`Found ${propertiesResult.rows.length} properties`);

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
    
    // Enhanced error logging
    if (error instanceof Error) {
      console.error('Detailed error information:', {
        name: error.name,
        message: error.message,
        stack: error.stack,
        cause: error.cause
      });

      if (error.message.includes('Invalid')) {
        return NextResponse.json({ 
          error: 'Validation Error', 
          details: error.message 
        }, { status: 400 });
      }
      
      // Check for specific database errors
      if (error.message.includes('connect')) {
        return NextResponse.json({ 
          error: 'Database Connection Error', 
          details: 'Failed to connect to database. Please check database configuration.'
        }, { status: 500 });
      }
    }

    return NextResponse.json({ 
      error: 'Internal Server Error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });

  } finally {
    // Ensure pool is always closed
    if (pool) {
      try {
        await pool.end();
        console.log('Database pool closed successfully');
      } catch (closeError) {
        console.error('Error closing database pool:', closeError);
      }
    }
  }
} 