# Deployment Guide

This guide covers how to deploy your e-commerce mobile app to production and set up continuous integration.

## 🔧 Prerequisites

- [Expo CLI](https://docs.expo.dev/get-started/installation/) installed globally
- [EAS CLI](https://docs.expo.dev/build/setup/) for modern builds
- Apple Developer Account (for iOS deployment)
- Google Play Console Account (for Android deployment)
- Git repository (GitHub, GitLab, or Bitbucket)

## 🚀 Setting Up Git Repository

### 1. Create a New Repository

#### Option A: Using GitHub CLI
```bash
# Create repository on GitHub
gh repo create ecommerce-mobile-app --public --description "E-commerce mobile app built with Expo and TypeScript"

# Add remote origin
git remote add origin https://github.com/YOUR_USERNAME/ecommerce-mobile-app.git
```

#### Option B: Manually on GitHub
1. Go to [GitHub](https://github.com) and create a new repository
2. Name it `ecommerce-mobile-app`
3. Add a description: "E-commerce mobile app built with Expo and TypeScript"
4. Choose public or private
5. Don't initialize with README (we already have one)

### 2. Push Your Code

```bash
# Navigate to your mobile app directory
cd ecommerce-mobile-app

# Initialize git (if not already done)
git init

# Add all files
git add .

# Commit initial version
git commit -m "Initial commit: E-commerce mobile app with comprehensive features

Features included:
- Authentication (Email/Password, Google OAuth)
- Product catalog with search and filtering
- Shopping cart and checkout
- Order management
- Payment integration (Stripe)
- Real-time chat (TalkJS)
- Push notifications
- Modern UI with Material Design 3"

# Add remote origin (replace with your repository URL)
git remote add origin https://github.com/YOUR_USERNAME/ecommerce-mobile-app.git

# Push to main branch
git branch -M main
git push -u origin main
```

## 📱 Building the App

### Modern Approach: EAS Build (Recommended)

#### 1. Install EAS CLI
```bash
npm install -g @expo/eas-cli
```

#### 2. Login to Expo
```bash
eas login
```

#### 3. Configure EAS Build
```bash
eas build:configure
```

This creates `eas.json` configuration file:

```json
{
  "cli": {
    "version": ">= 3.0.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal"
    },
    "production": {
      "autoIncrement": true
    }
  },
  "submit": {
    "production": {}
  }
}
```

#### 4. Build for Production

```bash
# Build for iOS
eas build --platform ios --profile production

# Build for Android
eas build --platform android --profile production

# Build for both platforms
eas build --platform all --profile production
```

### Legacy Approach: Expo Build

```bash
# Build for iOS
expo build:ios

# Build for Android
expo build:android
```

## 🏪 App Store Deployment

### iOS App Store

#### 1. Prepare for Submission
- Ensure you have an Apple Developer Account
- Update `app.json` with correct bundle identifier
- Add app icons and splash screens
- Test thoroughly on various devices

#### 2. Submit using EAS Submit
```bash
eas submit --platform ios
```

#### 3. Manual Submission
1. Download the `.ipa` file from Expo
2. Upload to App Store Connect using Xcode or Application Loader
3. Fill out app information in App Store Connect
4. Submit for review

### Android Play Store

#### 1. Prepare for Submission
- Ensure you have a Google Play Console Account
- Update `app.json` with correct package name
- Generate signed APK or AAB

#### 2. Submit using EAS Submit
```bash
eas submit --platform android
```

#### 3. Manual Submission
1. Download the `.apk` or `.aab` file from Expo
2. Upload to Google Play Console
3. Fill out store listing information
4. Submit for review

## 🔄 Continuous Integration

### GitHub Actions (Recommended)

Create `.github/workflows/build.yml`:

```yaml
name: EAS Build
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  build:
    name: Install and build
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18.x
          cache: npm
      - name: Setup Expo and EAS
        uses: expo/expo-github-action@v8
        with:
          eas-version: latest
          token: ${{ secrets.EXPO_TOKEN }}
      - name: Install dependencies
        run: npm ci
      - name: Build on EAS
        run: eas build --platform all --non-interactive
```

### GitLab CI/CD

Create `.gitlab-ci.yml`:

```yaml
image: node:18

stages:
  - install
  - build
  - deploy

variables:
  NPM_CONFIG_CACHE: ".npm"

cache:
  paths:
    - .npm/

install_dependencies:
  stage: install
  script:
    - npm ci --cache .npm --prefer-offline
  artifacts:
    paths:
      - node_modules/

build_app:
  stage: build
  script:
    - npm install -g @expo/eas-cli
    - eas build --platform all --non-interactive
  only:
    - main
```

## 🔧 Environment Configuration

### Production Environment Variables

Create different environment files:

#### `.env.production`
```env
API_BASE_URL=https://your-production-api.com
STRIPE_PUBLISHABLE_KEY=pk_live_your_live_stripe_key
GOOGLE_IOS_CLIENT_ID=your-production-ios-client-id
GOOGLE_ANDROID_CLIENT_ID=your-production-android-client-id
TALKJS_APP_ID=your-production-talkjs-app-id
```

#### `.env.staging`
```env
API_BASE_URL=https://your-staging-api.com
STRIPE_PUBLISHABLE_KEY=pk_test_your_test_stripe_key
GOOGLE_IOS_CLIENT_ID=your-staging-ios-client-id
GOOGLE_ANDROID_CLIENT_ID=your-staging-android-client-id
TALKJS_APP_ID=your-staging-talkjs-app-id
```

### Multiple Build Profiles

Update `eas.json` for different environments:

```json
{
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "env": {
        "ENV": "development"
      }
    },
    "staging": {
      "distribution": "internal",
      "env": {
        "ENV": "staging"
      }
    },
    "production": {
      "env": {
        "ENV": "production"
      }
    }
  }
}
```

## 📊 Analytics and Monitoring

### Setup Crash Reporting

Install Sentry:
```bash
npx @sentry/wizard -i reactNative
```

### Performance Monitoring

Add to your app:
```typescript
import * as Sentry from '@sentry/react-native';

Sentry.init({
  dsn: 'YOUR_SENTRY_DSN',
});
```

## 🔄 Over-the-Air Updates

### Setup EAS Update

```bash
# Configure updates
eas update:configure

# Publish update
eas update --branch production --message "Bug fixes and improvements"
```

### Automatic Updates

Add to your `App.tsx`:
```typescript
import * as Updates from 'expo-updates';

useEffect(() => {
  async function checkForUpdates() {
    try {
      const update = await Updates.checkForUpdateAsync();
      if (update.isAvailable) {
        await Updates.fetchUpdateAsync();
        await Updates.reloadAsync();
      }
    } catch (error) {
      console.log('Error checking for updates:', error);
    }
  }
  
  checkForUpdates();
}, []);
```

## 🚀 Deployment Checklist

### Pre-deployment
- [ ] Test on multiple devices and screen sizes
- [ ] Verify all API endpoints work with production backend
- [ ] Update all environment variables
- [ ] Test payment flows with Stripe
- [ ] Verify push notifications work
- [ ] Test deep linking and navigation
- [ ] Run `npm run type-check` to ensure no TypeScript errors
- [ ] Test offline functionality
- [ ] Verify app icons and splash screens

### App Store Submission
- [ ] App store screenshots (multiple device sizes)
- [ ] App description and keywords
- [ ] Privacy policy URL
- [ ] Support URL
- [ ] Age rating
- [ ] App store categories
- [ ] Pricing and availability

### Post-deployment
- [ ] Monitor crash reports
- [ ] Track user analytics
- [ ] Monitor API performance
- [ ] Set up alerts for critical issues
- [ ] Plan for user feedback and reviews

## 🔧 Troubleshooting

### Common Build Issues

1. **Metro bundler cache issues**
   ```bash
   npx expo start --clear
   ```

2. **Dependencies conflicts**
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   npx expo install --fix
   ```

3. **iOS build issues**
   - Check bundle identifier is unique
   - Verify Apple Developer Account status
   - Check provisioning profiles

4. **Android build issues**
   - Verify package name is unique
   - Check Google Play Console access
   - Ensure all required permissions are listed

### Performance Optimization

1. **Bundle size optimization**
   ```bash
   npx expo-bundle-analyzer
   ```

2. **Image optimization**
   - Use WebP format for images
   - Implement lazy loading
   - Optimize image sizes

3. **Code splitting**
   - Use React.lazy for screens
   - Implement proper loading states

## 📞 Support

For deployment issues:
- Check [Expo Documentation](https://docs.expo.dev/)
- Visit [Expo Forums](https://forums.expo.dev/)
- Check [EAS Build Documentation](https://docs.expo.dev/build/introduction/)

---

## 🎉 Congratulations!

Your e-commerce mobile app is now ready for deployment! 

**Next Steps:**
1. Set up your Git repository
2. Configure production environment variables
3. Build and test your app
4. Submit to app stores
5. Monitor and iterate based on user feedback

Remember to keep your app updated with new features and security patches!