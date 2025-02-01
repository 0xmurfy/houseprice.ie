"use client";

import React, { useEffect, useState, useCallback } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Hero } from "@/components/hero";
import { TableSkeleton } from "@/components/table-skeleton";
import { useDebounce } from "@/lib/hooks";
import { cn } from "@/lib/utils";

interface Property {
  id: number;
  saleDate: string;
  address: string;
  eircode: string | null;
  price: number;
  year: number;
  county: string | null;
  description: string;
}

interface PaginationInfo {
  total: number;
  pages: number;
  currentPage: number;
  perPage: number;
}

export default function Home() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [paginationInfo, setPaginationInfo] = useState<PaginationInfo>({
    total: 0,
    pages: 0,
    currentPage: 1,
    perPage: 50
  });
  const [shouldScroll, setShouldScroll] = useState(false);

  const debouncedSearch = useDebounce(searchTerm, 300);

  const fetchProperties = useCallback(async () => {
    try {
      setLoading(true);
      const searchParams = new URLSearchParams({
        page: currentPage.toString(),
        limit: '50',
      });

      if (debouncedSearch) {
        searchParams.set('search', debouncedSearch);
      }

      console.log('Starting properties fetch...');
      const response = await fetch(`/api/properties?${searchParams.toString()}`);
      console.log('Response received:', response.status, response.statusText);
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('API Error:', errorData);
        throw new Error(errorData.details || 'Failed to fetch properties');
      }
      
      const data = await response.json();
      console.log('Parsed response data:', {
        propertiesCount: data.properties?.length || 0,
        total: data.total,
        firstProperty: data.properties?.[0]
      });
      
      if (!data.properties || !Array.isArray(data.properties)) {
        console.error('Invalid properties data structure:', data);
        throw new Error('Invalid response format');
      }

      setProperties(data.properties);
      setPaginationInfo({
        total: data.total || 0,
        pages: Math.ceil((data.total || 0) / 50),
        currentPage: currentPage,
        perPage: 50
      });
    } catch (error) {
      console.error('Error in fetchProperties:', error);
      setProperties([]);  // Reset properties on error
    } finally {
      setLoading(false);
    }
  }, [currentPage, debouncedSearch]);

  const handlePageChange = async (page: number) => {
    // First scroll to just above the table
    const tableSection = document.querySelector('.table-section');
    if (tableSection) {
      const offset = tableSection.getBoundingClientRect().top + window.scrollY - 48;
      window.scrollTo({
        top: offset,
        behavior: 'smooth'
      });
    }

    // Wait a brief moment for the scroll to complete
    await new Promise(resolve => setTimeout(resolve, 300));

    // Then update the page which will trigger the data fetch
    setCurrentPage(page);
  };

  useEffect(() => {
    fetchProperties();
  }, [fetchProperties]);

  // Function to format date
  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat('en-GB', { 
      day: '2-digit', 
      month: 'short', 
      year: 'numeric' 
    }).format(date);
  };

  // Function to copy text to clipboard
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).catch(err => {
      console.error('Could not copy text: ', err);
    });
  };

  // Function to format price
  const formatPrice = (price: number, description: string): string => {
    // Add 13.5% VAT for new properties
    const finalPrice = description.toLowerCase().includes('new') 
      ? price * 1.135  // Add 13.5% VAT
      : price;

    return new Intl.NumberFormat('en-IE', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(finalPrice);
  };

  // Function to format address in title case
  const formatAddress = (address: string): string => {
    return address
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  // Function to format condition
  const formatCondition = (description: string): string => {
    if (description.toLowerCase().includes('second-hand')) {
      return 'S-Hand';
    }
    if (description.toLowerCase().includes('new')) {
      return 'New';
    }
    return '-';
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  // Function to pad the properties array to always have 50 items
  const padProperties = (props: Property[]): (Property | null)[] => {
    if (props.length >= 50) return props;
    return [...props, ...Array(50 - props.length).fill(null)];
  };

  return (
    <main className="min-h-screen bg-background">
      <div className="hero-section">
        <Hero />
      </div>
      <div className="container mx-auto py-10 space-y-4 table-section">
        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 md:gap-0">
          <h2 className="text-2xl font-semibold">Latest Sales</h2>
          <div className="w-full md:w-1/3">
            <Input
              type="search"
              placeholder="Search by address, eircode, or county..."
              value={searchTerm}
              onChange={handleSearch}
              className="w-full"
            />
          </div>
        </div>

        {loading ? (
          <TableSkeleton />
        ) : properties.length === 0 ? (
          <div className="rounded-md border flex items-center justify-center p-8">
            <p className="text-lg text-muted-foreground">No properties found</p>
          </div>
        ) : (
          <>
            <div className="rounded-md border table-container">
              <Table>
                <TableHeader className="hidden md:table-header-group">
                  <TableRow>
                    <TableHead>Address</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>County</TableHead>
                    <TableHead>Condition</TableHead>
                    <TableHead>Eircode</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {padProperties(properties).map((property, index) => (
                    <TableRow key={property?.id || `empty-${index}`} className="md:table-row flex flex-col p-4 md:p-0">
                      {property ? (
                        <>
                          {/* Mobile Layout */}
                          <div className="md:hidden space-y-2 w-full">
                            {/* Price and Date */}
                            <div className="flex justify-between items-center">
                              <span className="font-medium">{formatPrice(property.price, property.description)}</span>
                              <span className="text-muted-foreground">{formatDate(property.saleDate)}</span>
                            </div>
                            {/* Address */}
                            <div className="truncate">
                              {formatAddress(property.address)}
                            </div>
                            {/* County, Eircode, and Condition */}
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <span>{property.county || '-'}</span>
                              <span>•</span>
                              <span>{property.eircode || '-'}</span>
                              <span>•</span>
                              <Badge 
                                variant={formatCondition(property.description) === 'New' ? 'default' : 'secondary'}
                                className={cn(
                                  "font-medium text-xs",
                                  formatCondition(property.description) === 'New'
                                    ? 'bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/20 dark:bg-emerald-500/15 dark:text-emerald-400 dark:hover:bg-emerald-500/25'
                                    : 'bg-zinc-100 text-zinc-900 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-800/80'
                                )}
                              >
                                {formatCondition(property.description)}
                              </Badge>
                            </div>
                          </div>

                          {/* Desktop Layout */}
                          <TableCell className="font-medium hidden md:table-cell">
                            {formatAddress(property.address)}
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            {formatDate(property.saleDate)}
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            {property.county || '-'}
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            <Badge 
                              variant={formatCondition(property.description) === 'New' ? 'default' : 'secondary'}
                              className={cn(
                                "font-medium w-fit",
                                formatCondition(property.description) === 'New'
                                  ? 'bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/20 dark:bg-emerald-500/15 dark:text-emerald-400 dark:hover:bg-emerald-500/25'
                                  : 'bg-zinc-100 text-zinc-900 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-800/80'
                              )}
                            >
                              {formatCondition(property.description)}
                            </Badge>
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            {property.eircode || '-'}
                          </TableCell>
                          <TableCell className="text-right hidden md:table-cell">
                            {formatPrice(property.price, property.description)}
                          </TableCell>
                        </>
                      ) : (
                        <>
                          <TableCell className="text-muted-foreground/30 hidden md:table-cell">-</TableCell>
                          <TableCell className="text-muted-foreground/30 hidden md:table-cell">-</TableCell>
                          <TableCell className="text-muted-foreground/30 hidden md:table-cell">-</TableCell>
                          <TableCell className="text-muted-foreground/30 hidden md:table-cell">-</TableCell>
                          <TableCell className="text-muted-foreground/30 hidden md:table-cell">-</TableCell>
                          <TableCell className="text-right text-muted-foreground/30 hidden md:table-cell">-</TableCell>
                        </>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <Pagination>
              <PaginationContent>
                {currentPage > 1 && (
                  <PaginationItem>
                    <PaginationPrevious 
                      href="#" 
                      onClick={(e) => {
                        e.preventDefault();
                        handlePageChange(currentPage - 1);
                      }} 
                    />
                  </PaginationItem>
                )}
                {Array.from({ length: Math.min(5, paginationInfo.pages) }, (_, i) => {
                  const pageNumber = currentPage + i - Math.min(currentPage - 1, 2);
                  if (pageNumber > paginationInfo.pages || pageNumber < 1) return null;
                  return (
                    <PaginationItem key={pageNumber}>
                      <PaginationLink
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          handlePageChange(pageNumber);
                        }}
                        isActive={currentPage === pageNumber}
                      >
                        {pageNumber}
                      </PaginationLink>
                    </PaginationItem>
                  );
                })}
                {currentPage < paginationInfo.pages && (
                  <PaginationItem>
                    <PaginationNext 
                      href="#" 
                      onClick={(e) => {
                        e.preventDefault();
                        handlePageChange(currentPage + 1);
                      }} 
                    />
                  </PaginationItem>
                )}
              </PaginationContent>
            </Pagination>
          </>
        )}
      </div>
    </main>
  );
}
