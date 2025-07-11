# 🚀 Quick Setup Guide

Follow these steps to push your e-commerce mobile app to GitHub and get it running on your device.

## Step 1: Push to GitHub

Since you need to authenticate with your GitHub account, you'll need to push the code manually:

### Option A: Using Command Line

```bash
# Make sure you're in the mobile app directory
cd /workspace/ecommerce-mobile-app

# Push to your GitHub repository
git push -u origin main
```

### Option B: If you get authentication errors

1. **Install GitHub CLI** (if not already installed):
   ```bash
   # On Ubuntu/Debian
   sudo apt install gh
   
   # On macOS
   brew install gh
   ```

2. **Login to GitHub**:
   ```bash
   gh auth login
   ```
   Follow the prompts to authenticate with your GitHub account.

3. **Push the code**:
   ```bash
   git push -u origin main
   ```

### Option C: Using Personal Access Token

If you prefer using a personal access token:

1. Go to GitHub.com → Settings → Developer settings → Personal access tokens
2. Generate a new token with repo permissions
3. Use it when prompted for password:
   ```bash
   git push -u origin main
   # Username: your-github-username
   # Password: your-personal-access-token
   ```

## Step 2: Download and Run on Your Local Machine

Once the code is pushed to GitHub, you can download and run it:

### 1. Clone the Repository

```bash
git clone https://github.com/danghoa77/mobile_e.git
cd mobile_e
```

### 2. Install Dependencies

```bash
npm install
```

If you encounter dependency issues:
```bash
npx expo install --fix
```

### 3. Configure Environment

```bash
# Copy the environment template
cp .env.example .env

# Edit the .env file with your configuration
nano .env  # or use your preferred editor
```

**Important environment variables to update:**
- `API_BASE_URL` - Your backend API URL
- `STRIPE_PUBLISHABLE_KEY` - Your Stripe publishable key
- Google OAuth client IDs (if using Google login)

### 4. Update API Configuration

Edit `src/constants/index.ts` and update:
```typescript
export const API_BASE_URL = 'http://your-backend-url:3000';
```

### 5. Start the Development Server

```bash
npm start
```

### 6. Run on Your Device

- **Install Expo Go** app on your phone from App Store/Play Store
- **Scan the QR code** displayed in the terminal
- The app will load on your device!

### 7. Alternative: Run on Simulator

```bash
# For iOS Simulator (macOS only)
npm run ios

# For Android Emulator
npm run android

# For Web Browser
npm run web
```

## Step 3: Configure Your Backend

Make sure your backend microservices are running:

- **User Service**: `http://localhost:3001`
- **Product Service**: `http://localhost:3002`
- **Order Service**: `http://localhost:3003`
- **Payment Service**: `http://localhost:3004`
- **API Gateway**: `http://localhost:3000`

## Step 4: Test the App

1. **Authentication**: Try logging in with email/password
2. **Products**: Browse the product catalog
3. **Cart**: Add items to cart
4. **Orders**: Place a test order
5. **Payments**: Test with Stripe test cards

## Troubleshooting

### Common Issues:

1. **Metro bundler cache issues**:
   ```bash
   npx expo start --clear
   ```

2. **Dependencies not found**:
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   npx expo install --fix
   ```

3. **Backend connection issues**:
   - Check if your backend services are running
   - Verify `API_BASE_URL` in constants
   - Check network connectivity

4. **Environment variables not working**:
   - Make sure `.env` file is in the root directory
   - Restart the development server after changing .env

### Need Help?

- 📚 Check `README.md` for detailed documentation
- 🚀 See `DEPLOYMENT.md` for production deployment
- 🐛 Create an issue in the GitHub repository

## What's Included

Your mobile app includes:

✅ **Complete Authentication System**
- Email/Password login
- Google OAuth integration
- JWT token management
- Profile management

✅ **E-commerce Features**
- Product catalog with search
- Shopping cart functionality
- Order management
- Payment processing (Stripe)

✅ **Modern UI/UX**
- Material Design 3
- Dark/Light theme support
- Responsive design
- Smooth animations

✅ **Advanced Features**
- Real-time chat (TalkJS)
- Push notifications
- Offline support
- Barcode scanner

✅ **Production Ready**
- TypeScript for type safety
- Redux for state management
- Comprehensive error handling
- Security best practices

## Next Steps

1. ✅ Push code to GitHub
2. ✅ Download and run locally
3. 🔧 Configure your API keys
4. 🎨 Customize the theme and branding
5. 📱 Test on multiple devices
6. 🚀 Deploy to app stores (see DEPLOYMENT.md)

Happy coding! 🎉