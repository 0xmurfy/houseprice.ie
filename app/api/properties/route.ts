import { NextRequest, NextResponse } from 'next/server';
import { getDataSource } from '@/lib/database';
import { PropertySale } from '@/lib/entities/PropertySale';
import { Like, Between, FindOptionsWhere, ILike } from 'typeorm';

export async function GET(request: NextRequest) {
  try {
    console.log('Connecting to database...');
    const dataSource = await getDataSource();
    console.log('Database connected successfully');
    
    const searchParams = request.nextUrl.searchParams;
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50')));
    const search = searchParams.get('search') || '';
    const year = searchParams.get('year');
    const minPrice = searchParams.get('minPrice');
    const maxPrice = searchParams.get('maxPrice');

    console.log('Request parameters:', { page, limit, search, year, minPrice, maxPrice });

    const skip = (page - 1) * limit;

    // Build where clause
    const where: FindOptionsWhere<PropertySale> = {};
    
    if (search) {
      // Case-insensitive search across multiple fields
      where.fullAddress = ILike(`%${search}%`);
    }

    if (year) {
      const yearNum = parseInt(year);
      if (!isNaN(yearNum)) {
        where.year = yearNum;
      }
    }

    if (minPrice || maxPrice) {
      where.price = Between(
        minPrice ? parseFloat(minPrice) : 0,
        maxPrice ? parseFloat(maxPrice) : Number.MAX_VALUE
      );
    }

    console.log('Executing query with params:', { where, limit, skip });
    const [properties, total] = await dataSource.getRepository(PropertySale).findAndCount({
      where,
      order: {
        year: 'DESC',
        saleDate: 'DESC',
      },
      take: limit,
      skip,
    });

    console.log(`Found ${properties.length} properties out of ${total} total`);
    if (properties.length > 0) {
      console.log('First property:', properties[0]);
    }

    return NextResponse.json({
      properties,
      total,
      page,
      limit,
    });
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