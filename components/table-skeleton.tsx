import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"

export function TableSkeleton() {
  // Create an array of 10 rows with decreasing opacity
  const skeletonRows = Array.from({ length: 10 }, (_, i) => ({
    opacity: 1 - (i * 0.1) // Opacity goes from 1.0 to 0.1
  }));

  return (
    <div className="rounded-md border h-[2650px]"> {/* 53px * 50 rows = 2650px */}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead><Skeleton className="h-4 w-[200px]" /></TableHead>
            <TableHead><Skeleton className="h-4 w-[100px]" /></TableHead>
            <TableHead><Skeleton className="h-4 w-[100px]" /></TableHead>
            <TableHead><Skeleton className="h-4 w-[80px]" /></TableHead>
            <TableHead><Skeleton className="h-4 w-[80px]" /></TableHead>
            <TableHead className="text-right"><Skeleton className="h-4 w-[100px] ml-auto" /></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {skeletonRows.map((row, index) => (
            <TableRow key={index} style={{ opacity: row.opacity }}>
              <TableCell><Skeleton className="h-4 w-[200px]" /></TableCell>
              <TableCell><Skeleton className="h-4 w-[100px]" /></TableCell>
              <TableCell><Skeleton className="h-4 w-[100px]" /></TableCell>
              <TableCell><Skeleton className="h-4 w-[80px]" /></TableCell>
              <TableCell><Skeleton className="h-4 w-[80px]" /></TableCell>
              <TableCell className="text-right"><Skeleton className="h-4 w-[100px] ml-auto" /></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
} 