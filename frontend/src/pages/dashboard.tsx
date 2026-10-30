import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Header from "@/components/layout/header";
import Logo from "@/components/logo";
import { useAuth } from "@/hooks/use-auth";
import { Building2, Home, Plus, MapPin, FileText, Clock, AlertTriangle } from "lucide-react";

interface Property {
  id: string;
  dnaCode: string;
  address: string;
  erfNumber?: string;
  township?: string;
  municipality?: string;
  isDemo: boolean;
  documentsCount?: number;
  lastActivity?: string;
  complianceStatus?: 'good' | 'warning' | 'critical';
}

// Individual User Dashboard - Properties Overview
function IndividualDashboard() {
  const { data: properties, isLoading, error } = useQuery<Property[]>({
    queryKey: ["/api/properties"],
    enabled: true,
  });

  // Demo property for new users
  const demoProperty: Property = {
    id: 'demo',
    dnaCode: 'RES-DEMO-CT',
    address: '123 Example Street, Cape Town',
    erfNumber: 'ERF123',
    township: 'Gardens',
    municipality: 'City of Cape Town',
    isDemo: true,
    documentsCount: 5,
    lastActivity: 'Demo data updated',
    complianceStatus: 'good'
  };

  const allProperties = [demoProperty, ...(properties || [])];

  return (
    <div className="space-y-6">
      {error && <p role="alert" className="text-red-700">Properties could not be loaded. Refresh to retry.</p>}
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-6 border border-blue-200">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Your Property Portfolio</h2>
        <p className="text-gray-600 mb-4">
          Each property gets a unique DNA code that travels with it forever. Manage your documents, get AI compliance checking, and protect your investment.
        </p>
        <div className="flex flex-wrap gap-4">
          <div className="bg-white px-4 py-2 rounded-lg border">
            <span className="text-sm font-medium text-gray-900">Free:</span>
            <span className="text-sm text-gray-600 ml-2">1 property with basic features</span>
          </div>
          <div className="bg-white px-4 py-2 rounded-lg border">
            <span className="text-sm font-medium text-gray-900">Premium R99/year:</span>
            <span className="text-sm text-gray-600 ml-2">Multiple properties, maintenance alerts</span>
          </div>
        </div>
        
      </div>

      {/* Properties Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Add New Property Card */}
        <Link href="/properties/new">
          <Card className="cursor-pointer hover:shadow-lg transition-all border-dashed border-2 border-primary/30 hover:border-primary">
            <CardContent className="flex flex-col items-center justify-center p-8 text-center min-h-[280px]">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                <Plus className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Add New Property</h3>
              <p className="text-gray-600 text-sm">
                Create a RezDNA property file for your existing or new property
              </p>
              <Button className="mt-4" size="sm">
                Get Started
              </Button>
            </CardContent>
          </Card>
        </Link>

        {/* Property Cards */}
        {isLoading ? (
          <Card>
            <CardContent className="p-8 text-center">
              <div className="animate-pulse">Loading properties...</div>
            </CardContent>
          </Card>
        ) : (
          allProperties.map((property) => (
            <Link key={property.id} href={`/properties/${property.id}`}>
              <Card className="cursor-pointer hover:shadow-lg transition-all h-full">
                <CardHeader className="pb-4">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center space-x-2">
                      <Home className="w-5 h-5 text-primary" />
                      <CardTitle className="text-lg">{property.dnaCode || (property as any).dnaId}</CardTitle>
                    </div>
                    {property.isDemo && (
                      <Badge variant="outline" className="text-xs">
                        DEMO
                      </Badge>
                    )}
                  </div>
                  <CardDescription className="text-sm">
                    <div className="flex items-center space-x-1">
                      <MapPin className="w-3 h-3" />
                      <span>{property.address}</span>
                    </div>
                  </CardDescription>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  {/* Property Details */}
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {property.erfNumber && (
                      <div>
                        <span className="text-gray-500">ERF:</span>
                        <span className="ml-1 font-medium">{property.erfNumber}</span>
                      </div>
                    )}
                    {property.township && (
                      <div>
                        <span className="text-gray-500">Area:</span>
                        <span className="ml-1 font-medium">{property.township}</span>
                      </div>
                    )}
                  </div>

                  {/* Status Indicators */}
                  <div className="flex justify-between items-center">
                    <div className="flex items-center space-x-3 text-sm">
                      <div className="flex items-center space-x-1">
                        <FileText className="w-4 h-4 text-gray-400" />
                        <span>{property.documentsCount || 0} docs</span>
                      </div>
                      {property.complianceStatus && (
                        <div className="flex items-center space-x-1">
                          {property.complianceStatus === 'good' && (
                            <div className="w-2 h-2 bg-green-500 rounded-full" />
                          )}
                          {property.complianceStatus === 'warning' && (
                            <div className="w-2 h-2 bg-yellow-500 rounded-full" />
                          )}
                          {property.complianceStatus === 'critical' && (
                            <div className="w-2 h-2 bg-red-500 rounded-full" />
                          )}
                          <span className="capitalize">{property.complianceStatus}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {property.lastActivity && (
                    <div className="flex items-center space-x-1 text-xs text-gray-500 mt-2">
                      <Clock className="w-3 h-3" />
                      <span>{property.lastActivity}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}

// Company Dashboard - Coming Soon
function CompanyDashboard() {
  return (
    <div className="text-center py-16">
      <div className="max-w-md mx-auto">
        <Building2 className="w-16 h-16 text-primary mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Company Dashboard</h2>
        <p className="text-gray-600 mb-6">
          Professional tools for property managers, contractors, developers, and service providers.
        </p>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <AlertTriangle className="w-6 h-6 text-blue-600 mx-auto mb-2" />
          <p className="text-blue-800 font-medium">Coming Soon</p>
          <p className="text-blue-600 text-sm mt-1">
            We're building specialized tools for your business type. Stay tuned!
          </p>
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { user, logout } = useAuth();
  const [, navigate] = useLocation();
  
  // Determine user type from auth context
  const userType = user?.userType || 'homeowner';
  
  // Property dashboard for individual users, company investors, and property managers
  // Suppliers should be redirected to their dedicated portal
  const showPropertiesDashboard = [
    'homeowner',
    'investor',
    'company_investor',
    'property_manager'
  ].includes(userType);
  
  // Redirect suppliers to supplier portal
  if (userType === 'supplier') {
    window.location.href = '/supplier';
    return null;
  }
  
  // Custom titles based on user type
  const getTitle = () => {
    switch (userType) {
      case 'company_investor':
        return "Corporate Property Portfolio";
      case 'property_manager':
        return "Managed Properties";
      default:
        return "Your Properties";
    }
  };
  
  const getSubtitle = () => {
    switch (userType) {
      case 'company_investor':
        return "Manage your company's property investments and documentation";
      case 'property_manager':
        return "Oversee property portfolios and tenant relationships";
      default:
        return "Manage your RezDNA property files and documentation";
    }
  };
  
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header with Logo */}
      <div className="bg-white border-b border-gray-200">
        <div className="px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex flex-wrap items-center gap-4 sm:gap-10">
              <div className="flex-shrink-0">
                <Logo size="lg" />
              </div>
              <div className="sm:border-l border-gray-300 sm:pl-10 sm:ml-2">
                <h1 className="text-2xl font-semibold text-gray-900">{getTitle()}</h1>
                <p className="text-gray-600">{getSubtitle()}</p>
              </div>
            </div>
            <Button variant="outline" onClick={() => { logout(); navigate("/login"); }}>Sign out</Button>
          </div>
        </div>
      </div>
      
      <main className="flex-1 p-8 overflow-auto bg-gray-50">
        {showPropertiesDashboard ? <IndividualDashboard /> : <CompanyDashboard />}
      </main>
    </div>
  );
}
