/**
 * @file CreateToolbar component, used as the main action bar for Create and Edit views.
 * @module components/CreateToolbar
 * Renders a primary toolbar featuring a search bar and main action buttons (Download, 
 * Preview, Cancel, and Save/Publish/Update).
 *
 * It implements conditional rendering for the Cancel button and includes a warning 
 * confirmation prompt if the user tries to cancel while unsaved changes exist in Edit Mode.
 *
 * @param {object} props The component props.
 * @param {function(): void} props.onSave - Handler function executed when the Save/Update button is clicked.
 * @param {function(): void} props.onCancel - Handler function executed when the Cancel button is clicked. Includes conditional confirmation logic.
 * @param {function(): void} props.onDownload - Handler function executed when the Download button is clicked.
 * @param {string} [props.saveText="PUBLISH"] - The text to display on the main action button in Create Mode (ignored if isEditMode is true).
 * @param {boolean} props.saveDisabled - Flag to disable the main action button (Save/Update).
 * @param {object} [props.sx] - Custom styling overrides applied to the main container Box component (MUI sx prop).
 * @param {boolean} [props.isEditMode=false] - If true, the component displays the 'Cancel' button, 
 * the main button text changes to 'UPDATE', and confirmation logic is enabled for cancellation.
 * @returns {JSX.Element} A Material-UI Box containing the search field and action buttons.
 */

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
    
    // HANDLER: Handles the Publish/Update action
    const handlePublish = () => {
        if (onSave) {
            onSave(); 
        }
    };
    
    // HANDLER: Conditional logic for the Cancel button
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
                    // FIX: Apply red styling for Cancel button
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
          {isEditMode ? "UPDATE" : (saveText || "PUBLISH")} {/* FIX: Concisely set text to "UPDATE" */}
        </Button>
      </Box>
    </Box>
  );
}

export default CreateToolbar;