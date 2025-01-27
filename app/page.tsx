"use client";

import React, { useEffect, useState, useCallback } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { GridPattern } from "@/components/ui/grid-pattern";
import { useDebounce } from "@/lib/hooks";

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

      console.log('Fetching properties with params:', searchParams.toString());
      const response = await fetch(`/api/properties?${searchParams.toString()}`);
      console.log('Response status:', response.status);
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('API Error:', errorData);
        throw new Error(errorData.details || 'Failed to fetch properties');
      }
      
      const data = await response.json();
      console.log('API Response:', data);
      
      if (!Array.isArray(data.properties)) {
        console.error('Invalid properties data:', data);
        throw new Error('Invalid response format');
      }

      setProperties(data.properties);
      setPaginationInfo({
        total: data.total,
        pages: Math.ceil(data.total / 50),
        currentPage: currentPage,
        perPage: 50
      });
    } catch (error) {
      console.error('Error fetching properties:', error);
    } finally {
      setLoading(false);
    }
  }, [currentPage, debouncedSearch]);

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

  return (
    <main className="min-h-screen bg-background">
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <GridPattern />
      </div>

      <div className="container mx-auto py-10 space-y-4">
        <div className="flex justify-between items-center">
          <h1 className="text-4xl font-bold">Property Sales</h1>
          <div className="w-1/3">
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
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
          </div>
        ) : (
          <>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
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
                  {properties.map((property) => (
                    <TableRow key={property.id}>
                      <TableCell className="font-medium">{formatAddress(property.address)}</TableCell>
                      <TableCell>{formatDate(property.saleDate)}</TableCell>
                      <TableCell>{property.county || '-'}</TableCell>
                      <TableCell>
                        <Badge 
                          className={
                            formatCondition(property.description) === 'New'
                              ? 'bg-white text-black border border-black/5'
                              : 'bg-black/5 text-black border-0'
                          }
                        >
                          {formatCondition(property.description)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {property.eircode || '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatPrice(property.price, property.description)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious 
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    className={currentPage === 1 ? 'pointer-events-none opacity-50' : ''}
                  />
                </PaginationItem>
                {Array.from({ length: Math.min(5, paginationInfo.pages) }, (_, i) => (
                  <PaginationItem key={i}>
                    <PaginationLink
                      onClick={() => setCurrentPage(i + 1)}
                      isActive={currentPage === i + 1}
                    >
                      {i + 1}
                    </PaginationLink>
                  </PaginationItem>
                ))}
                <PaginationItem>
                  <PaginationNext 
                    onClick={() => setCurrentPage(prev => Math.min(paginationInfo.pages, prev + 1))}
                    className={currentPage === paginationInfo.pages ? 'pointer-events-none opacity-50' : ''}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </>
        )}
      </div>
    </main>
  );
}
