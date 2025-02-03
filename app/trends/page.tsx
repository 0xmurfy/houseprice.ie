"use client";

import * as React from "react";
import { useEffect, useState } from "react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Line, ComposedChart, ResponsiveContainer } from "recharts";
import { TrendingUp, TrendingDown } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

interface PriceComparison {
  month: string;
  dublin: number;
  other: number;
}

interface TrendsData {
  averagePrice: number;
  medianPrice: number;
  totalSales: number;
  timeframe: string;
}

const chartConfig = {
  dublin: {
    label: "Dublin",
    color: "hsl(var(--emerald-600))",
  },
  other: {
    label: "Rest of Ireland",
    color: "hsl(var(--emerald-400))",
  },
} satisfies ChartConfig;

function calculateTrendData(data: PriceComparison[]) {
  // Calculate trend line data points
  const dublinPrices = data.map(d => d.dublin);
  const otherPrices = data.map(d => d.other);

  // Calculate monthly appreciation (average of last 3 months vs first 3 months)
  const firstThreeMonthsAvg = {
    dublin: dublinPrices.slice(0, 3).reduce((a, b) => a + b, 0) / 3,
    other: otherPrices.slice(0, 3).reduce((a, b) => a + b, 0) / 3
  };
  const lastThreeMonthsAvg = {
    dublin: dublinPrices.slice(-3).reduce((a, b) => a + b, 0) / 3,
    other: otherPrices.slice(-3).reduce((a, b) => a + b, 0) / 3
  };

  const monthlyAppreciation = {
    dublin: ((lastThreeMonthsAvg.dublin - firstThreeMonthsAvg.dublin) / firstThreeMonthsAvg.dublin) / 9 * 100,
    other: ((lastThreeMonthsAvg.other - firstThreeMonthsAvg.other) / firstThreeMonthsAvg.other) / 9 * 100
  };

  // Calculate total appreciation over the year
  const annualAppreciation = {
    dublin: ((lastThreeMonthsAvg.dublin - firstThreeMonthsAvg.dublin) / firstThreeMonthsAvg.dublin) * 100,
    other: ((lastThreeMonthsAvg.other - firstThreeMonthsAvg.other) / firstThreeMonthsAvg.other) * 100
  };

  return {
    dublinTrend: dublinPrices.map((price, i) => ({
      month: data[i].month,
      value: firstThreeMonthsAvg.dublin + (i * (lastThreeMonthsAvg.dublin - firstThreeMonthsAvg.dublin) / (data.length - 1))
    })),
    otherTrend: otherPrices.map((price, i) => ({
      month: data[i].month,
      value: firstThreeMonthsAvg.other + (i * (lastThreeMonthsAvg.other - firstThreeMonthsAvg.other) / (data.length - 1))
    })),
    monthlyAppreciation,
    annualAppreciation
  };
}

export default function TrendsPage() {
  const [trendsData, setTrendsData] = useState<TrendsData | null>(null);
  const [priceComparison, setPriceComparison] = useState<PriceComparison[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [trendsResponse, comparisonResponse] = await Promise.all([
          fetch("/api/trends"),
          fetch("/api/price-comparison")
        ]);

        if (!trendsResponse.ok || !comparisonResponse.ok) {
          throw new Error("Failed to fetch data");
        }

        const [trendsResult, comparisonData] = await Promise.all([
          trendsResponse.json(),
          comparisonResponse.json()
        ]);

        setTrendsData(trendsResult);
        setPriceComparison(comparisonData);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IE", {
      style: "currency",
      currency: "EUR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatCompactCurrency = (amount: number) => {
    if (amount >= 1_000_000) {
      return `€${(amount / 1_000_000).toFixed(1)}M`;
    }
    if (amount >= 1_000) {
      return `€${(amount / 1_000).toFixed(0)}K`;
    }
    return `€${amount}`;
  };

  const formatPercentage = (value: number) => {
    return new Intl.NumberFormat("en-IE", {
      style: "percent",
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    }).format(value / 100);
  };

  if (loading) {
    return <div className="text-center py-8">Loading trends...</div>;
  }

  if (error) {
    return <div className="text-center py-8 text-red-500">{error}</div>;
  }

  if (!trendsData || priceComparison.length === 0) {
    return null;
  }

  const { dublinTrend, otherTrend, monthlyAppreciation, annualAppreciation } = calculateTrendData(priceComparison);
  const chartData = priceComparison.map((d, i) => ({
    ...d,
    dublinTrend: dublinTrend[i].value,
    otherTrend: otherTrend[i].value
  }));

  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-10">
        <div className="space-y-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Market Trends</h1>
            <p className="text-muted-foreground mt-2">
              Analysis of property market trends in Ireland
            </p>
          </div>

          <div className="grid grid-cols-1 gap-8">
            <div className="w-full">
              <Card className="w-full">
                <CardHeader>
                  <CardTitle>Average Property Prices</CardTitle>
                  <CardDescription>
                    Monthly comparison between Dublin and the rest of Ireland (2024)
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="w-full h-[200px] sm:h-[300px]">
                    <ChartContainer className="w-full h-full" config={chartConfig}>
                      <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart 
                          data={chartData} 
                          margin={{ 
                            top: 10, 
                            right: 5, 
                            bottom: 20, 
                            left: 10
                          }}
                        >
                          <CartesianGrid vertical={false} strokeDasharray="3 3" />
                          <XAxis
                            dataKey="month"
                            tickLine={false}
                            tickMargin={10}
                            axisLine={false}
                            tickFormatter={(value) => value.slice(0, 3)}
                            fontSize={12}
                          />
                          <YAxis
                            tickLine={false}
                            tickMargin={5}
                            axisLine={false}
                            tickFormatter={formatCompactCurrency}
                            fontSize={12}
                            width={40}
                            dx={-5}
                          />
                          <ChartTooltip
                            cursor={false}
                            content={<ChartTooltipContent 
                              formatter={(value) => formatCurrency(Number(value))}
                              indicator="dashed" 
                            />}
                          />
                          <Bar 
                            dataKey="dublin" 
                            fill="hsl(var(--emerald-600))" 
                            radius={4} 
                          />
                          <Bar 
                            dataKey="other" 
                            fill="hsl(var(--emerald-400))" 
                            radius={4} 
                          />
                          <Line
                            type="monotone"
                            dataKey="dublinTrend"
                            stroke="hsl(var(--emerald-600))"
                            strokeDasharray="4 4"
                            dot={false}
                          />
                          <Line
                            type="monotone"
                            dataKey="otherTrend"
                            stroke="hsl(var(--emerald-400))"
                            strokeDasharray="4 4"
                            dot={false}
                          />
                        </ComposedChart>
                      </ResponsiveContainer>
                    </ChartContainer>
                  </div>
                </CardContent>
                <CardFooter className="flex-col items-start gap-4 text-sm">
                  <div className="flex flex-col sm:flex-row gap-4 sm:gap-8 w-full">
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">Dublin:</span>
                        <span className={monthlyAppreciation.dublin >= 0 ? "text-emerald-600" : "text-red-600"}>
                          {monthlyAppreciation.dublin >= 0 ? (
                            <TrendingUp className="inline h-4 w-4" />
                          ) : (
                            <TrendingDown className="inline h-4 w-4" />
                          )}
                          {formatPercentage(monthlyAppreciation.dublin)}
                          <span className="text-muted-foreground ml-1">/ month</span>
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">Total:</span>
                        <span className={annualAppreciation.dublin >= 0 ? "text-emerald-600" : "text-red-600"}>
                          {formatPercentage(annualAppreciation.dublin)}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">Rest of Ireland:</span>
                        <span className={monthlyAppreciation.other >= 0 ? "text-emerald-600" : "text-red-600"}>
                          {monthlyAppreciation.other >= 0 ? (
                            <TrendingUp className="inline h-4 w-4" />
                          ) : (
                            <TrendingDown className="inline h-4 w-4" />
                          )}
                          {formatPercentage(monthlyAppreciation.other)}
                          <span className="text-muted-foreground ml-1">/ month</span>
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">Total:</span>
                        <span className={annualAppreciation.other >= 0 ? "text-emerald-600" : "text-red-600"}>
                          {formatPercentage(annualAppreciation.other)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="text-muted-foreground">
                    Price appreciation over the last 12 months
                  </div>
                </CardFooter>
              </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <Card>
                <CardHeader>
                  <CardTitle>Average Price</CardTitle>
                  <CardDescription>Last 30 days</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {formatCurrency(trendsData.averagePrice)}
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    Based on {trendsData.totalSales} sales
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Median Price</CardTitle>
                  <CardDescription>Last 30 days</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {formatCurrency(trendsData.medianPrice)}
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    Based on {trendsData.totalSales} sales
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Total Sales</CardTitle>
                  <CardDescription>Last 30 days</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {trendsData.totalSales.toLocaleString()}
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    {trendsData.timeframe}
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
} 