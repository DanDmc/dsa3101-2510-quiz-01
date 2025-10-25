import React, { useState } from 'react';
import { 
    Box, Button, TextField, InputAdornment, IconButton, 
    Switch, FormControlLabel, Typography 
} from '@mui/material';
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

// 🌟 ISSUE 1 FIX: ADOPT the new prop signature for the toggle
function QuestionToolbar({ 
    numSelected, 
    goToCreatePage, 
    goToEditPage, 
    goToSearchPage, 
    handleDeleteClick,
    isSafeDeletionEnabled, // 🌟 NEW PROP: Current state of the toggle
    handleSafeDeletionToggle // 🌟 NEW PROP: Handler to update the state
}) { 
    
    // ADOPT: State for the search query
    const [query, setQuery] = useState("");
    
    // UNIFIED: Handlers for button clicks
    const handleCreateClick = () => {
        goToCreatePage();
    };

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

            {/* Left Buttons (Container for Create/Delete/Edit) */}
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

                {/* 🌟 ISSUE 1 FIX: ADD SAFE DELETION TOGGLE NEXT TO DELETE BUTTON */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mr: 1 }}>
                    <FormControlLabel
                        control={
                            <Switch 
                                checked={isSafeDeletionEnabled} 
                                onChange={handleSafeDeletionToggle} 
                                color="primary"
                            />
                        }
                        label={
                            <Typography variant="caption" sx={{ whiteSpace: 'nowrap' }}>
                                Safe Delete
                            </Typography>
                        }
                        labelPlacement="start" // Place label to the left of the switch
                        sx={{ m: 0 }} // Remove default margin
                    />
                </Box>
                {/* END OF SAFE DELETION TOGGLE */}

                <Button
                    variant="outlined"
                    startIcon={<DeleteIcon />}
                    color="error"
                    disabled={numSelected === 0}
                    // --- RESOLUTION FOR BLOCK 2 (Delete Button) ---
                    onClick={handleDeleteClick} // ADOPTED: New handler prop from origin/main
                    sx={LARGE_BUTTON_SX} // KEPT: Your style 
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