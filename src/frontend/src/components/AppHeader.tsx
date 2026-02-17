import { useNavigate } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { Home } from 'lucide-react';
import { useInternetIdentity } from '../hooks/useInternetIdentity';
import { useQueryClient } from '@tanstack/react-query';
import ConnectivityStatus from './ConnectivityStatus';

export default function AppHeader() {
  const navigate = useNavigate();
  const { login, clear, loginStatus, identity } = useInternetIdentity();
  const queryClient = useQueryClient();

  const isAuthenticated = !!identity;
  const disabled = loginStatus === 'logging-in';
  const text = loginStatus === 'logging-in' ? 'Logging in...' : isAuthenticated ? 'Logout' : 'Login';

  const handleAuth = async () => {
    if (isAuthenticated) {
      await clear();
      queryClient.clear();
    } else {
      try {
        await login();
      } catch (error: any) {
        console.error('Login error:', error);
        if (error.message === 'User is already authenticated') {
          await clear();
          setTimeout(() => login(), 300);
        }
      }
    }
  };

  return (
    <header className="border-b bg-card">
      <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-4 max-w-6xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 mb-3 sm:mb-4">
          <div className="flex items-center gap-3 sm:gap-4 min-w-0">
            <img
              src="/assets/generated/cricket-badge.dim_512x512.png"
              alt="Cricket Badge"
              className="h-10 w-10 sm:h-12 sm:w-12 shrink-0"
            />
            <div className="min-w-0">
              <h1 className="text-lg sm:text-2xl font-bold text-primary truncate">QuickCricket Scorer</h1>
              <p className="text-xs sm:text-sm text-muted-foreground truncate">Fast & Simple Ball-by-Ball Scoring</p>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 self-end sm:self-auto shrink-0">
            <ConnectivityStatus />
            <Button variant="ghost" size="icon" onClick={() => navigate({ to: '/' })} className="h-9 w-9 sm:h-10 sm:w-10">
              <Home className="h-4 w-4 sm:h-5 sm:w-5" />
            </Button>
            <Button onClick={handleAuth} disabled={disabled} variant={isAuthenticated ? 'outline' : 'default'} size="sm" className="text-xs sm:text-sm">
              {text}
            </Button>
          </div>
        </div>
        <img
          src="/assets/generated/scoreboard-banner.dim_1600x400.png"
          alt="Cricket Scoreboard"
          className="w-full h-16 sm:h-20 md:h-24 object-cover rounded-lg"
        />
      </div>
    </header>
  );
}
