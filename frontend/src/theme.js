import { extendTheme } from '@chakra-ui/react';

// VaultBank Banking Clone Theme
const theme = extendTheme({
  config: {
    initialColorMode: 'light',
    useSystemColorMode: false,
  },
  breakpoints: {
    base: '0px',
    sm: '320px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
    '2xl': '1536px',
  },
  colors: {
    vaultbank: {
      50: '#E6F0F9',
      100: '#C5DDF0',
      200: '#A3C9E8',
      300: '#82B5E0',
      400: '#60A1D8',
      500: '#00539F', // VaultBank Blue primary
      600: '#004687',
      700: '#003B6E',
      800: '#002F55',
      900: '#00233C',
    },
  },
  fonts: {
    heading: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    body: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    mono: '"SF Mono", "Monaco", "Inconsolata", monospace',
  },
  fontSizes: {
    xs: '0.75rem',
    sm: '0.875rem',
    md: '1rem',
    lg: '1.125rem',
    xl: '1.25rem',
    '2xl': '1.5rem',
    '3xl': '1.875rem',
    '4xl': '2.25rem',
  },
  styles: {
    global: {
      'html, body': {
        bg: 'gray.50',
        color: 'gray.800',
      },
    },
  },
  components: {
    Button: {
      defaultProps: {
        colorScheme: 'blue',
      },
      baseStyle: {
        fontWeight: '600',
        transition: 'all 0.2s ease-in-out',
        _hover: {
          transform: 'translateY(-1px)',
        },
        _active: {
          transform: 'translateY(0)',
        },
      },
      variants: {
        primary: {
          bg: 'vaultbank.500',
          color: 'white',
          _hover: {
            bg: 'vaultbank.600',
          },
        },
        secondary: {
          bg: 'white',
          color: 'vaultbank.500',
          border: '2px solid',
          borderColor: 'vaultbank.500',
          _hover: {
            bg: 'vaultbank.50',
          },
        },
        solid: {
          bg: 'vaultbank.500',
          color: 'white',
          _hover: {
            bg: 'vaultbank.600',
            transform: 'translateY(-1px)',
          },
          _active: {
            bg: 'vaultbank.700',
            transform: 'translateY(0)',
          },
        },
        outline: {
          border: '2px solid',
          borderColor: 'vaultbank.500',
          color: 'vaultbank.500',
          bg: 'transparent',
          _hover: {
            bg: 'vaultbank.50',
            transform: 'translateY(-1px)',
          },
        },
        ghost: {
          bg: 'transparent',
          color: 'vaultbank.600',
          _hover: {
            bg: 'vaultbank.50',
          },
        },
      },
    },
    Card: {
      baseStyle: {
        container: {
          bg: 'white',
          boxShadow: 'md',
          borderRadius: 'lg',
          p: 6,
          transition: 'all 0.2s ease-in-out',
          _hover: {
            boxShadow: 'lg',
          },
        },
      },
    },
    Input: {
      baseStyle: {
        field: {
          border: '1px solid',
          borderColor: 'gray.300',
          _focus: {
            borderColor: 'vaultbank.500',
            boxShadow: '0 0 0 3px rgba(0, 83, 159, 0.15)',
          },
          _hover: {
            borderColor: 'gray.400',
          },
        },
      },
    },
    Select: {
      baseStyle: {
        field: {
          border: '1px solid',
          borderColor: 'gray.300',
          _focus: {
            borderColor: 'vaultbank.500',
            boxShadow: '0 0 0 3px rgba(0, 83, 159, 0.15)',
          },
          _hover: {
            borderColor: 'gray.400',
          },
        },
      },
    },
    NumberInput: {
      baseStyle: {
        field: {
          border: '1px solid',
          borderColor: 'gray.300',
          _focus: {
            borderColor: 'vaultbank.500',
            boxShadow: '0 0 0 3px rgba(0, 83, 159, 0.15)',
          },
          _hover: {
            borderColor: 'gray.400',
          },
        },
      },
    },
    Textarea: {
      baseStyle: {
        border: '1px solid',
        borderColor: 'gray.300',
        _focus: {
          borderColor: 'vaultbank.500',
          boxShadow: '0 0 0 3px rgba(0, 83, 159, 0.15)',
        },
        _hover: {
          borderColor: 'gray.400',
        },
      },
    },
    Modal: {
      baseStyle: {
        dialog: {
          bg: 'white',
          borderRadius: 'lg',
          boxShadow: 'xl',
        },
      },
      variants: {
        vaultbank: {
          dialog: {
            bg: 'white',
            borderRadius: 'lg',
            boxShadow: '2xl',
          },
        },
      },
    },
    ModalOverlay: {
      baseStyle: {
        bg: 'blackAlpha.600',
        backdropFilter: 'blur(4px)',
      },
    },
    Toast: {
      baseStyle: {
        container: {
          borderRadius: 'md',
          boxShadow: 'lg',
          padding: 4,
        },
      },
      variants: {
        success: {
          container: {
            bg: 'green.500',
            color: 'white',
          },
          title: {
            color: 'white',
            fontWeight: '600',
          },
          description: {
            color: 'white',
          },
          icon: {
            color: 'white',
          },
        },
        error: {
          container: {
            bg: 'red.500',
            color: 'white',
          },
          title: {
            color: 'white',
            fontWeight: '600',
          },
          description: {
            color: 'white',
          },
          icon: {
            color: 'white',
          },
        },
        info: {
          container: {
            bg: 'vaultbank.500',
            color: 'white',
          },
          title: {
            color: 'white',
            fontWeight: '600',
          },
          description: {
            color: 'white',
          },
          icon: {
            color: 'white',
          },
        },
        warning: {
          container: {
            bg: 'orange.500',
            color: 'white',
          },
          title: {
            color: 'white',
            fontWeight: '600',
          },
          description: {
            color: 'white',
          },
          icon: {
            color: 'white',
          },
        },
      },
    },
  },
});

export default theme;
