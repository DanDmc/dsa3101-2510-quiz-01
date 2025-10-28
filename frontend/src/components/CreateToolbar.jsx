// src/components/CreateToolbar.jsx

import React from 'react';
import { Box, TextField, Button, InputAdornment } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import PreviewIcon from '@mui/icons-material/Visibility';
// 🌟 NEW: Import the Download Icon
import DownloadIcon from '@mui/icons-material/Download';

// Define constants for component sizing
const BUTTON_FIXED_WIDTH = '120px'; // Shared minimum width for all buttons
const SEARCH_BAR_WIDTH = '700px'; // Define a fixed width for the search bar

// 🌟 NEW: Define a constant for the spacing between buttons
const BUTTON_GAP_SPACING = 3; // Using Material-UI spacing unit (e.g., 3 = 24px by default)

// Define the custom grey color
const GREY_BOTTOM_LINE = '#B8B8B8';

// The CreateToolbar component now accepts props for handlers and custom styling
function CreateToolbar({ onSave, onCancel, onDownload, sx }) { 
  return (
    <Box 
      sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        mb: 2,
        ml: 6,
        ...sx // Allows external styling like margin-bottom from EditPage.jsx
      }}
    >
      {/* Search Bar */}
      <TextField
        placeholder="Search..."
        // 🌟 MODIFIED: Change variant from "outlined" to "standard"
        variant="standard" 
        size="small"
        // 🌟 MODIFIED: Use the new spacing constant for the right margin (gap after search bar)
        sx={{ width: SEARCH_BAR_WIDTH, mr: BUTTON_GAP_SPACING, backgroundColor: 'white' }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon />
            </InputAdornment>
          ),
          // 🌟 STYLING: Apply custom color to the bottom border
          sx: {
            // Target the default bottom line (`.MuiInput-root:before`)
            '&::before': {
              borderBottom: `2px solid ${GREY_BOTTOM_LINE}`,
            },
            // Target the bottom line when focused (`.MuiInput-root:after`)
            '&::after': {
              borderBottom: `2px solid ${GREY_BOTTOM_LINE}`,
            },
            // Ensure no hover effect changes the color unexpectedly (optional but safer)
            '&:hover:not(.Mui-disabled):before': {
              borderBottom: `2px solid ${GREY_BOTTOM_LINE}`,
            },
          }
        }}
      />
      
      {/* Buttons Group */}
      <Box sx={{ display: 'flex', alignItems: 'center' }}>
        {/* Download Button */}
        <Button 
          variant="outlined" 
          startIcon={<DownloadIcon />} 
          onClick={onDownload} // Placeholder handler
          sx={{ 
            // Use the new spacing constant for the gap
            mr: BUTTON_GAP_SPACING, 
            minWidth: BUTTON_FIXED_WIDTH, // Key change for equal width
            borderColor: '#1F1F1F', // Black border
            fontWeight: 'bold', 
            color: '#1F1F1F', // Black text/icon
            '&:hover': {
              borderColor: '#1F1F1F',
              backgroundColor: 'rgba(31, 31, 31, 0.04)',
            },
          }}
        >
          DOWNLOAD
        </Button>

        {/* Preview Button */}
        <Button 
          variant="outlined" 
          startIcon={<PreviewIcon />} 
          sx={{ 
            // Use the new spacing constant for the gap
            mr: BUTTON_GAP_SPACING, 
            minWidth: BUTTON_FIXED_WIDTH, // Key change for equal width
            borderColor: '#007bff', 
            color: '#007bff' 
          }}
        >
          PREVIEW
        </Button>

        {/* Publish Button */}
        <Button 
          variant="contained" 
          onClick={onSave} // Using onSave as the publish handler
          sx={{ 
            minWidth: BUTTON_FIXED_WIDTH, // Key change for equal width
            backgroundColor: '#ff9800', 
            // 🌟 NEW: Added fontWeight to bold the text
            fontWeight: 'bold', 
            '&:hover': { 
              backgroundColor: '#e68a00' 
            } 
          }}
        >
          PUBLISH
        </Button>
      </Box>
    </Box>
  );
}

export default CreateToolbar;