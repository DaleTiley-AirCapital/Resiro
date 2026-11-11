#!/bin/bash

# Property DNA Platform - GitHub Repository Setup Script
echo "🏠 Setting up Property DNA Platform GitHub repository..."

# Check if GITHUB_PERSONAL_ACCESS_TOKEN is available
if [ -z "$GITHUB_PERSONAL_ACCESS_TOKEN" ]; then
    echo "❌ Error: GITHUB_PERSONAL_ACCESS_TOKEN environment variable is not set"
    echo "Please add your GitHub Personal Access Token to Replit Secrets"
    exit 1
fi

# Set git configuration
echo "⚙️  Configuring git..."
git config --global user.email "property-dna@replit.com"
git config --global user.name "Property DNA Platform"

# Create GitHub repository using GitHub API
echo "📁 Creating GitHub repository..."
REPO_NAME="property-dna-platform"
GITHUB_USERNAME=$(curl -s -H "Authorization: token $GITHUB_PERSONAL_ACCESS_TOKEN" https://api.github.com/user | grep '"login"' | cut -d '"' -f 4)

echo "👤 GitHub username: $GITHUB_USERNAME"

# Create repository
curl -X POST \
  -H "Authorization: token $GITHUB_PERSONAL_ACCESS_TOKEN" \
  -H "Accept: application/vnd.github.v3+json" \
  https://api.github.com/user/repos \
  -d "{
    \"name\": \"$REPO_NAME\",
    \"description\": \"Digital property management platform creating unique DNA codes for South African properties\",
    \"private\": false,
    \"auto_init\": false
  }"

echo "📦 Repository created: https://github.com/$GITHUB_USERNAME/$REPO_NAME"

# Add all files and commit
echo "📝 Adding and committing files..."
git add .
git commit -m "Initial commit: Property DNA Platform with Individual user experience

- Created tailored Individual user dashboard with properties overview
- Added demo property (DNA-DEMO-CT) for user onboarding
- Implemented new property form with ERF/Township/Municipality fields
- Built individual property dashboard for complete property management
- Company users see 'Coming Soon' page for future development
- Modular architecture maintains separation between user types
- Navigation flows: Properties Overview → Add Property → Property Dashboard

Features implemented:
✓ Individual user properties overview dashboard
✓ Demo property system for onboarding
✓ Add new property form with SA property details
✓ Individual property dashboard for management
✓ Company 'Coming Soon' experience
✓ Modular navigation architecture
✓ React + TypeScript frontend
✓ Express + PostgreSQL backend
✓ Multi-tenant with Row-Level Security
✓ JWT authentication system"

# Add remote and push
echo "🚀 Pushing to GitHub..."
git remote add origin https://$GITHUB_PERSONAL_ACCESS_TOKEN@github.com/$GITHUB_USERNAME/$REPO_NAME.git
git branch -M main
git push -u origin main

echo "✅ Successfully pushed Property DNA Platform to GitHub!"
echo "🌐 Repository URL: https://github.com/$GITHUB_USERNAME/$REPO_NAME"
echo ""
echo "📋 Repository includes:"
echo "  ✓ Complete Individual user experience"
echo "  ✓ Properties overview dashboard"
echo "  ✓ Demo property system"
echo "  ✓ Property creation form"
echo "  ✓ Individual property dashboard"
echo "  ✓ Company 'Coming Soon' experience"
echo "  ✓ Comprehensive documentation"
echo "  ✓ Full project setup instructions"
echo ""
echo "🎉 Your Property DNA Platform is now on GitHub and ready for development!"