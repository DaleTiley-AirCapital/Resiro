import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Home, Package, ArrowLeft, Users } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import Logo from "@/components/logo";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showDemoSelection, setShowDemoSelection] = useState(false);
  const { login, logout, user } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  
  // Clear any existing authentication when login page loads
  useEffect(() => {
    if (user) {
      logout();
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Don't require credentials - just show error for now
    if (!email || !password) {
      toast({
        title: "Missing credentials",
        description: "Please enter email and password or use demo accounts",
        variant: "destructive",
      });
      return;
    }
    
    setIsLoading(true);

    try {
      const userData = await login(email, password);
      toast({
        title: "Welcome back!",
        description: "Successfully logged in to RezDNA.",
      });
      // Route based on user type
      if (userData?.userType === 'supplier') {
        navigate("/supplier");
      } else {
        navigate("/app");
      }
    } catch (error: any) {
      toast({
        title: "Login failed",
        description: error?.response?.data?.error || "Invalid email or password",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoLogin = async (type: 'property' | 'supplier') => {
    setIsLoading(true);
    
    const credentials = type === 'property' 
      ? { email: 'dale.tiley@email.com', password: 'demo123' }
      : { email: 'info@millenniumroofing.co.za', password: 'supplier123' };
    
    try {
      const userData = await login(credentials.email, credentials.password);
      toast({
        title: "Welcome!",
        description: `Signed in as ${type === 'property' ? 'Dale Tiley' : 'Millennium Roofing'}.`,
      });
      
      // Route based on selection
      if (type === 'supplier') {
        navigate("/supplier");
      } else {
        navigate("/app");
      }
    } catch (error: any) {
      toast({
        title: "Login failed",
        description: "Unable to sign in with demo account",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Logo size="lg" />
          </div>
          <CardTitle className="text-2xl">RezDNA</CardTitle>
          <CardDescription>
            Sign in to your property management platform
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!showDemoSelection ? (
            <>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isLoading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isLoading}
                  />
                </div>
                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={isLoading}
                >
                  {isLoading ? "Signing in..." : "Sign In"}
                </Button>
              </form>
              
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white px-2 text-gray-500">Or</span>
                </div>
              </div>
              
              <Button
                onClick={() => setShowDemoSelection(true)}
                className="w-full"
                variant="outline"
                disabled={isLoading}
              >
                <Users className="mr-2 h-4 w-4" />
                Access Demo Accounts
              </Button>
            </>
          ) : (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-center">Choose Demo Account</h3>
              <p className="text-sm text-gray-600 text-center">
                Select which dashboard you want to access:
              </p>
              
              <div className="space-y-3">
                <Button
                  onClick={() => handleDemoLogin('property')}
                  className="w-full h-auto p-4 justify-start"
                  variant="outline"
                  disabled={isLoading}
                >
                  <Home className="mr-3 h-6 w-6 flex-shrink-0" />
                  <div className="text-left">
                    <div className="font-semibold text-base">Dale Tiley</div>
                    <div className="text-sm text-gray-500 mt-1">
                      Property Owner • Access Properties Dashboard
                    </div>
                  </div>
                </Button>
                
                <Button
                  onClick={() => handleDemoLogin('supplier')}
                  className="w-full h-auto p-4 justify-start"
                  variant="outline"
                  disabled={isLoading}
                >
                  <Package className="mr-3 h-6 w-6 flex-shrink-0" />
                  <div className="text-left">
                    <div className="font-semibold text-base">Millennium Roofing (Pty) Ltd</div>
                    <div className="text-sm text-gray-500 mt-1">
                      Supplier • Access Supplier Portal
                    </div>
                  </div>
                </Button>
              </div>
              
              <Button 
                variant="ghost" 
                className="w-full mt-4" 
                onClick={() => {
                  setShowDemoSelection(false);
                  setEmail('');
                  setPassword('');
                }}
                disabled={isLoading}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to login
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}