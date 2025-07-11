#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Setting up E-Commerce Mobile App...\n');

// Function to run commands
function runCommand(command, description) {
  console.log(`📦 ${description}...`);
  try {
    execSync(command, { stdio: 'inherit', cwd: __dirname });
    console.log(`✅ ${description} completed!\n`);
  } catch (error) {
    console.error(`❌ Error during ${description}:`, error.message);
    process.exit(1);
  }
}

// Function to create directories if they don't exist
function createDirectories() {
  const directories = [
    'assets',
    'src/components/common',
    'src/components/product',
    'src/components/cart',
    'src/components/auth',
    'src/components/chat',
    'src/components/payment',
    'src/screens/auth',
    'src/screens/home',
    'src/screens/product',
    'src/screens/cart',
    'src/screens/orders',
    'src/screens/profile',
    'src/screens/chat',
    'src/navigation',
    'src/services',
    'src/store/slices',
    'src/store/middleware',
    'src/types',
    'src/utils',
    'src/constants'
  ];

  console.log('📁 Creating project directories...');
  directories.forEach(dir => {
    const fullPath = path.join(__dirname, dir);
    if (!fs.existsSync(fullPath)) {
      fs.mkdirSync(fullPath, { recursive: true });
    }
  });
  console.log('✅ Directories created!\n');
}

// Function to create basic asset files
function createAssets() {
  console.log('🎨 Creating placeholder assets...');
  
  const assetsDir = path.join(__dirname, 'assets');
  if (!fs.existsSync(assetsDir)) {
    fs.mkdirSync(assetsDir, { recursive: true });
  }

  // Create placeholder files
  const placeholderFiles = [
    'icon.png',
    'splash.png',
    'adaptive-icon.png',
    'favicon.png',
    'notification-icon.png'
  ];

  placeholderFiles.forEach(file => {
    const filePath = path.join(assetsDir, file);
    if (!fs.existsSync(filePath)) {
      // Create an empty file as placeholder
      fs.writeFileSync(filePath, '');
    }
  });

  console.log('✅ Placeholder assets created!\n');
}

// Function to create environment file
function createEnvFile() {
  console.log('⚙️ Creating environment configuration...');
  
  const envContent = `# E-Commerce Mobile App Environment Configuration

# API Configuration
API_BASE_URL=http://localhost:3000
API_TIMEOUT=30000

# Stripe Configuration (Get from https://stripe.com)
STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key_here

# Google OAuth Configuration (Get from Google Cloud Console)
GOOGLE_IOS_CLIENT_ID=your-ios-client-id.googleusercontent.com
GOOGLE_ANDROID_CLIENT_ID=your-android-client-id.googleusercontent.com
GOOGLE_WEB_CLIENT_ID=your-web-client-id.googleusercontent.com

# TalkJS Configuration (Get from https://talkjs.com)
TALKJS_APP_ID=your-talkjs-app-id

# Development Configuration
DEV_MODE=true
DEBUG_REDUX=true
`;

  const envPath = path.join(__dirname, '.env.example');
  fs.writeFileSync(envPath, envContent);
  
  console.log('✅ Environment configuration created!\n');
  console.log('📝 Please copy .env.example to .env and update with your API keys\n');
}

// Main setup function
async function setup() {
  try {
    // Create project structure
    createDirectories();
    createAssets();
    createEnvFile();

    // Install dependencies
    runCommand('npm install', 'Installing dependencies');

    // Fix any dependency issues
    runCommand('npx expo install --fix', 'Fixing Expo dependencies');

    // Initialize Git repository
    if (!fs.existsSync(path.join(__dirname, '.git'))) {
      runCommand('git init', 'Initializing Git repository');
      
      // Create .gitignore if it doesn't exist
      const gitignorePath = path.join(__dirname, '.gitignore');
      if (!fs.existsSync(gitignorePath)) {
        const gitignoreContent = `# Dependencies
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Expo
.expo/
dist/
web-build/

# Native
*.orig.*
*.jks
*.p8
*.p12
*.key
*.mobileprovision

# Metro
.metro-health-check*

# Debug
npm-debug.*
yarn-debug.*
yarn-error.*

# macOS
.DS_Store

# Temporary files
*.tmp
*.temp

# Log files
*.log

# Runtime data
pids
*.pid
*.seed
*.pid.lock

# Environment variables
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# IDE
.vscode/
.idea/
*.swp
*.swo

# OS generated files
Thumbs.db
ehthumbs.db
Desktop.ini
`;
        fs.writeFileSync(gitignorePath, gitignoreContent);
      }
    }

    console.log('🎉 Setup completed successfully!\n');
    console.log('📋 Next steps:');
    console.log('1. Copy .env.example to .env and update with your API keys');
    console.log('2. Make sure your backend services are running');
    console.log('3. Update API_BASE_URL in src/constants/index.ts');
    console.log('4. Run "npm start" to start the development server');
    console.log('5. Scan the QR code with Expo Go app on your device\n');
    
    console.log('🔗 Useful commands:');
    console.log('• npm start          - Start development server');
    console.log('• npm run ios        - Run on iOS simulator');
    console.log('• npm run android    - Run on Android emulator');
    console.log('• npm run web        - Run on web browser');
    console.log('• npm run build      - Build the app\n');
    
    console.log('📚 Documentation: Check README.md for detailed setup instructions');

  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    process.exit(1);
  }
}

// Run setup
setup();