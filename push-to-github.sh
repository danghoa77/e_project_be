#!/bin/bash

echo "🚀 Pushing E-Commerce Mobile App to GitHub..."
echo "Repository: https://github.com/danghoa77/mobile_e.git"
echo ""

# Check if we're in a git repository
if [ ! -d ".git" ]; then
    echo "❌ Error: Not in a git repository. Please run this script from the mobile app directory."
    exit 1
fi

# Check if remote origin is set
if ! git remote get-url origin > /dev/null 2>&1; then
    echo "📋 Setting up remote repository..."
    git remote add origin https://github.com/danghoa77/mobile_e.git
fi

# Check current status
echo "📊 Git Status:"
git status --short

echo ""
echo "📤 Pushing to GitHub..."

# Push to GitHub
if git push -u origin main; then
    echo ""
    echo "🎉 SUCCESS! Your e-commerce mobile app has been pushed to GitHub!"
    echo ""
    echo "📱 Your repository is now available at:"
    echo "   https://github.com/danghoa77/mobile_e.git"
    echo ""
    echo "🚀 Next Steps:"
    echo "1. Clone the repository on your local machine:"
    echo "   git clone https://github.com/danghoa77/mobile_e.git"
    echo ""
    echo "2. Navigate to the project:"
    echo "   cd mobile_e"
    echo ""
    echo "3. Install dependencies:"
    echo "   npm install"
    echo ""
    echo "4. Configure environment:"
    echo "   cp .env.example .env"
    echo "   # Edit .env with your API keys"
    echo ""
    echo "5. Start the development server:"
    echo "   npm start"
    echo ""
    echo "6. Scan QR code with Expo Go app on your phone!"
    echo ""
    echo "📚 Read README.md for detailed setup instructions"
    echo "📚 Check DEPLOYMENT.md for production deployment guide"
    echo ""
else
    echo ""
    echo "❌ Push failed. This might be due to:"
    echo "1. Authentication issues - make sure you're logged into GitHub"
    echo "2. Repository permissions - ensure you have write access"
    echo "3. Network issues"
    echo ""
    echo "🔧 Manual steps to push:"
    echo "1. Make sure you're authenticated with GitHub"
    echo "2. Run: git push -u origin main"
    echo ""
    echo "💡 If you need to authenticate:"
    echo "   - Use GitHub CLI: gh auth login"
    echo "   - Or configure SSH keys"
    echo "   - Or use personal access token"
fi