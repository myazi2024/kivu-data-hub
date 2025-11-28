import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationControlsProps {
  currentPage: number;
  totalPages: number;
  pageSize: number;
  totalItems: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  onNextPage: () => void;
  onPreviousPage: () => void;
}

export function PaginationControls({
  currentPage,
  totalPages,
  pageSize,
  totalItems,
  hasNextPage,
  hasPreviousPage,
  onPageChange,
  onPageSizeChange,
  onNextPage,
  onPreviousPage,
}: PaginationControlsProps) {
  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-2 sm:gap-4 px-2 py-3">
      <div className="text-xs sm:text-sm text-muted-foreground">
        {totalItems > 0 ? (
          <>
            Affichage de <span className="font-medium">{startItem}</span> à{' '}
            <span className="font-medium">{endItem}</span> sur{' '}
            <span className="font-medium">{totalItems}</span> résultats
          </>
        ) : (
          'Aucun résultat'
        )}
      </div>

      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1 sm:gap-2">
          <span className="text-xs sm:text-sm text-muted-foreground whitespace-nowrap">
            Lignes par page:
          </span>
          <Select
            value={String(pageSize)}
            onValueChange={(value) => onPageSizeChange(Number(value))}
          >
            <SelectTrigger className="h-7 w-14 sm:h-8 sm:w-16 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="25">25</SelectItem>
              <SelectItem value="50">50</SelectItem>
              <SelectItem value="100">100</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            onClick={onPreviousPage}
            disabled={!hasPreviousPage}
            className="h-7 w-7 p-0 sm:h-8 sm:w-8"
          >
            <ChevronLeft className="h-3 w-3 sm:h-4 sm:w-4" />
          </Button>
          
          <div className="flex items-center gap-1 text-xs sm:text-sm px-2">
            <span className="font-medium">{currentPage}</span>
            <span className="text-muted-foreground">sur</span>
            <span className="font-medium">{totalPages}</span>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={onNextPage}
            disabled={!hasNextPage}
            className="h-7 w-7 p-0 sm:h-8 sm:w-8"
          >
            <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
