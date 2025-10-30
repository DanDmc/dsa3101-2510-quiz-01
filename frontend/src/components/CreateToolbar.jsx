// src/components/CreateToolbar.jsx (MODIFIED)

import React from 'react';
import { Box, TextField, Button, InputAdornment } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import PreviewIcon from '@mui/icons-material/Visibility';
import DownloadIcon from '@mui/icons-material/Download';

// Define constants for component sizing
const BUTTON_FIXED_WIDTH = '120px'; // Shared minimum width for all buttons
const SEARCH_BAR_WIDTH = '700px'; // Define a fixed width for the search bar
const BUTTON_GAP_SPACING = 3; 
const GREY_BOTTOM_LINE = '#B8B8B8';

// Define custom colors
const RED_CANCEL_COLOR = '#D50000'; // Pure red for the Cancel button border/text
const GREY_CANCEL_COLOR = '#9E9E9E'; // Grey for the Cancel button when not active

// The CreateToolbar component now accepts props for handlers and custom styling
function CreateToolbar({ onSave, onCancel, onDownload, saveText, saveDisabled, sx, isEditMode = false }) { 
    
    // ✅ NEW HANDLER: Handles the Publish/Update action
    const handlePublish = () => {
        if (onSave) {
            onSave(); 
        }
    };
    
    // ✅ NEW HANDLER: Conditional logic for the Cancel button
    const handleCancel = () => {
        if (isEditMode && !saveDisabled) {
            // If in Edit Mode AND there are unsaved changes (i.e., button is enabled)
            if (window.confirm("WARNING: You have unsaved changes. Are you sure you want to discard them and return to the home page?")) {
                onCancel();
            }
        } else {
            // In Create Mode, or if in Edit Mode but there are no unsaved changes
            onCancel();
        }
    };
    
  return (
    <Box 
      sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        mb: 2,
        ml: 6,
        ...sx 
      }}
    >
      {/* Search Bar (UNCHANGED) */}
      <TextField
        placeholder="Search..."
        variant="standard" 
        size="small"
        sx={{ width: SEARCH_BAR_WIDTH, mr: BUTTON_GAP_SPACING, backgroundColor: 'white' }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon />
            </InputAdornment>
          ),
          sx: {
            '&::before': {
              borderBottom: `2px solid ${GREY_BOTTOM_LINE}`,
            },
            '&::after': {
              borderBottom: `2px solid ${GREY_BOTTOM_LINE}`,
            },
            '&:hover:not(.Mui-disabled):before': {
              borderBottom: `2px solid ${GREY_BOTTOM_LINE}`,
            },
          }
        }}
      />
      
      {/* Buttons Group */}
      <Box sx={{ display: 'flex', alignItems: 'center' }}>
        {/* Download Button (UNCHANGED) */}
        <Button 
          variant="outlined" 
          startIcon={<DownloadIcon />} 
          onClick={onDownload} 
          sx={{ 
            mr: BUTTON_GAP_SPACING, 
            minWidth: BUTTON_FIXED_WIDTH, 
            borderColor: '#1F1F1F', 
            fontWeight: 'bold', 
            color: '#1F1F1F', 
            '&:hover': {
              borderColor: '#1F1F1F',
              backgroundColor: 'rgba(31, 31, 31, 0.04)',
            },
          }}
        >
          DOWNLOAD
        </Button>

        {/* Preview Button (UNCHANGED) */}
        <Button 
          variant="outlined" 
          startIcon={<PreviewIcon />} 
          sx={{ 
            mr: BUTTON_GAP_SPACING, 
            minWidth: BUTTON_FIXED_WIDTH, 
            borderColor: '#007bff', 
            color: '#007bff' 
          }}
        >
          PREVIEW
        </Button>
        
        {/* Cancel/Exit Button (Conditional Handler) */}
        {isEditMode && (
            <Button
                variant="outlined"
                onClick={handleCancel} // Use conditional handler
                sx={{ 
                    mr: BUTTON_GAP_SPACING, 
                    minWidth: BUTTON_FIXED_WIDTH, 
                    // ✅ FIX: Apply red styling for Cancel button
                    borderColor: RED_CANCEL_COLOR, 
                    color: RED_CANCEL_COLOR,
                    '&:hover': {
                        borderColor: RED_CANCEL_COLOR,
                        backgroundColor: 'rgba(213, 0, 0, 0.04)',
                    },
                }}
            >
                Cancel
            </Button>
        )}


        {/* Publish/Update Button */}
        <Button 
          variant="contained" 
          onClick={handlePublish} 
          disabled={saveDisabled} 
          sx={{ 
            minWidth: BUTTON_FIXED_WIDTH, 
            backgroundColor: '#ff9800', 
            fontWeight: 'bold', 
            '&:hover': { 
              backgroundColor: '#e68a00' 
            } 
          }}
        >
          {isEditMode ? "UPDATE" : (saveText || "PUBLISH")} {/* ✅ FIX: Concisely set text to "UPDATE" */}
        </Button>
      </Box>
    </Box>
  );
}

export default CreateToolbar;