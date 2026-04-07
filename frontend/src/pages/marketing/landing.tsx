import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, Shield, Users, FileText, CheckCircle, ArrowRight, Star, Eye, Zap, BarChart3 } from "lucide-react";
import Logo from "@/components/logo";

const features = [
  {
    icon: Shield,
    title: "AI Insurance Guidance",
    description: "Ask your AI assistant: 'What can I claim?' 'What documents do I need?' 'Is this covered?' Get expert guidance on SANS codes, NHBRC specs, and policy requirements.",
    highlight: "Know your rights instantly"
  },
  {
    icon: FileText,
    title: "Complete Property File",
    description: "Your developer creates the initial property file with approved plans, COCs, and warranties. Everything flows to you automatically upon transfer.",
    highlight: "Complete documentation from day one"
  },
  {
    icon: Building2,
    title: "Developer Integration",
    description: "Architects upload signed plans, electricians add COCs, plumbers share warranties - all builders and suppliers contribute to your property's DNA file.",
    highlight: "Built by professionals, owned by you"
  },
  {
    icon: Eye,
    title: "Undisputed Ownership Protection",
    description: "Comprehensive document trail with tamper-proof verification. Defend against expropriation without compensation with complete ownership history and legal documentation.",
    highlight: "Expropriation protection"
  },
  {
    icon: Users,
    title: "Direct Warranty Claims",
    description: "When issues arise, the AI guides you: claim from developer, contact supplier for warranty, or proceed with insurance. Skip the guesswork.",
    highlight: "Clear resolution paths"
  },
  {
    icon: BarChart3,
    title: "Empowered Property Ownership",
    description: "Access supplier databases, maintenance schedules, and comprehensive reports. You have all the information professionals use.",
    highlight: "Professional-level insights"
  }
];

const userTypes = [
  {
    title: "Home Owners",
    description: "Your complete property portfolio with AI-powered insights. Know your rights, protect your investment, and access professional services.",
    icon: Shield,
    color: "bg-green-500",
    pricing: "Free + R99/year premium",
    features: ["Single Property (Free)", "AI Insurance Guidance", "Document Storage", "Premium: Maintenance Alerts & Service Access"]
  },
  {
    title: "Property Developers",
    description: "Create comprehensive property documentation packages. Streamline handovers and deliver complete property files to buyers.",
    icon: Building2,
    color: "bg-blue-500",
    pricing: "Professional plans available",
    features: ["Bulk Property Creation", "Contractor Coordination", "Buyer Transfer Tools", "Complete Documentation Packages"]
  },
  {
    title: "Contractors & Suppliers",
    description: "Connect directly with property owners. Upload warranties and service documentation to build lasting client relationships.",
    icon: Users,
    color: "bg-orange-500",
    pricing: "Professional subscriptions",
    features: ["Direct Client Access", "Warranty Management", "Service Scheduling", "Professional Directory Listing"]
  }
];

const testimonials = [
  {
    name: "Sarah Thompson",
    role: "Portfolio Manager, Cape Town",
    content: "RezDNA prevented a R3.2M claim rejection by alerting us to an expired electrical COC. The AI caught what our team missed.",
    rating: 5,
    savings: "R3.2M saved"
  },
  {
    name: "Johan van der Merwe",
    role: "Property Investor, Johannesburg",
    content: "After the expropriation bill passed, I needed secure off-site documentation. RezDNA gave me peace of mind with complete ownership trails.",
    rating: 5,
    savings: "Legal protection secured"
  },
  {
    name: "Priya Patel",
    role: "Homeowner, Durban",
    content: "When our roof was damaged, RezDNA's compliance check ensured all maintenance was up to date. Full claim paid out in 2 weeks.",
    rating: 5,
    savings: "R450K claim approved"
  }
];

export default function LandingPage() {
  const [, navigate] = useLocation();

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Logo size="lg" />
          <nav className="hidden md:flex items-center space-x-8">
            <a href="#features" className="text-gray-600 hover:text-gray-900">Features</a>
            <a href="#for-whom" className="text-gray-600 hover:text-gray-900">Solutions</a>
            <a href="#testimonials" className="text-gray-600 hover:text-gray-900">Reviews</a>
            <a href="#pricing" className="text-gray-600 hover:text-gray-900">Pricing</a>
          </nav>
          <div className="flex items-center space-x-4">
            <Link href="/login">
              <Button variant="ghost">Sign In</Button>
            </Link>
            <Link href="/signup">
              <Button>Get Started</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto text-center">
          <Badge variant="destructive" className="mb-6">
            🚨 70% of Insurance Claims Rejected Due to Missing Documentation
          </Badge>
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight">
            Your Property's Complete
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent"> Digital Identity</span>
            <br />
            <span className="text-3xl text-gray-700">At Your Fingertips</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-4xl mx-auto leading-relaxed">
            <strong>Know exactly what's claimable, what's required, and how to proceed.</strong> Your property's complete documentation, 
            compliance status, and expert AI guidance - all in one place. Never lose another insurance claim to missing paperwork.
          </p>
          
          {/* DNA Code Demo */}
          <div className="bg-white rounded-lg border-2 border-blue-200 p-8 mb-8 max-w-2xl mx-auto">
            <h3 className="text-2xl font-semibold text-gray-900 mb-4 text-center">Your Property's Unique DNA Code</h3>
            <div className="bg-gray-50 rounded-lg p-6 font-mono text-center">
              <div className="text-3xl font-bold text-blue-600 mb-2">DNA-7841-CT</div>
              <div className="text-sm text-gray-600">123 Main Street, Cape Town</div>
            </div>
            <p className="text-center text-gray-600 mt-4">
              Simple to remember, like a number plate - one property, one permanent identifier
            </p>
          </div>
          
          {/* Key Benefits */}
          <div className="grid md:grid-cols-3 gap-6 mb-8 max-w-4xl mx-auto">
            <div className="bg-green-50 p-6 rounded-lg border border-green-200">
              <Shield className="w-8 h-8 text-green-600 mx-auto mb-3" />
              <h3 className="font-semibold text-gray-900 mb-2">Know Your Rights</h3>
              <p className="text-sm text-gray-600">Instant AI guidance on what's claimable, required documentation, and how to proceed</p>
            </div>
            <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
              <FileText className="w-8 h-8 text-blue-600 mx-auto mb-3" />
              <h3 className="font-semibold text-gray-900 mb-2">Everything In One Place</h3>
              <p className="text-sm text-gray-600">All property documents, warranties, and compliance records at your fingertips</p>
            </div>
            <div className="bg-purple-50 p-6 rounded-lg border border-purple-200">
              <Users className="w-8 h-8 text-purple-600 mx-auto mb-3" />
              <h3 className="font-semibold text-gray-900 mb-2">Professional Network</h3>
              <p className="text-sm text-gray-600">Access verified contractors and suppliers who upload warranties directly to your property</p>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link href="/signup?type=homeowner">
              <Button size="lg" className="px-8 bg-red-600 hover:bg-red-700">
                Property Owner Portal <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </Link>
            <Link href="/signup?type=developer">
              <Button size="lg" variant="outline" className="px-8">
                Developer Portal <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </Link>
            <Link href="/signup?type=supplier">
              <Button size="lg" variant="outline" className="px-8">
                Supplier Portal <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </Link>
          </div>
          <p className="text-sm text-gray-500 mt-4">Free tier available • Premium features from R99/year</p>
        </div>
      </section>

      {/* Statistics Section */}
      <section className="py-16 px-4 bg-red-900 text-white">
        <div className="container mx-auto text-center">
          <h2 className="text-3xl font-bold mb-8">The Hidden Cost of Missing Documentation</h2>
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="text-4xl font-bold mb-2">70%</div>
              <p className="text-red-200">Insurance claims rejected due to missing COCs or maintenance records</p>
            </div>
            <div>
              <div className="text-4xl font-bold mb-2">R2.5M</div>
              <p className="text-red-200">Average insurance claim value lost to technicalities</p>
            </div>
            <div>
              <div className="text-4xl font-bold mb-2">45%</div>
              <p className="text-red-200">Properties lack proper maintenance documentation</p>
            </div>
            <div>
              <div className="text-4xl font-bold mb-2">89%</div>
              <p className="text-red-200">Owners worried about expropriation documentation</p>
            </div>
          </div>
          <div className="mt-8">
            <Link href="/signup">
              <Button size="lg" className="bg-white text-red-900 hover:bg-gray-100">
                Don't Become Another Statistic
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-4 bg-gray-50">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Empowering Property Owners with Professional-Level Intelligence
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Get instant answers to complex property questions. Know your insurance rights, understand compliance requirements, and access professional databases - everything you need to protect your investment.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="p-6 hover:shadow-lg transition-shadow">
                <CardContent className="p-0">
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                    <feature.icon className="w-6 h-6 text-primary" />
                  </div>
                  <Badge variant="secondary" className="mb-3 text-xs">{feature.highlight}</Badge>
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">{feature.title}</h3>
                  <p className="text-gray-600">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* For Whom Section */}
      <section id="for-whom" className="py-20 px-4">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Three Portals, One Ecosystem
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Separate portals designed for each user type. Property owners get complete control and transparency, while professionals can contribute documentation and connect with clients.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {userTypes.map((type, index) => (
              <Card key={index} className="p-6 hover:shadow-lg transition-all hover:scale-105">
                <CardContent className="p-0">
                  <div className={`w-12 h-12 ${type.color} rounded-lg flex items-center justify-center mb-4`}>
                    <type.icon className="w-6 h-6 text-white" />
                  </div>
                  <Badge variant="secondary" className="mb-3">{type.pricing}</Badge>
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">{type.title}</h3>
                  <p className="text-gray-600 mb-4">{type.description}</p>
                  <ul className="text-sm text-gray-600 mb-4 space-y-1">
                    {type.features.map((feature, idx) => (
                      <li key={idx} className="flex items-center">
                        <CheckCircle className="w-3 h-3 text-green-500 mr-2 flex-shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <Link href="/signup">
                    <Button variant="outline" size="sm" className="w-full">
                      Get Started <ArrowRight className="ml-2 w-3 h-3" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Expropriation Protection Section */}
      <section className="py-20 px-4 bg-blue-50">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <Badge variant="destructive" className="mb-4">
              🏠 Expropriation Without Compensation is Law
            </Badge>
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Protect Your Property Rights with Unbreakable Documentation
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              With South Africa's expropriation laws now in effect, having complete, tamper-proof documentation 
              of your property ownership and improvements is more critical than ever.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h3 className="text-2xl font-bold text-gray-900 mb-6">What You Need to Protect Yourself:</h3>
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <CheckCircle className="w-6 h-6 text-green-500 flex-shrink-0 mt-1" />
                  <div>
                    <strong className="text-gray-900">Complete ownership trail</strong> - Every deed, transfer, and legal document
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <CheckCircle className="w-6 h-6 text-green-500 flex-shrink-0 mt-1" />
                  <div>
                    <strong className="text-gray-900">Property improvement records</strong> - Proof of all investments and upgrades
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <CheckCircle className="w-6 h-6 text-green-500 flex-shrink-0 mt-1" />
                  <div>
                    <strong className="text-gray-900">Secure off-site storage</strong> - Protected from physical loss or damage
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <CheckCircle className="w-6 h-6 text-green-500 flex-shrink-0 mt-1" />
                  <div>
                    <strong className="text-gray-900">Tamper-proof verification</strong> - SHA-256 hashing ensures document integrity
                  </div>
                </div>
              </div>
            </div>
            
            <div className="bg-white p-8 rounded-lg border border-blue-200">
              <h4 className="text-xl font-semibold text-gray-900 mb-4">Legal Peace of Mind</h4>
              <p className="text-gray-600 mb-6">
                RezDNA creates an unbreakable chain of custody for your property documents. 
                Every upload is timestamped, hashed, and stored with forensic-level security that courts recognize.
              </p>
              <div className="bg-blue-50 p-4 rounded-lg mb-6">
                <p className="text-sm text-blue-800">
                  <strong>"Having complete, verified documentation was crucial when our client faced expropriation proceedings. 
                  The detailed ownership trail helped secure fair compensation."</strong>
                  <br />
                  <span className="text-blue-600">- Legal Professional, Property Law Firm</span>
                </p>
              </div>
              <Link href="/signup">
                <Button className="w-full">
                  Secure My Property Documentation
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Existing Property Owners Section */}
      <section className="py-20 px-4 bg-gray-50">
        <div className="container mx-auto text-center">
          <div className="mb-16">
            <h2 className="text-4xl font-bold mb-4 text-gray-900">
              Already Own Your Property?
            </h2>
            <p className="text-xl max-w-3xl mx-auto text-gray-700 mb-8">
              Your property was built before RezDNA existed, but that doesn't mean you can't protect it now. 
              Create your property's digital identity and start building comprehensive documentation today.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-6xl mx-auto">
            {/* Step 1 */}
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-white">1</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Register Your Property</h3>
              <p className="text-sm text-gray-600">
                Create a unique DNA code for your existing home. Simple as getting a new number plate.
              </p>
            </div>

            {/* Step 2 */}
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-white">2</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Gather What You Have</h3>
              <p className="text-sm text-gray-600">
                Upload existing documents: original plans, previous COCs, insurance policies, warranties you still have.
              </p>
            </div>

            {/* Step 3 */}
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-white">3</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Fill the Gaps</h3>
              <p className="text-sm text-gray-600">
                Schedule inspections for missing COCs, update expired certificates, get current valuations.
              </p>
            </div>

            {/* Step 4 */}
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-white">4</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Future-Proof</h3>
              <p className="text-sm text-gray-600">
                All future work automatically updates your RezDNA profile. Never lose documentation again.
              </p>
            </div>
          </div>

          <div className="mt-16 bg-white p-8 rounded-lg shadow-lg max-w-4xl mx-auto">
            <h3 className="text-2xl font-bold text-gray-900 mb-6">Common Scenarios for Existing Properties</h3>
            
            <div className="grid md:grid-cols-2 gap-8 text-left">
              <div>
                <h4 className="font-semibold text-gray-900 mb-3">🏠 Inherited Property</h4>
                <p className="text-gray-600 text-sm mb-4">
                  Missing documentation from previous owners? Start fresh with a complete RezDNA file and rebuild your property's history.
                </p>
                
                <h4 className="font-semibold text-gray-900 mb-3">🔧 Major Renovations</h4>
                <p className="text-gray-600 text-sm">
                  Planning extensions or major work? Create your RezDNA profile first, then all contractors contribute directly to your file.
                </p>
              </div>
              
              <div>
                <h4 className="font-semibold text-gray-900 mb-3">📄 Insurance Claims</h4>
                <p className="text-gray-600 text-sm mb-4">
                  Had claim rejections due to missing documents? Build your comprehensive file now to protect future claims.
                </p>
                
                <h4 className="font-semibold text-gray-900 mb-3">💰 Preparing to Sell</h4>
                <p className="text-gray-600 text-sm">
                  Complete RezDNA documentation adds value and speeds up sales. Buyers love comprehensive documentation.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-12">
            <Link href="/signup?type=homeowner&scenario=existing">
              <Button size="lg" className="px-8 bg-blue-600 hover:bg-blue-700 text-white">
                Create Profile for My Existing Property
              </Button>
            </Link>
            <p className="text-gray-600 mt-4">Start with what you have, build what you need</p>
          </div>
        </div>
      </section>

      {/* Call to Action for Property Owners */}
      <section className="py-20 px-4 bg-gradient-to-r from-green-500 to-blue-600 text-white">
        <div className="container mx-auto text-center">
          <div className="mb-16">
            <h2 className="text-4xl font-bold mb-4">
              Property Owners: Demand Better Documentation
            </h2>
            <p className="text-xl max-w-4xl mx-auto mb-8">
              Understanding the SA building industry roles and what documentation you should expect from each professional.
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8 max-w-7xl mx-auto text-left">
            {/* Buying from Developer */}
            <div className="bg-white/10 p-6 rounded-lg backdrop-blur-sm">
              <h3 className="text-xl font-bold mb-4">📍 Buying from a Developer</h3>
              <p className="text-white/90 mb-4 text-sm">
                Developers purchase land, rezone, and build homes/apartments/clusters for sale.
              </p>
              <div className="space-y-3">
                <div className="flex items-start space-x-2">
                  <CheckCircle className="w-4 h-4 text-white flex-shrink-0 mt-0.5" />
                  <div className="text-sm">Insist on complete RezDNA documentation</div>
                </div>
                <div className="flex items-start space-x-2">
                  <CheckCircle className="w-4 h-4 text-white flex-shrink-0 mt-0.5" />
                  <div className="text-sm">All approved plans and municipal approvals</div>
                </div>
                <div className="flex items-start space-x-2">
                  <CheckCircle className="w-4 h-4 text-white flex-shrink-0 mt-0.5" />
                  <div className="text-sm">Sub-contractor warranties and COCs</div>
                </div>
                <div className="flex items-start space-x-2">
                  <CheckCircle className="w-4 h-4 text-white flex-shrink-0 mt-0.5" />
                  <div className="text-sm">NHBRC certificates and compliance docs</div>
                </div>
              </div>
            </div>

            {/* Using Main Builder/Contractor */}
            <div className="bg-white/10 p-6 rounded-lg backdrop-blur-sm">
              <h3 className="text-xl font-bold mb-4">🏗️ Using a Main Builder/Contractor</h3>
              <p className="text-white/90 mb-4 text-sm">
                You own the land and employ a contractor for a complete building package.
              </p>
              <div className="space-y-3">
                <div className="flex items-start space-x-2">
                  <CheckCircle className="w-4 h-4 text-white flex-shrink-0 mt-0.5" />
                  <div className="text-sm">Register RezDNA file first</div>
                </div>
                <div className="flex items-start space-x-2">
                  <CheckCircle className="w-4 h-4 text-white flex-shrink-0 mt-0.5" />
                  <div className="text-sm">Share access with main contractor</div>
                </div>
                <div className="flex items-start space-x-2">
                  <CheckCircle className="w-4 h-4 text-white flex-shrink-0 mt-0.5" />
                  <div className="text-sm">Require all sub-contractors upload directly</div>
                </div>
                <div className="flex items-start space-x-2">
                  <CheckCircle className="w-4 h-4 text-white flex-shrink-0 mt-0.5" />
                  <div className="text-sm">Complete handover documentation</div>
                </div>
              </div>
            </div>

            {/* Ongoing Services */}
            <div className="bg-white/10 p-6 rounded-lg backdrop-blur-sm">
              <h3 className="text-xl font-bold mb-4">🔧 Ongoing Services & Additions</h3>
              <p className="text-white/90 mb-4 text-sm">
                Electricians, plumbers, suppliers, and specialized contractors post-completion.
              </p>
              <div className="space-y-3">
                <div className="flex items-start space-x-2">
                  <CheckCircle className="w-4 h-4 text-white flex-shrink-0 mt-0.5" />
                  <div className="text-sm">Require upload to existing RezDNA profile</div>
                </div>
                <div className="flex items-start space-x-2">
                  <CheckCircle className="w-4 h-4 text-white flex-shrink-0 mt-0.5" />
                  <div className="text-sm">Warranties and service schedules</div>
                </div>
                <div className="flex items-start space-x-2">
                  <CheckCircle className="w-4 h-4 text-white flex-shrink-0 mt-0.5" />
                  <div className="text-sm">For additions: complete build documentation</div>
                </div>
                <div className="flex items-start space-x-2">
                  <CheckCircle className="w-4 h-4 text-white flex-shrink-0 mt-0.5" />
                  <div className="text-sm">Individual specialist contributions</div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="mt-12">
            <Link href="/signup?type=homeowner">
              <Button size="lg" className="px-8 bg-white text-green-600 hover:bg-gray-100 mr-4">
                Start Your RezDNA Profile Now
              </Button>
            </Link>
            <p className="text-white/80 mt-4">Take control of your property documentation and demand professional accountability</p>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section id="testimonials" className="py-20 px-4 bg-gray-50">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Real South Africans, Real Savings
            </h2>
            <p className="text-xl text-gray-600">See what our customers are saying about RezDNA</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <Card key={index} className="p-6">
                <CardContent className="p-0">
                  <Badge variant="outline" className="mb-4 text-green-700 border-green-300">
                    {testimonial.savings}
                  </Badge>
                  <div className="flex mb-4">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="w-5 h-5 text-yellow-400 fill-current" />
                    ))}
                  </div>
                  <p className="text-gray-700 mb-4">"{testimonial.content}"</p>
                  <div>
                    <p className="font-semibold text-gray-900">{testimonial.name}</p>
                    <p className="text-sm text-gray-600">{testimonial.role}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-gradient-to-r from-red-600 to-orange-600 text-white">
        <div className="container mx-auto text-center">
          <h2 className="text-4xl font-bold mb-4">
            Don't Wait Until It's Too Late
          </h2>
          <p className="text-xl mb-8 max-w-3xl mx-auto">
            Every day without proper documentation puts your property at risk. Join 2,000+ South African property owners who've protected their investments with RezDNA.
          </p>
          <div className="flex justify-center items-center">
            <Link href="/signup">
              <Button size="lg" className="px-8 bg-white text-red-600 hover:bg-gray-100">
                Protect My Property Now <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </Link>
          </div>
          <div className="flex items-center justify-center mt-8 space-x-8 text-sm text-gray-500">
            <div className="flex items-center">
              <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
              14-day free trial
            </div>
            <div className="flex items-center">
              <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
              No credit card required
            </div>
            <div className="flex items-center">
              <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
              Cancel anytime
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-gray-50 py-12 px-4">
        <div className="container mx-auto">
          <div className="flex items-center justify-between">
            <Logo size="sm" />
            <div className="text-sm text-gray-600">
              © 2024 RezDNA. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}