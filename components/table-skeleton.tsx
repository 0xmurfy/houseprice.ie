"use client";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

export function TableSkeleton() {
  return (
    <div className="rounded-md border opacity-50">
      <Table>
        <TableHeader>
          <TableRow className="opacity-50">
            <TableHead>Address</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>County</TableHead>
            <TableHead>Condition</TableHead>
            <TableHead>Eircode</TableHead>
            <TableHead className="text-right">Price</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody className="divide-y divide-border/50">
          {Array.from({ length: 50 }).map((_, i) => (
            <TableRow key={i} className="animate-pulse opacity-50">
              <TableCell className="font-medium">
                <div className="h-4 w-[250px] rounded bg-muted"></div>
              </TableCell>
              <TableCell>
                <div className="h-4 w-[100px] rounded bg-muted"></div>
              </TableCell>
              <TableCell>
                <div className="h-4 w-[80px] rounded bg-muted"></div>
              </TableCell>
              <TableCell>
                <div className="h-4 w-[60px] rounded bg-muted"></div>
              </TableCell>
              <TableCell>
                <div className="h-4 w-[80px] rounded bg-muted"></div>
              </TableCell>
              <TableCell className="text-right">
                <div className="h-4 w-[100px] rounded bg-muted ml-auto"></div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
} 