import { useState, useMemo } from 'react';

export interface PaginationOptions {
  initialPage?: number;
  initialPageSize?: number;
}

export function usePagination<T>(
  data: T[],
  options: PaginationOptions = {}
) {
  const { initialPage = 1, initialPageSize = 10 } = options;
  
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [pageSize, setPageSize] = useState(initialPageSize);

  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    const end = start + pageSize;
    return data.slice(start, end);
  }, [data, currentPage, pageSize]);

  const totalPages = Math.ceil(data.length / pageSize);

  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  const goToNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const goToPreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const changePageSize = (newSize: number) => {
    setPageSize(newSize);
    setCurrentPage(1); // Reset to first page when changing page size
  };

  return {
    currentPage,
    pageSize,
    totalPages,
    paginatedData,
    goToPage,
    goToNextPage,
    goToPreviousPage,
    changePageSize,
    hasNextPage: currentPage < totalPages,
    hasPreviousPage: currentPage > 1,
    totalItems: data.length,
  };
}
