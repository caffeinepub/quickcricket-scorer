import { RouterProvider, createRouter, createRoute, createRootRoute, Outlet } from '@tanstack/react-router';
import { ThemeProvider } from 'next-themes';
import { Toaster } from '@/components/ui/sonner';
import AppLayout from './components/AppLayout';
import AppErrorBoundary from './components/AppErrorBoundary';
import MatchesDashboardPage from './pages/MatchesDashboardPage';
import MatchSetupPage from './pages/MatchSetupPage';
import LiveScoringPage from './pages/LiveScoringPage';
import MatchSummaryPage from './pages/MatchSummaryPage';
import InningsSummaryPage from './pages/InningsSummaryPage';

const rootRoute = createRootRoute({
  component: () => (
    <AppErrorBoundary>
      <AppLayout>
        <Outlet />
      </AppLayout>
    </AppErrorBoundary>
  ),
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: MatchesDashboardPage,
});

const setupRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/setup',
  component: MatchSetupPage,
});

const scoringRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/match/$matchId',
  component: LiveScoringPage,
});

const inningsSummaryRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/match/$matchId/innings-summary',
  component: InningsSummaryPage,
});

const matchSummaryRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/match/$matchId/summary',
  component: MatchSummaryPage,
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  setupRoute,
  scoringRoute,
  inningsSummaryRoute,
  matchSummaryRoute,
]);

const router = createRouter({ routeTree });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

export default function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
      <RouterProvider router={router} />
      <Toaster />
    </ThemeProvider>
  );
}
