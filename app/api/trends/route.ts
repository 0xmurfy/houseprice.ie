import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

// Force dynamic route
export const dynamic = "force-dynamic";
export const revalidate = false;

export async function GET() {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Get average price, median price, and total sales for the last 30 days
    const { data, error } = await supabase
      .from('property_sale')
      .select('price')
      .gte('saleDate', thirtyDaysAgo.toISOString());

    if (error) {
      console.error('Error fetching trends:', error);
      return NextResponse.json(
        { error: "Database Query Error", details: error.message },
        { status: 500 }
      );
    }

    if (!data || data.length === 0) {
      return NextResponse.json({
        averagePrice: 0,
        medianPrice: 0,
        totalSales: 0,
        timeframe: "Last 30 days"
      });
    }

    // Calculate average
    const prices = data.map(sale => sale.price);
    const averagePrice = prices.reduce((a, b) => a + b, 0) / prices.length;

    // Calculate median
    const sortedPrices = [...prices].sort((a, b) => a - b);
    const midPoint = Math.floor(sortedPrices.length / 2);
    const medianPrice = sortedPrices.length % 2 === 0
      ? (sortedPrices[midPoint - 1] + sortedPrices[midPoint]) / 2
      : sortedPrices[midPoint];

    return NextResponse.json({
      averagePrice,
      medianPrice,
      totalSales: prices.length,
      timeframe: "Last 30 days"
    });
  } catch (error) {
    console.error("Error in GET /api/trends:", error);
    return NextResponse.json(
      {
        error: "Internal Server Error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
} 