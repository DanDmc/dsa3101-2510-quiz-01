import React, { useState } from 'react';
import { Box, Button, TextField, InputAdornment, IconButton } from '@mui/material';
import CreateIcon from '@mui/icons-material/Create';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import SearchIcon from '@mui/icons-material/Search';
import ViewListIcon from '@mui/icons-material/ViewList';

// --- RESOLUTION FOR BLOCK 1 (Props and Logic) ---

// KEEP: Your local style constant
const LARGE_BUTTON_SX = {
  py: 1.2,
  px: 2.5,
  fontSize: '0.9rem',
  fontWeight: 'bold',
};

// ADOPT: The new, complete prop signature from origin/main
function QuestionToolbar({ numSelected, goToCreatePage, goToEditPage, goToSearchPage, handleDeleteClick }) { 
  // NOTE: We can drop 'selectedIds' as a prop here since 'handleEditClick' will now be passed 
  // down from HomePage as a complete function (handleEditClick) that already handles filtering.

  // ADOPT: State for the search query
  const [query, setQuery] = useState("");
  
  // UNIFIED: Handlers for button clicks
  const handleCreateClick = () => {
    goToCreatePage();
  };

  // NOTE: The actual edit logic (filtering by ID) is now in HomePage.jsx (handleEditClick).
  // Here, we simply call the prop function, which is now expected to be the handler.
  // Since the HomePage props are goToEditPage={handleEditClick} and that handler 
  // *already* does the filtering, we simplify this local handler.
  const handleEditClick = () => {
    goToEditPage(); // Call the prop which is the handler from HomePage
  };

  // ADOPT: New Search handler
  const handleSearchOrBrowse = (e) => {
    e?.preventDefault();
    goToSearchPage?.(query.trim());
  };


  return (
    <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>

      {/* Left Buttons */}
      <Box sx={{ display: 'flex', gap: 0.5 }}>
        <Button
          variant="contained"
          startIcon={<CreateIcon />}
          sx={{
            backgroundColor: '#4caf50',
            '&:hover': { backgroundColor: '#388e3c' },
            ...LARGE_BUTTON_SX, // KEPT your style
          }}
          onClick={handleCreateClick}
        >
          Create / Upload
        </Button>

        <Button
          variant="outlined"
          startIcon={<DeleteIcon />}
          color="error"
          disabled={numSelected === 0}
          
// --- RESOLUTION FOR BLOCK 2 (Delete Button) ---
          onClick={handleDeleteClick} // ADOPTED: New handler prop from origin/main
          sx={LARGE_BUTTON_SX} // KEPT: Your style 
// NOTE: We MUST keep both onClick and sx={LARGE_BUTTON_SX} here.
        >
          Delete
        </Button>

        <Button
          variant="outlined"
          startIcon={<EditIcon />}
          color="primary"
          disabled={numSelected === 0}
          onClick={handleEditClick}
          sx={LARGE_BUTTON_SX}
        >
          Edit
        </Button>
      </Box>

      {/* --- RESOLUTION FOR BLOCK 3 (Search Bar UI and Functionality) --- */}
      {/* KEPT: Your search bar structure (flex-expands) but ADOPTED the new search logic (form, query state) */}
      <Box sx={{ display: 'flex', alignItems: 'center', flex: 1, ml: 3 }}>
        {/* ADOPTED: Form wrapper and new TextField props (value, onChange) */}
        <form onSubmit={handleSearchOrBrowse} style={{ width: '100%' }}>
          <TextField
            sx={{ width: '100%' }} // KEPT: Your full-width stretch style
            variant="outlined"
            size="small"
            placeholder="Search for..."
            value={query} // ADOPTED: Bind state
            onChange={(e) => setQuery(e.target.value)} // ADOPTED: Update state
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  {/* ADOPTED: Search icon button now has type="submit" */}
                  <IconButton type="submit" aria-label="search">
                    <SearchIcon />
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
        </form>
        {/* ADOPTED: Browse button uses the new handleSearchOrBrowse handler */}
        <IconButton
          onClick={handleSearchOrBrowse}
          title="Browse / Search" // ADOPTED: Title for clarity
          sx={{
            backgroundColor: '#f57c00',
            color: 'white',
            borderRadius: '8px',
            '&:hover': { backgroundColor: '#e65100' },
            ml: 2,
          }}
        >
          <ViewListIcon />
        </IconButton>
      </Box>

    </Box>
  );
}

export default QuestionToolbar;