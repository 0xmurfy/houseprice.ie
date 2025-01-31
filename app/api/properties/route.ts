import { NextRequest, NextResponse } from 'next/server';
import { Pool, PoolClient, QueryConfig } from 'pg';

// Create a singleton pool instance
let pool: Pool | null = null;

function getPool() {
  if (pool) return pool;

  const config = getPoolConfig();
  pool = new Pool(config);

  // Handle pool errors
  pool.on('error', (err) => {
    console.error('Unexpected error on idle client', err);
    pool = null;
  });

  return pool;
}

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
      },
      connectionTimeoutMillis: 30000, // 30 seconds
      query_timeout: 30000, // 30 seconds
      statement_timeout: 30000, // 30 seconds
      idle_in_transaction_session_timeout: 30000, // 30 seconds
      max: 20, // Maximum number of clients in the pool
      idleTimeoutMillis: 30000 // How long a client is allowed to remain idle before being closed
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
    },
    connectionTimeoutMillis: 30000, // 30 seconds
    query_timeout: 30000, // 30 seconds
    statement_timeout: 30000, // 30 seconds
    idle_in_transaction_session_timeout: 30000, // 30 seconds
    max: 20, // Maximum number of clients in the pool
    idleTimeoutMillis: 30000 // How long a client is allowed to remain idle before being closed
  };
}

export async function GET(request: NextRequest) {
  let client: PoolClient | null = null;
  
  try {
    // Set response timeout
    const abortController = new AbortController();
    const timeoutId = setTimeout(() => {
      abortController.abort();
    }, 25000); // 25 second timeout

    request.signal.addEventListener('abort', () => {
      clearTimeout(timeoutId);
      if (client) {
        client.release();
      }
    });

    // Log environment variables (excluding sensitive data)
    console.log('Environment:', {
      NODE_ENV: process.env.NODE_ENV,
      DATABASE_URL: process.env.DATABASE_URL ? 'Set' : 'Not set',
      POSTGRES_HOST: process.env.POSTGRES_HOST || 'Not set',
      hasUser: !!process.env.POSTGRES_USER,
      hasPassword: !!process.env.POSTGRES_PASSWORD,
      hasDatabase: !!process.env.POSTGRES_DATABASE
    });

    if (!process.env.DATABASE_URL && !process.env.POSTGRES_HOST) {
      return NextResponse.json({ 
        error: 'Configuration Error',
        details: 'Database configuration is missing'
      }, { status: 500 });
    }

    // Get or create pool
    const pool = getPool();

    // Test the connection with a timeout
    console.log('Testing database connection...');
    try {
      const clientPromise = pool.connect();
      const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Connection timeout after 10 seconds')), 10000)
      );
      
      client = await Promise.race([clientPromise, timeoutPromise]);
      console.log('Successfully acquired client from pool');
      
      const testQuery: QueryConfig = {
        text: 'SELECT NOW()',
        values: [],
        name: 'connection-test'
      };
      
      const testResult = await client.query<[Date]>(testQuery);
      console.log('Database connection test successful:', testResult.rows[0]);
    } catch (connError) {
      console.error('Database connection test failed:', connError);
      return NextResponse.json({ 
        error: 'Database Connection Error',
        details: 'Could not establish database connection',
        technical_details: connError instanceof Error ? connError.message : 'Unknown error'
      }, { status: 503 });
    }

    // Parse and validate query parameters
    const searchParams = request.nextUrl.searchParams;
    const params = validateAndParseQueryParams(searchParams);
    const offset = (params.page - 1) * params.limit;

    // Build where clause and get values for parameterized query
    const { whereClause, values } = buildWhereClause(params);
    
    // Get total count with filters
    const countQuery: QueryConfig = {
      text: `SELECT COUNT(*) FROM property_sale ${whereClause}`,
      values,
      name: 'count-query'
    };
    console.log('Executing count query:', countQuery.text);
    
    const countResult = await client.query<{ count: string }>(countQuery);
    const total = parseInt(countResult.rows[0].count);
    console.log('Total count:', total);

    // Get filtered and sorted properties
    const propertiesQuery: QueryConfig = {
      text: `
        SELECT *
        FROM property_sale 
        ${whereClause}
        ORDER BY ${params.sortBy} ${params.sortDirection}
        LIMIT $${values.length + 1} OFFSET $${values.length + 2}
      `,
      values: [...values, params.limit, offset],
      name: 'properties-query'
    };
    console.log('Executing properties query:', propertiesQuery.text);

    const propertiesResult = await client.query(propertiesQuery);
    console.log(`Found ${propertiesResult.rows.length} properties`);
    clearTimeout(timeoutId);

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
    console.error('Detailed error in GET /api/properties:', error);
    
    if (error instanceof Error) {
      console.error('Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack,
        cause: error.cause
      });

      // Handle specific error types
      if (error.message.includes('timeout') || error.name === 'AbortError') {
        return NextResponse.json({ 
          error: 'Request Timeout',
          details: 'The request took too long to process. Please try again.',
          technical_details: error.message
        }, { status: 504 });
      }

      if (error.message.includes('Invalid')) {
        return NextResponse.json({ 
          error: 'Validation Error',
          details: error.message
        }, { status: 400 });
      }
      
      if (error.message.includes('connect') || error.message.includes('database')) {
        return NextResponse.json({ 
          error: 'Database Error',
          details: 'Database connection failed. Please try again later.',
          technical_details: error.message
        }, { status: 503 });
      }
    }

    // Generic error response
    return NextResponse.json({ 
      error: 'Internal Server Error',
      details: error instanceof Error ? error.message : 'An unexpected error occurred'
    }, { status: 500 });

  } finally {
    // Release the client back to the pool
    if (client) {
      client.release();
      console.log('Client released back to pool');
    }
  }
} 