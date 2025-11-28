import { useState, useEffect } from 'react';

interface UsePersistentPaginationProps {
  key: string;
  defaultPage?: number;
  defaultPageSize?: number;
}

export const usePersistentPagination = ({
  key,
  defaultPage = 1,
  defaultPageSize = 10
}: UsePersistentPaginationProps) => {
  const [currentPage, setCurrentPage] = useState(() => {
    const saved = sessionStorage.getItem(`pagination_${key}_page`);
    return saved ? parseInt(saved, 10) : defaultPage;
  });

  const [pageSize, setPageSize] = useState(() => {
    const saved = sessionStorage.getItem(`pagination_${key}_size`);
    return saved ? parseInt(saved, 10) : defaultPageSize;
  });

  useEffect(() => {
    sessionStorage.setItem(`pagination_${key}_page`, currentPage.toString());
  }, [currentPage, key]);

  useEffect(() => {
    sessionStorage.setItem(`pagination_${key}_size`, pageSize.toString());
  }, [pageSize, key]);

  const resetPagination = () => {
    setCurrentPage(defaultPage);
    sessionStorage.removeItem(`pagination_${key}_page`);
    sessionStorage.removeItem(`pagination_${key}_size`);
  };

  return {
    currentPage,
    pageSize,
    setCurrentPage,
    setPageSize,
    resetPagination
  };
};
