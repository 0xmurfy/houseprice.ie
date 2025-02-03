import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";
export const revalidate = false;

async function fetchAllData(query: any) {
  let allData: any[] = [];
  let page = 0;
  const pageSize = 1000;
  
  while (true) {
    const { data, error, count } = await query
      .range(page * pageSize, (page + 1) * pageSize - 1);
    
    if (error) throw error;
    if (!data || data.length === 0) break;
    
    allData = allData.concat(data);
    if (data.length < pageSize) break;
    page++;
  }
  
  return allData;
}

export async function GET() {
  try {
    // Set date range for 2024 (January through December)
    const startDate = new Date(2024, 0, 1); // January 1, 2024
    const endDate = new Date(2024, 11, 31); // December 31, 2024

    // Format dates for SQL
    const startDateStr = startDate.toISOString().slice(0, 10); // YYYY-MM-DD
    const endDateStr = endDate.toISOString().slice(0, 10);

    console.log('Date range:', {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      startDateStr,
      endDateStr
    });

    // Query for Dublin
    const dublinQuery = supabase
      .from('property_sale')
      .select('price, saleDate', { count: 'exact' })
      .eq('county', 'Dublin')
      .gte('saleDate', startDateStr)
      .lte('saleDate', endDateStr)
      .order('saleDate', { ascending: true });

    // Query for rest of country
    const otherQuery = supabase
      .from('property_sale')
      .select('price, saleDate', { count: 'exact' })
      .neq('county', 'Dublin')
      .gte('saleDate', startDateStr)
      .lte('saleDate', endDateStr)
      .order('saleDate', { ascending: true });

    // Fetch all data with pagination
    const [dublinData, otherData] = await Promise.all([
      fetchAllData(dublinQuery),
      fetchAllData(otherQuery)
    ]);

    console.log('Raw data ranges:', {
      dublin: dublinData.length ? {
        first: dublinData[0].saleDate,
        last: dublinData[dublinData.length - 1].saleDate,
        count: dublinData.length
      } : 'no data',
      other: otherData.length ? {
        first: otherData[0].saleDate,
        last: otherData[otherData.length - 1].saleDate,
        count: otherData.length
      } : 'no data'
    });

    // Create array of months for 2024
    const months = Array.from({ length: 12 }, (_, i) => {
      const monthDate = new Date(2024, i, 1);
      const monthEnd = new Date(2024, i + 1, 0);
      
      return {
        start: monthDate.toISOString().slice(0, 10),
        end: monthEnd.toISOString().slice(0, 10),
        label: monthDate.toLocaleDateString('en-IE', { month: 'short', year: 'numeric' })
      };
    });

    // Process data by month
    const monthlyData = months.map(month => {
      // Filter and calculate average for Dublin
      const dublinMonth = dublinData.filter(sale => {
        const saleDate = sale.saleDate.slice(0, 10);
        return saleDate >= month.start && saleDate <= month.end;
      });

      const dublinAvg = dublinMonth.length > 0
        ? dublinMonth.reduce((sum, sale) => sum + sale.price, 0) / dublinMonth.length
        : 0;

      // Filter and calculate average for rest of country
      const otherMonth = otherData.filter(sale => {
        const saleDate = sale.saleDate.slice(0, 10);
        return saleDate >= month.start && saleDate <= month.end;
      });

      const otherAvg = otherMonth.length > 0
        ? otherMonth.reduce((sum, sale) => sum + sale.price, 0) / otherMonth.length
        : 0;

      console.log('Month data:', {
        month: month.label,
        dublinCount: dublinMonth.length,
        otherCount: otherMonth.length,
        dublinAvg: Math.round(dublinAvg),
        otherAvg: Math.round(otherAvg)
      });

      return {
        month: month.label,
        dublin: Math.round(dublinAvg),
        other: Math.round(otherAvg)
      };
    });

    return NextResponse.json(monthlyData);
  } catch (error) {
    console.error("Error in GET /api/price-comparison:", error);
    return NextResponse.json(
      {
        error: "Internal Server Error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
} 