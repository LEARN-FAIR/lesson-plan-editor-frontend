import {createTheme} from '@mui/material/styles';

// Define the main color as requested by the user
const mainColor = 'rgb(12, 52, 80)';

// Create a theme instance
const theme = createTheme({
    palette: {
        primary: {
            main: mainColor,
            // Automatically generate light and dark variants
            light: 'rgba(12, 52, 80, 0.8)',
            dark: 'rgba(8, 36, 56, 1)',
            contrastText: '#fff',
        },
        secondary: {
            main: '#19857b',
            light: '#4ebaaa',
            dark: '#00574b',
            contrastText: '#fff',
        },
        background: {
            default: '#f5f5f5',
            paper: '#fff',
        },
    },
    typography: {
        fontFamily: [
            '-apple-system',
            'BlinkMacSystemFont',
            '"Segoe UI"',
            'Roboto',
            '"Helvetica Neue"',
            'Arial',
            'sans-serif',
            '"Apple Color Emoji"',
            '"Segoe UI Emoji"',
            '"Segoe UI Symbol"',
        ].join(','),
        h1: {
            fontSize: '2.5rem',
            fontWeight: 500,
            color: mainColor,
        },
        h2: {
            fontSize: '2rem',
            fontWeight: 500,
            color: mainColor,
        },
        h3: {
            fontSize: '1.75rem',
            fontWeight: 500,
            color: mainColor,
        },
        h4: {
            fontSize: '1.5rem',
            fontWeight: 500,
            color: mainColor,
        },
        h5: {
            fontSize: '1.25rem',
            fontWeight: 500,
            color: mainColor,
        },
        h6: {
            fontSize: '1rem',
            fontWeight: 500,
            color: mainColor,
        },
    },
    components: {
        MuiAppBar: {
            styleOverrides: {
                root: {
                    backgroundColor: mainColor,
                },
            },
        },
        MuiButton: {
            styleOverrides: {
                root: {
                    textTransform: 'none',
                    borderRadius: 4,
                },
                containedPrimary: {
                    backgroundColor: mainColor,
                    '&:hover': {
                        backgroundColor: 'rgba(8, 36, 56, 1)',
                    },
                },
            },
        },
    },
});

export default theme;
