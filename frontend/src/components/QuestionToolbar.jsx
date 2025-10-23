// src/components/QuestionToolbar.jsx

import React from 'react';
import { Box, Button, TextField, InputAdornment, IconButton } from '@mui/material';
import CreateIcon from '@mui/icons-material/Create';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import SearchIcon from '@mui/icons-material/Search';
import ViewListIcon from '@mui/icons-material/ViewList'; // For the orange button

// 👈 ACCEPT navigation handlers and selected IDs as props
function QuestionToolbar({ numSelected, selectedIds, goToCreatePage, goToEditPage }) { 
  
  // Handlers for button clicks
  const handleCreateClick = () => {
    goToCreatePage(); // Call the function passed from main.jsx
  };

  const handleEditClick = () => {
    // Pass the currently selected question IDs to the edit function
    goToEditPage(selectedIds); 
  };
  
  return (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
      {/* Left side: Action Buttons */}
      <Box sx={{ display: 'flex', gap: 1 }}>
        <Button 
          variant="contained" 
          startIcon={<CreateIcon />}
          sx={{ backgroundColor: '#4caf50', '&:hover': { backgroundColor: '#388e3c' } }}
          onClick={handleCreateClick} // 👈 ATTACH HANDLER
        >
          Create
        </Button>
        <Button 
          variant="outlined" 
          startIcon={<DeleteIcon />} 
          color="error"
          disabled={numSelected === 0}
        >
          Delete
        </Button>
        <Button 
          variant="outlined" 
          startIcon={<EditIcon />} 
          color="primary"
          disabled={numSelected === 0}
          onClick={handleEditClick} // 👈 ATTACH HANDLER
        >
          Edit
        </Button>
      </Box>

      {/* Right side: Search and View (Kept the same) */}
      <Box sx={{ display: 'flex', gap: 1 }}>
        <TextField
          variant="outlined"
          size="small"
          placeholder="Search for..."
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
        />
        <IconButton sx={{ backgroundColor: '#f57c00', color: 'white', borderRadius: '8px', '&:hover': { backgroundColor: '#e65100' }}}>
          <ViewListIcon />
        </IconButton>
      </Box>
    </Box>
  );
}

export default QuestionToolbar;