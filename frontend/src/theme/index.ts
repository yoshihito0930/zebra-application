import { extendTheme, type ThemeConfig } from '@chakra-ui/react';

// テーマ設定
const config: ThemeConfig = {
  initialColorMode: 'light',
  useSystemColorMode: false,
};

// カスタムテーマ
const theme = extendTheme({
  config,
  colors: {
    // ブランドカラー（Primary）
    brand: {
      50: '#E8F5F0',
      100: '#C2E6D9',
      200: '#9DD6C2',
      300: '#82C2A9', // メインカラー
      400: '#6BB599',
      500: '#55A889',
      600: '#469179',
      700: '#387A69',
      800: '#2A5A51',
      900: '#1C3D39',
    },
    // 強調色（Accent）
    accent: {
      50: '#FFE8E7',
      100: '#FFC2BF',
      200: '#FF9B97',
      300: '#FF746E',
      400: '#FF463C', // 強調色
      500: '#E63D33',
      600: '#CC352B',
      700: '#B32D24',
      800: '#99251C',
      900: '#801D15',
    },
  },
  fonts: {
    heading: `'Inter', 'Noto Sans JP', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Hiragino Kaku Gothic ProN', 'Hiragino Sans', sans-serif`,
    body: `'Inter', 'Noto Sans JP', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Hiragino Kaku Gothic ProN', 'Hiragino Sans', sans-serif`,
  },
  fontSizes: {
    xs: '0.75rem',   // 12px
    sm: '0.875rem',  // 14px
    md: '1rem',      // 16px
    lg: '1.125rem',  // 18px
    xl: '1.25rem',   // 20px
    '2xl': '1.5rem', // 24px
    '3xl': '2rem',   // 32px
  },
  fontWeights: {
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },
  lineHeights: {
    normal: 'normal',
    none: 1,
    shorter: 1.2,
    short: 1.3,
    base: 1.4,
    tall: 1.5,
  },
  space: {
    px: '1px',
    0.5: '0.125rem', // 2px
    1: '0.25rem',    // 4px
    2: '0.5rem',     // 8px
    3: '0.75rem',    // 12px
    4: '1rem',       // 16px
    5: '1.25rem',    // 20px
    6: '1.5rem',     // 24px
    8: '2rem',       // 32px
    10: '2.5rem',    // 40px
    12: '3rem',      // 48px
    16: '4rem',      // 64px
    20: '5rem',      // 80px
  },
  radii: {
    none: '0',
    sm: '0.25rem',   // 4px
    base: '0.5rem',  // 8px
    md: '0.5rem',    // 8px
    lg: '0.75rem',   // 12px
    xl: '1rem',      // 16px
    '2xl': '1.5rem', // 24px
    '3xl': '2rem',   // 32px
    full: '9999px',
  },
  shadows: {
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    base: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
  },
  components: {
    Button: {
      baseStyle: {
        fontWeight: 'semibold',
        borderRadius: 'md',
      },
      sizes: {
        sm: {
          height: '36px',
          fontSize: 'sm',
          px: 4,
        },
        md: {
          height: '40px',
          fontSize: 'sm',
          px: 6,
        },
        lg: {
          height: '44px',
          fontSize: 'md',
          px: 8,
        },
      },
      variants: {
        solid: (props: { colorScheme: string }) => ({
          bg: props.colorScheme === 'brand' ? 'brand.300' : undefined,
          color: 'white',
          _hover: {
            bg: props.colorScheme === 'brand' ? 'brand.400' : undefined,
            _disabled: {
              bg: props.colorScheme === 'brand' ? 'brand.300' : undefined,
            },
          },
          _active: {
            bg: props.colorScheme === 'brand' ? 'brand.500' : undefined,
          },
        }),
        accent: {
          bg: 'accent.400',
          color: 'white',
          _hover: {
            bg: 'accent.500',
            _disabled: {
              bg: 'accent.400',
            },
          },
          _active: {
            bg: 'accent.600',
          },
        },
        outline: (props: { colorScheme: string }) => ({
          borderColor: props.colorScheme === 'brand' ? 'brand.300' : undefined,
          color: props.colorScheme === 'brand' ? 'brand.600' : undefined,
          _hover: {
            bg: props.colorScheme === 'brand' ? 'brand.50' : undefined,
          },
        }),
        ghost: (props: { colorScheme: string }) => ({
          color: props.colorScheme === 'brand' ? 'brand.600' : undefined,
          _hover: {
            bg: props.colorScheme === 'brand' ? 'brand.50' : undefined,
          },
        }),
      },
      defaultProps: {
        colorScheme: 'brand',
        size: 'md',
      },
    },
    Input: {
      baseStyle: {
        field: {
          borderRadius: 'md',
        },
      },
      sizes: {
        md: {
          field: {
            height: '40px',
            px: 4,
          },
        },
      },
      variants: {
        outline: {
          field: {
            borderColor: 'gray.300',
            _hover: {
              borderColor: 'gray.400',
            },
            _focus: {
              borderColor: 'brand.300',
              boxShadow: '0 0 0 1px var(--chakra-colors-brand-300)',
            },
            _invalid: {
              borderColor: 'red.500',
              boxShadow: '0 0 0 1px var(--chakra-colors-red-500)',
            },
          },
        },
      },
      defaultProps: {
        variant: 'outline',
        size: 'md',
      },
    },
    Select: {
      baseStyle: {
        field: {
          borderRadius: 'md',
        },
      },
      sizes: {
        md: {
          field: {
            height: '40px',
            px: 4,
          },
        },
      },
      variants: {
        outline: {
          field: {
            borderColor: 'gray.300',
            _hover: {
              borderColor: 'gray.400',
            },
            _focus: {
              borderColor: 'brand.300',
              boxShadow: '0 0 0 1px var(--chakra-colors-brand-300)',
            },
          },
        },
      },
      defaultProps: {
        variant: 'outline',
        size: 'md',
      },
    },
    Checkbox: {
      baseStyle: {
        control: {
          borderRadius: 'sm',
          _checked: {
            bg: 'brand.300',
            borderColor: 'brand.300',
            _hover: {
              bg: 'brand.400',
              borderColor: 'brand.400',
            },
          },
        },
      },
    },
    Radio: {
      baseStyle: {
        control: {
          _checked: {
            bg: 'brand.300',
            borderColor: 'brand.300',
            _hover: {
              bg: 'brand.400',
              borderColor: 'brand.400',
            },
          },
        },
      },
    },
    Card: {
      baseStyle: {
        container: {
          borderRadius: 'lg',
          boxShadow: 'sm',
          _hover: {
            boxShadow: 'md',
          },
        },
      },
    },
    Modal: {
      baseStyle: {
        dialog: {
          borderRadius: 'lg',
        },
      },
    },
    Badge: {
      baseStyle: {
        borderRadius: 'full',
        fontWeight: 'semibold',
        fontSize: 'xs',
        px: 3,
        py: 1,
      },
      variants: {
        confirmed: {
          bg: 'green.500',
          color: 'white',
        },
        tentative: {
          bg: 'orange.500',
          color: 'white',
        },
        pending: {
          bg: 'brand.300',
          color: 'white',
        },
        waitlisted: {
          bg: 'purple.500',
          color: 'white',
        },
        scheduled: {
          bg: 'blue.500',
          color: 'white',
        },
        cancelled: {
          bg: 'red.500',
          color: 'white',
        },
        expired: {
          bg: 'gray.400',
          color: 'white',
        },
        completed: {
          bg: 'gray.500',
          color: 'white',
        },
      },
    },
  },
  breakpoints: {
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
    '2xl': '1536px',
  },
});

export default theme;
