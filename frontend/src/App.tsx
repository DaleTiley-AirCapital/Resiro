import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import Properties from "@/pages/properties";
import Vault from "@/pages/vault";
import Policies from "@/pages/policies";
import Vendors from "@/pages/vendors";
import Maintenance from "@/pages/maintenance";
import Reports from "@/pages/reports";
import LoginPage from "@/pages/login";
import SignupPage from "@/pages/signup";
import PropertyForm from "@/pages/property-form";
import PropertyDashboard from "@/pages/property-dashboard";
import PropertyDashboardEnhanced from "@/pages/property-dashboard-enhanced";
import LandingPage from "@/pages/marketing/landing";
import AppLayout from "@/components/layout/app-layout";
import SupplierDashboard from "@/pages/supplier/dashboard";
import ShareViewer from "@/pages/share/viewer";

function AppRouter() {
  const { user, isLoading } = useAuth();
  
  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">Loading...</div>
    </div>;
  }
  
  return (
    <Switch>
      {/* Public marketing pages */}
      <Route path="/" component={LandingPage} />
      <Route path="/signup" component={SignupPage} />
      <Route path="/login" component={LoginPage} />
      
      {/* Protected application routes */}
      {/* Main dashboard without AppLayout wrapper */}
      <Route path="/app">
        {user ? <Dashboard /> : <LoginPage />}
      </Route>
      <Route path="/app/dashboard">
        {user ? <Dashboard /> : <LoginPage />}
      </Route>
      
      {/* Legacy routes with old layout - for future use */}
      <Route path="/app/old">
        {user ? (
          <AppLayout>
            <Switch>
              <Route path="/app/old/properties" component={Properties} />
              <Route path="/app/old/vault" component={Vault} />
              <Route path="/app/old/policies" component={Policies} />
              <Route path="/app/old/vendors" component={Vendors} />
              <Route path="/app/old/maintenance" component={Maintenance} />
              <Route path="/app/old/reports" component={Reports} />
              <Route component={NotFound} />
            </Switch>
          </AppLayout>
        ) : (
          <LoginPage />
        )}
      </Route>
      
      {/* Individual user property routes */}
      <Route path="/properties/new">
        {user ? <PropertyForm /> : <LoginPage />}
      </Route>
      <Route path="/properties/:id">
        {user ? <PropertyDashboardEnhanced /> : <LoginPage />}
      </Route>
      
      {/* Supplier routes */}
      <Route path="/supplier">
        {user ? <SupplierDashboard /> : <LoginPage />}
      </Route>
      <Route path="/supplier/dashboard">
        {user ? <SupplierDashboard /> : <LoginPage />}
      </Route>
      
      {/* Share viewer route (public) */}
      <Route path="/share/:token" component={ShareViewer} />
      
      {/* Legacy dashboard routes - redirect to /app */}
      <Route path="/dashboard">
        {user ? <Dashboard /> : <LoginPage />}
      </Route>
      <Route path="/properties">
        {user ? <Properties /> : <LoginPage />}
      </Route>
      <Route path="/vault">
        {user ? <Vault /> : <LoginPage />}
      </Route>
      <Route path="/policies">
        {user ? <Policies /> : <LoginPage />}
      </Route>
      <Route path="/vendors">
        {user ? <Vendors /> : <LoginPage />}
      </Route>
      <Route path="/maintenance">
        {user ? <Maintenance /> : <LoginPage />}
      </Route>
      <Route path="/reports">
        {user ? <Reports /> : <LoginPage />}
      </Route>
      
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <Toaster />
          <AppRouter />
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
