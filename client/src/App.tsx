import { Switch, Route } from 'wouter';
import { queryClient } from './lib/queryClient';
import { QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { SolanaWalletProvider } from '@/components/WalletProvider';
import { Layout } from '@/components/Layout';
import Home from '@/pages/Home';
import CreateSale from '@/pages/CreateSale';
import SaleDetails from '@/pages/SaleDetails';
import NotFound from '@/pages/not-found';
import Market from '@/pages/Market';
import Dashboard from '@/pages/Dashboard';

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/">
          <Home />
        </Route>

        <Route path="/market">
          <Market />
        </Route>

        <Route path="/dashboard">
          <Dashboard />
        </Route>

        <Route path="/create">
          <CreateSale />
        </Route>

        <Route path="/:address">
          {(params) =>
            params.address?.length === 44 ? (
              <SaleDetails address={params.address} />
            ) : (
              <NotFound />
            )
          }
        </Route>

        <Route>
          <NotFound />
        </Route>
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <SolanaWalletProvider>
        <Router />
        <Toaster />
      </SolanaWalletProvider>
    </QueryClientProvider>
  );
}

export default App;
