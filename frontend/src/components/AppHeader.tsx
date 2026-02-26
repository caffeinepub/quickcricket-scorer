import { useNavigate, useRouterState } from '@tanstack/react-router';
import { useInternetIdentity } from '../hooks/useInternetIdentity';
import { useConnectivity } from '../hooks/useConnectivity';
import { Button } from '@/components/ui/button';
import ConnectivityStatus from './ConnectivityStatus';
import { Home, Users, BarChart3 } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useEffect, useRef } from 'react';

export default function AppHeader() {
  const navigate = useNavigate();
  const routerState = useRouterState();
  const { login, clear, loginStatus, identity, loginError } = useInternetIdentity();
  const { isOffline } = useConnectivity();
  const queryClient = useQueryClient();
  const loginTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const isAuthenticated = !!identity;
  const isLoggingIn = loginStatus === 'logging-in';
  const currentPath = routerState.location.pathname;

  // Show error toast when login fails
  useEffect(() => {
    if (loginStatus === 'loginError' && loginError) {
      toast.error(loginError.message || 'Login failed. Please try again.');
    }
  }, [loginStatus, loginError]);

  const handleAuth = async () => {
    if (isAuthenticated) {
      // Logout
      try {
        await clear();
        queryClient.clear();
        toast.success('Logged out successfully');
      } catch (error) {
        console.error('Logout error:', error);
        toast.error('Failed to logout. Please try again.');
      }
    } else {
      // Login
      try {
        // Clear any existing timeout
        if (loginTimeoutRef.current) {
          clearTimeout(loginTimeoutRef.current);
        }

        // Set a timeout to detect if login is stuck
        loginTimeoutRef.current = setTimeout(() => {
          if (loginStatus === 'logging-in') {
            toast.error('Login is taking too long. Please try again or check your Internet Identity configuration.');
          }
        }, 30000); // 30 second timeout

        await login();

        // Clear timeout on successful login
        if (loginTimeoutRef.current) {
          clearTimeout(loginTimeoutRef.current);
          loginTimeoutRef.current = null;
        }
      } catch (error: any) {
        console.error('Login error:', error);
        
        // Clear timeout
        if (loginTimeoutRef.current) {
          clearTimeout(loginTimeoutRef.current);
          loginTimeoutRef.current = null;
        }

        // Handle specific error cases
        if (error.message === 'User is already authenticated') {
          toast.info('Already logged in. Refreshing session...');
          await clear();
          setTimeout(() => login(), 300);
        } else if (error.message?.includes('AuthClient is not initialized')) {
          toast.error('Internet Identity is not configured for this app. Please contact support.');
        } else if (error.message?.includes('Identity not found')) {
          toast.error('Login completed but identity was not found. Please try again.');
        } else {
          toast.error(error.message || 'Login failed. Please try again.');
        }
      }
    }
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (loginTimeoutRef.current) {
        clearTimeout(loginTimeoutRef.current);
      }
    };
  }, []);

  const handleHomeClick = () => {
    if (currentPath !== '/') {
      navigate({ to: '/' });
    }
  };

  const handleTeamsClick = () => {
    navigate({ to: '/teams' });
  };

  const handlePlayerStatsClick = () => {
    navigate({ to: '/player-stats' });
  };

  return (
    <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 py-3 sm:py-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <img
              src="/assets/generated/cricket-badge.dim_512x512.png"
              alt="Cricket"
              className="h-10 w-10 sm:h-12 sm:w-12 object-contain"
            />
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-primary">Cricket Scorer</h1>
              <p className="text-xs sm:text-sm text-muted-foreground">Track your matches</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <ConnectivityStatus />
            
            <Button
              onClick={handleHomeClick}
              variant="ghost"
              size="sm"
              className="h-9"
            >
              <Home className="h-4 w-4 mr-2" />
              Home
            </Button>

            <Button
              onClick={handleTeamsClick}
              variant="ghost"
              size="sm"
              className="h-9"
            >
              <Users className="h-4 w-4 mr-2" />
              Teams
            </Button>

            <Button
              onClick={handlePlayerStatsClick}
              variant="ghost"
              size="sm"
              className="h-9"
            >
              <BarChart3 className="h-4 w-4 mr-2" />
              Stats
            </Button>

            <Button
              onClick={handleAuth}
              disabled={isLoggingIn}
              variant={isAuthenticated ? 'outline' : 'default'}
              size="sm"
              className="h-9"
            >
              {isLoggingIn ? 'Logging in...' : isAuthenticated ? 'Logout' : 'Login'}
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
