// src/components/QuestionToolbar.jsx

import React from 'react';
import { Box, Button, TextField, InputAdornment, IconButton } from '@mui/material';
import CreateIcon from '@mui/icons-material/Create';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import SearchIcon from '@mui/icons-material/Search';
import ViewListIcon from '@mui/icons-material/ViewList';

const LARGE_BUTTON_SX = {
  py: 1.2,
  px: 2.5,
  fontSize: '0.9rem',
  fontWeight: 'bold',
};

function QuestionToolbar({ numSelected, selectedIds, goToCreatePage, goToEditPage }) {

  const handleCreateClick = () => goToCreatePage();
  const handleEditClick = () => goToEditPage(selectedIds);

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
            ...LARGE_BUTTON_SX,
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
          sx={LARGE_BUTTON_SX}
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

      {/* Right side: now flex-expands */}
      <Box sx={{ display: 'flex', alignItems: 'center', flex: 1, ml: 3 }}>
        <TextField
          sx={{ width: '100%' }}   // <-- FULL WIDTH STRETCH
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
        <IconButton
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
