import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, User, Users, Home, TrendingUp, Hammer, Building, Building2, Shield, Package, Briefcase } from "lucide-react";
import Logo from "@/components/logo";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";

const ACCOUNT_CATEGORIES = [
  {
    type: "individual",
    title: "Individual",
    description: "Personal property ownership and investment",
    icon: User,
    options: [
      { value: "homeowner", label: "Home Owner", description: "Manage your personal property documents and maintenance", icon: Home },
      { value: "investor", label: "Real Estate Investor", description: "Track investment properties and financial performance", icon: TrendingUp }
    ]
  },
  {
    type: "company", 
    title: "Company",
    description: "Business and professional services",
    icon: Users,
    options: [
      { value: "company_investor", label: "Company Property Investor", description: "Corporate property investment and portfolio management", icon: TrendingUp },
      { value: "property_manager", label: "Property Manager", description: "Manage property portfolios and tenant relationships", icon: Building2 },
      { value: "main_contractor", label: "Main Contractor", description: "Full building packages and project management", icon: Hammer, comingSoon: true },
      { value: "developer", label: "Developer", description: "Land development and property construction", icon: Building, comingSoon: true },
      { value: "insurance_agent", label: "Insurance Agent", description: "Property insurance and coverage recommendations", icon: Shield, comingSoon: true },
      { value: "supplier", label: "Supplier", description: "Upload warranties and connect with property owners", icon: Package }
    ]
  }
];

export default function SignupPage() {
  const [step, setStep] = useState(1);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [userType, setUserType] = useState("");
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
    company: "",
    phoneNumber: "",
    // Company Property Investor fields
    registrationNumber: "",
    vatNumber: "",
    companyType: "",
    // Supplier fields
    specialties: "",
    tradingAs: "",
    businessAddress: "",
    agreeToTerms: false,
    agreeToMarketing: false
  });
  const [isLoading, setIsLoading] = useState(false);
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleCategorySelect = (categoryType: string) => {
    setSelectedCategory(categoryType);
    setStep(2);
  };

  const handleUserTypeSelect = (type: string) => {
    setUserType(type);
    setStep(3);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.password !== formData.confirmPassword) {
      toast({
        title: "Password mismatch",
        description: "Passwords do not match. Please check and try again.",
        variant: "destructive"
      });
      return;
    }

    if (!formData.agreeToTerms) {
      toast({
        title: "Terms required",
        description: "Please agree to the Terms of Service to continue.",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);

    try {
      const signupData = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        password: formData.password,
        userType,
        company: formData.company,
        phoneNumber: formData.phoneNumber,
        agreeToMarketing: formData.agreeToMarketing
      };

      await api.post('/api/auth/signup', signupData);
      
      toast({
        title: "Account created successfully!",
        description: "Welcome to RezDNA. You can now log in to your account.",
      });
      
      navigate('/login');
    } catch (error: any) {
      toast({
        title: "Signup failed",
        description: error?.message || "Failed to create account. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4">
      <div className="container mx-auto max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <Link href="/">
            <Button variant="ghost" className="mb-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
          </Link>
          <div className="flex justify-center mb-4">
            <Logo size="lg" showText={false} />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Join RezDNA</h1>
          <p className="text-gray-600">Choose your account type to get started</p>
        </div>

        {step === 1 && (
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-6 text-center">Choose your account type</h2>
            <div className="grid md:grid-cols-2 gap-6">
              {ACCOUNT_CATEGORIES.map((category) => {
                const IconComponent = category.icon;
                return (
                  <Card 
                    key={category.type}
                    className="cursor-pointer hover:shadow-lg transition-shadow border-2 hover:border-primary"
                    onClick={() => handleCategorySelect(category.type)}
                  >
                    <CardContent className="p-6 text-center">
                      <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                        <IconComponent className="w-8 h-8 text-primary" />
                      </div>
                      <h3 className="text-xl font-semibold text-gray-900 mb-2">{category.title}</h3>
                      <p className="text-gray-600 text-sm">{category.description}</p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {step === 2 && (
          <div>
            <Button 
              variant="ghost" 
              onClick={() => setStep(1)}
              className="mb-4"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to account type
            </Button>
            
            <h2 className="text-xl font-semibold text-gray-900 mb-6 text-center">
              {selectedCategory === "individual" ? "Individual Account Types" : "Company Account Types"}
            </h2>
            
            <div className="grid gap-4">
              {ACCOUNT_CATEGORIES.find(cat => cat.type === selectedCategory)?.options.map((option: any) => {
                const IconComponent = option.icon;
                const isComingSoon = option.comingSoon;
                return (
                  <Card 
                    key={option.value}
                    className={`transition-shadow border ${
                      isComingSoon 
                        ? 'opacity-60 cursor-not-allowed' 
                        : 'cursor-pointer hover:shadow-md hover:border-primary'
                    }`}
                    onClick={() => !isComingSoon && handleUserTypeSelect(option.value)}
                  >
                    <CardContent className="p-4 flex items-center space-x-4">
                      <div className={`w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        isComingSoon ? 'bg-gray-100' : 'bg-primary/10'
                      }`}>
                        <IconComponent className={`w-6 h-6 ${isComingSoon ? 'text-gray-400' : 'text-primary'}`} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className={`font-semibold ${isComingSoon ? 'text-gray-500' : 'text-gray-900'}`}>
                            {option.label}
                          </h3>
                          {isComingSoon && (
                            <span className="text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded-full">Coming Soon</span>
                          )}
                        </div>
                        <p className="text-gray-600 text-sm">{option.description}</p>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {step === 3 && (
          <div>
            <Button 
              variant="ghost" 
              onClick={() => setStep(2)}
              className="mb-4"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to user types
            </Button>
            
            <Card>
              <CardHeader>
                <CardTitle>Complete Your Registration</CardTitle>
                <CardDescription>
                  You selected: {ACCOUNT_CATEGORIES.find(cat => cat.type === selectedCategory)?.options.find(opt => opt.value === userType)?.label}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="firstName">First Name</Label>
                      <Input
                        id="firstName"
                        value={formData.firstName}
                        onChange={(e) => handleInputChange("firstName", e.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="lastName">Last Name</Label>
                      <Input
                        id="lastName"
                        value={formData.lastName}
                        onChange={(e) => handleInputChange("lastName", e.target.value)}
                        required
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleInputChange("email", e.target.value)}
                      required
                    />
                  </div>

                  {selectedCategory === "company" && (
                    <>
                      <div>
                        <Label htmlFor="company">Company Name</Label>
                        <Input
                          id="company"
                          value={formData.company}
                          onChange={(e) => handleInputChange("company", e.target.value)}
                          required
                        />
                      </div>

                      {userType === "company_investor" && (
                        <>
                          <div>
                            <Label htmlFor="registrationNumber">Company Registration Number</Label>
                            <Input
                              id="registrationNumber"
                              value={formData.registrationNumber}
                              onChange={(e) => handleInputChange("registrationNumber", e.target.value)}
                              placeholder="e.g., 2024/123456/07"
                              required
                            />
                          </div>
                          <div>
                            <Label htmlFor="vatNumber">VAT Number (Optional)</Label>
                            <Input
                              id="vatNumber"
                              value={formData.vatNumber}
                              onChange={(e) => handleInputChange("vatNumber", e.target.value)}
                              placeholder="e.g., 4123456789"
                            />
                          </div>
                          <div>
                            <Label htmlFor="companyType">Company Type</Label>
                            <Input
                              id="companyType"
                              value={formData.companyType}
                              onChange={(e) => handleInputChange("companyType", e.target.value)}
                              placeholder="e.g., PTY Ltd, CC, Trust"
                              required
                            />
                          </div>
                        </>
                      )}

                      {userType === "supplier" && (
                        <>
                          <div>
                            <Label htmlFor="registrationNumber">Company Registration Number</Label>
                            <Input
                              id="registrationNumber"
                              value={formData.registrationNumber}
                              onChange={(e) => handleInputChange("registrationNumber", e.target.value)}
                              placeholder="e.g., 2024/123456/07"
                              required
                            />
                          </div>
                          <div>
                            <Label htmlFor="tradingAs">Trading As (DBA)</Label>
                            <Input
                              id="tradingAs"
                              value={formData.tradingAs}
                              onChange={(e) => handleInputChange("tradingAs", e.target.value)}
                              placeholder="Business name customers know you by"
                            />
                          </div>
                          <div>
                            <Label htmlFor="specialties">Service Categories</Label>
                            <Input
                              id="specialties"
                              value={formData.specialties}
                              onChange={(e) => handleInputChange("specialties", e.target.value)}
                              placeholder="e.g., Electrical, Plumbing, Roofing"
                              required
                            />
                          </div>
                          <div>
                            <Label htmlFor="businessAddress">Business Address</Label>
                            <Input
                              id="businessAddress"
                              value={formData.businessAddress}
                              onChange={(e) => handleInputChange("businessAddress", e.target.value)}
                              placeholder="Your business physical address"
                              required
                            />
                          </div>
                        </>
                      )}
                    </>
                  )}

                  <div>
                    <Label htmlFor="phoneNumber">Phone Number</Label>
                    <Input
                      id="phoneNumber"
                      type="tel"
                      value={formData.phoneNumber}
                      onChange={(e) => handleInputChange("phoneNumber", e.target.value)}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      value={formData.password}
                      onChange={(e) => handleInputChange("password", e.target.value)}
                      required
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="confirmPassword">Confirm Password</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={formData.confirmPassword}
                      onChange={(e) => handleInputChange("confirmPassword", e.target.value)}
                      required
                    />
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="agreeToTerms"
                        checked={formData.agreeToTerms}
                        onCheckedChange={(checked) => handleInputChange("agreeToTerms", checked as boolean)}
                      />
                      <Label htmlFor="agreeToTerms" className="text-sm">
                        I agree to the <Link href="/terms" className="text-primary hover:underline">Terms of Service</Link>
                      </Label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="agreeToMarketing"
                        checked={formData.agreeToMarketing}
                        onCheckedChange={(checked) => handleInputChange("agreeToMarketing", checked as boolean)}
                      />
                      <Label htmlFor="agreeToMarketing" className="text-sm">
                        I agree to receive marketing communications
                      </Label>
                    </div>
                  </div>
                  
                  <Button 
                    type="submit" 
                    className="w-full"
                    disabled={isLoading}
                  >
                    {isLoading ? "Creating Account..." : "Create Account"}
                  </Button>
                </form>
              </CardContent>
            </Card>
            
            <div className="text-center mt-4">
              <p className="text-sm text-gray-600">
                Already have an account? <Link href="/login" className="text-primary hover:underline">Sign in</Link>
              </p>
            </div>
          </div>
        )}

        {/* Benefits Footer */}
        <div className="mt-8 text-center">
          <div className="inline-flex items-center space-x-6 text-sm text-gray-600">
            <div className="flex items-center">
              <Home className="w-4 h-4 text-primary mr-2" />
              Free property setup
            </div>
            <div className="flex items-center">
              <Shield className="w-4 h-4 text-primary mr-2" />
              Document protection
            </div>
            <div className="flex items-center">
              <User className="w-4 h-4 text-primary mr-2" />
              Expert support
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}