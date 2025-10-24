import React, { useState } from 'react';
import { Box, Button, TextField, InputAdornment, IconButton } from '@mui/material';
import CreateIcon from '@mui/icons-material/Create';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import SearchIcon from '@mui/icons-material/Search';
import ViewListIcon from '@mui/icons-material/ViewList'; // For the orange button

// 👈 ACCEPT navigation handlers and selected IDs as props
function QuestionToolbar({ numSelected, selectedIds, goToCreatePage, goToEditPage, goToSearchPage, handleDeleteClick }) { 
  const [query, setQuery] = useState("");
  // Handlers for button clicks
  const handleCreateClick = () => {
    goToCreatePage(); // Call the function passed from main.jsx
  };

  const handleEditClick = () => {
    // Pass the currently selected question IDs to the edit function
    goToEditPage(selectedIds); 
  };

  const handleSearchOrBrowse = (e) => {
    e?.preventDefault();
    goToSearchPage?.(query.trim());
  };

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', mb: 3}}>
      {/* Left side: Action Buttons */}
      <Box sx={{ display: 'flex', gap: 3 }}>
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
          onClick={handleDeleteClick} // <-- THIS IS THE FIX
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

      {/* Right side search & browse */}
      <Box sx={{ display: 'flex', alignItems: 'center', marginLeft: 'auto' }}>
        {/* Pressing Enter or clicking search triggers navigation */}
        <form onSubmit={handleSearchOrBrowse}>
          <TextField
            sx={{ width: 400 }}
            variant="outlined"
            size="small"
            placeholder="Search for..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <IconButton type="submit" aria-label="search">
                    <SearchIcon />
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
        </form>

        {/* Orange Browse button also triggers same navigation */}
        <IconButton
          onClick={handleSearchOrBrowse}
          sx={{
            backgroundColor: '#f57c00',
            color: 'white',
            borderRadius: '8px',
            '&:hover': { backgroundColor: '#e65100' },
            ml: 2,
          }}
          title="Browse / Search"
        >
          <ViewListIcon />
        </IconButton>
      </Box>
    </Box>
  );
}

export default QuestionToolbar;

