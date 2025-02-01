import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"

export function TableSkeleton() {
  return (
    <div className="rounded-md border min-h-[calc(50*53px+41px)]">
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
          {Array.from({ length: 50 }).map((_, index) => (
            <TableRow key={index}>
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