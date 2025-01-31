import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

export async function GET(request: NextRequest) {
  try {
    console.log('Creating database pool...');
    const pool = new Pool({
      host: process.env.POSTGRES_HOST,
      port: 5432,
      user: process.env.POSTGRES_USER,
      password: process.env.POSTGRES_PASSWORD,
      database: process.env.POSTGRES_DATABASE,
      ssl: process.env.NODE_ENV === "production" ? {
        rejectUnauthorized: false
      } : false
    });

    try {
      // First, let's check the table structure
      const tableInfo = await pool.query(`
        SELECT column_name, data_type, column_default 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'property_sale'
        ORDER BY ordinal_position;
      `);

      console.log('Table structure:', tableInfo.rows);

      // Get a sample row to see the actual data
      const sampleData = await pool.query('SELECT * FROM property_sale LIMIT 1');
      console.log('Sample data:', sampleData.rows[0]);

      // Get pagination parameters from the request
      const searchParams = request.nextUrl.searchParams;
      const page = parseInt(searchParams.get('page') || '1');
      const limit = parseInt(searchParams.get('limit') || '50');
      const offset = (page - 1) * limit;

      // Get total count of properties
      const countResult = await pool.query('SELECT COUNT(*) FROM property_sale');
      const total = parseInt(countResult.rows[0].count);

      // Get properties with pagination (we'll update the column names based on the table info)
      const propertiesResult = await pool.query(`
        SELECT *
        FROM property_sale 
        ORDER BY id DESC 
        LIMIT $1 OFFSET $2
      `, [limit, offset]);

      await pool.end();

      return NextResponse.json({
        properties: propertiesResult.rows,
        total: total,
        page: page,
        limit: limit
      });
    } catch (queryError) {
      console.error('Database query error:', queryError);
      if (queryError instanceof Error) {
        console.error('Full error details:', {
          message: queryError.message,
          stack: queryError.stack,
          name: queryError.name
        });
      }
      await pool.end();
      return NextResponse.json({ 
        error: 'Database Query Error',
        details: queryError instanceof Error ? queryError.message : 'Failed to execute database query'
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Error in GET /api/properties:', error);
    if (error instanceof Error) {
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
  }
} 