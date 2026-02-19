import { StrictMode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider, createRouter, createRoute, createRootRoute, Outlet } from '@tanstack/react-router';
import { ThemeProvider } from 'next-themes';
import { Toaster } from '@/components/ui/sonner';
import AppLayout from './components/AppLayout';
import MatchesDashboardPage from './pages/MatchesDashboardPage';
import MatchSetupPage from './pages/MatchSetupPage';
import LiveScoringPage from './pages/LiveScoringPage';
import InningsSummaryPage from './pages/InningsSummaryPage';
import MatchSummaryPage from './pages/MatchSummaryPage';
import MatchStatsPage from './pages/MatchStatsPage';
import TeamsPlayersPage from './pages/TeamsPlayersPage';
import PlayerStatsPage from './pages/PlayerStatsPage';
import AppErrorBoundary from './components/AppErrorBoundary';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const rootRoute = createRootRoute({
  component: () => (
    <AppLayout>
      <Outlet />
    </AppLayout>
  ),
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: MatchesDashboardPage,
});

const matchSetupRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/match/setup',
  component: MatchSetupPage,
});

const liveMatchRoute = createRoute({
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

const matchStatsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/match/$matchId/stats',
  component: MatchStatsPage,
});

const teamsPlayersRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/teams',
  component: TeamsPlayersPage,
});

const playerStatsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/player-stats',
  component: PlayerStatsPage,
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  matchSetupRoute,
  liveMatchRoute,
  inningsSummaryRoute,
  matchSummaryRoute,
  matchStatsRoute,
  teamsPlayersRoute,
  playerStatsRoute,
]);

const router = createRouter({ routeTree });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

export default function App() {
  return (
    <StrictMode>
      <AppErrorBoundary>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <QueryClientProvider client={queryClient}>
            <RouterProvider router={router} />
            <Toaster />
          </QueryClientProvider>
        </ThemeProvider>
      </AppErrorBoundary>
    </StrictMode>
  );
}
