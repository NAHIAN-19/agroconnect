import { createTheme } from '@mui/material/styles';

export const theme = createTheme({
  palette: {
    primary: {
      main: '#10B981', // Emerald Green
    },
    secondary: {
      main: '#F59E0B', // Amber Yellow
    },
    background: {
      default: '#F3F4F6', // Light Gray
      paper: '#FFFFFF',   // White
    },
    text: {
      primary: '#1F2937', // Dark Gray
    },
  },
  typography: {
    fontFamily: 'Inter, sans-serif',
    h1: {
      fontWeight: 700,
    },
    h2: {
      fontWeight: 700,
    },
    button: {
      textTransform: 'none',
      fontWeight: 600,
    }
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
        }
      }
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 12,
        }
      }
    }
  }
});
