import { DefaultTheme as PaperDefaultTheme, MD3LightTheme, MD3DarkTheme } from 'react-native-paper';
import { COLORS, FONTS, SIZES } from './index';

// Custom theme extending React Native Paper theme
export const lightTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: COLORS.primary,
    primaryContainer: COLORS.primary + '20',
    secondary: COLORS.secondary,
    secondaryContainer: COLORS.secondary + '20',
    tertiary: COLORS.accent,
    surface: COLORS.background,
    surfaceVariant: COLORS.backgroundSecondary,
    background: COLORS.background,
    error: COLORS.error,
    onPrimary: COLORS.white,
    onSecondary: COLORS.white,
    onSurface: COLORS.textPrimary,
    onBackground: COLORS.textPrimary,
    outline: COLORS.border,
    success: COLORS.success,
    warning: COLORS.warning,
  },
  fonts: {
    ...MD3LightTheme.fonts,
    default: {
      fontFamily: FONTS.regular,
    },
    medium: {
      fontFamily: FONTS.medium,
    },
    bold: {
      fontFamily: FONTS.bold,
    },
  },
};

export const darkTheme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: COLORS.primary,
    primaryContainer: COLORS.primary + '30',
    secondary: COLORS.secondary,
    secondaryContainer: COLORS.secondary + '30',
    tertiary: COLORS.accent,
    surface: COLORS.backgroundDark,
    surfaceVariant: COLORS.gray800,
    background: COLORS.backgroundDark,
    error: COLORS.error,
    onPrimary: COLORS.white,
    onSecondary: COLORS.white,
    onSurface: COLORS.textWhite,
    onBackground: COLORS.textWhite,
    outline: COLORS.gray600,
    success: COLORS.success,
    warning: COLORS.warning,
  },
  fonts: {
    ...MD3DarkTheme.fonts,
    default: {
      fontFamily: FONTS.regular,
    },
    medium: {
      fontFamily: FONTS.medium,
    },
    bold: {
      fontFamily: FONTS.bold,
    },
  },
};

export const theme = lightTheme; // Default to light theme

// Custom styling utilities
export const spacing = {
  xs: SIZES.xs,
  sm: SIZES.sm,
  md: SIZES.md,
  lg: SIZES.lg,
  xl: SIZES.xl,
  xxl: SIZES.xxl,
};

export const typography = {
  caption: {
    fontSize: SIZES.caption,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
  },
  body: {
    fontSize: SIZES.body,
    fontFamily: FONTS.regular,
    color: COLORS.textPrimary,
  },
  title: {
    fontSize: SIZES.title,
    fontFamily: FONTS.medium,
    color: COLORS.textPrimary,
  },
  header: {
    fontSize: SIZES.header,
    fontFamily: FONTS.bold,
    color: COLORS.textPrimary,
  },
  large: {
    fontSize: SIZES.large,
    fontFamily: FONTS.bold,
    color: COLORS.textPrimary,
  },
  xlarge: {
    fontSize: SIZES.xlarge,
    fontFamily: FONTS.bold,
    color: COLORS.textPrimary,
  },
};

export const shadows = {
  small: {
    shadowColor: COLORS.black,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  medium: {
    shadowColor: COLORS.black,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 6.27,
    elevation: 10,
  },
  large: {
    shadowColor: COLORS.black,
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.2,
    shadowRadius: 10.32,
    elevation: 15,
  },
};

export const borderRadius = {
  small: SIZES.radius,
  medium: SIZES.radiusLarge,
  large: SIZES.radiusRound,
};