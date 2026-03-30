import React, { createContext, useContext, useMemo } from 'react';
import { useLocation } from 'react-router-dom';

interface TestEnvironmentContextType {
  isTestRoute: boolean;
}

const TestEnvironmentContext = createContext<TestEnvironmentContextType>({ isTestRoute: false });

export const TestEnvironmentProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const isTestRoute = useMemo(() => location.pathname.startsWith('/test/') || location.pathname === '/test', [location.pathname]);

  return (
    <TestEnvironmentContext.Provider value={{ isTestRoute }}>
      {children}
    </TestEnvironmentContext.Provider>
  );
};

export const useTestEnvironment = () => useContext(TestEnvironmentContext);

/**
 * Apply test/production filter on a Supabase query.
 * - Test route: only TEST-% rows
 * - Production route: exclude TEST-% rows
 */
export function applyTestFilter<T extends { ilike: (col: string, val: string) => T; not: (col: string, op: string, val: string) => T }>(
  query: T,
  column: string,
  isTestRoute: boolean
): T {
  return isTestRoute
    ? query.ilike(column, 'TEST-%')
    : query.not(column, 'ilike', 'TEST-%');
}
