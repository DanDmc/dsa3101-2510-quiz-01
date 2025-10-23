// src/components/CreateToolbar.jsx

import React from 'react';
import { Box, TextField, Button, InputAdornment } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import PreviewIcon from '@mui/icons-material/Visibility';

function CreateToolbar() {
  return (
    <Box 
      sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        mb: 2,
        ml: 8,
        // The background in the screenshot is slightly off-white, matching the surrounding page
      }}
    >
      {/* Search Bar */}
      <TextField
        placeholder="Search..."
        variant="outlined"
        size="small"
        sx={{ flexGrow: 1, mr: 2, backgroundColor: 'white' }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon />
            </InputAdornment>
          ),
        }}
      />
      
      {/* Buttons */}
      <Button 
        variant="outlined" 
        startIcon={<PreviewIcon />} 
        sx={{ mr: 1, borderColor: '#007bff', color: '#007bff' }}
      >
        PREVIEW
      </Button>
      <Button 
        variant="contained" 
        sx={{ backgroundColor: '#ff9800', '&:hover': { backgroundColor: '#e68a00' } }}
      >
        PUBLISH
      </Button>
    </Box>
  );
}

export default CreateToolbar;