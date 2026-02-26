import React from 'react';
import {
  createRouter,
  createRoute,
  createRootRoute,
  RouterProvider,
  Outlet,
  redirect,
} from '@tanstack/react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'next-themes';
import { Toaster } from '@/components/ui/sonner';
import AppErrorBoundary from './components/AppErrorBoundary';
import AppLayout from './components/AppLayout';
import AppHeader from './components/AppHeader';

// Pages
import MatchesDashboardPage from './pages/MatchesDashboardPage';
import MatchSetupPage from './pages/MatchSetupPage';
import LiveScoringPage from './pages/LiveScoringPage';
import InningsSummaryPage from './pages/InningsSummaryPage';
import MatchSummaryPage from './pages/MatchSummaryPage';
import MatchStatsPage from './pages/MatchStatsPage';
import TeamsPlayersPage from './pages/TeamsPlayersPage';
import PlayerStatsPage from './pages/PlayerStatsPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
    },
  },
});

// Root route with shared layout
const rootRoute = createRootRoute({
  component: () => (
    <AppErrorBoundary>
      <AppLayout>
        <AppHeader />
        <main className="flex-1">
          <Outlet />
        </main>
      </AppLayout>
    </AppErrorBoundary>
  ),
});

// Routes
const dashboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: MatchesDashboardPage,
});

const matchSetupRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/match/setup',
  component: MatchSetupPage,
});

const matchRoute = createRoute({
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
  dashboardRoute,
  matchSetupRoute,
  matchRoute,
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
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <RouterProvider router={router} />
        <Toaster richColors position="top-center" />
      </ThemeProvider>
    </QueryClientProvider>
  );
}
