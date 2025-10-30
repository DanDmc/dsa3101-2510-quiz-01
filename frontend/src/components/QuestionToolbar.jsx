import React, { useState } from 'react';
import { 
    Box, Button, TextField, InputAdornment, IconButton, 
    Typography 
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

// ✅ MODIFICATION: Removed isSafeDeletionEnabled and handleSafeDeletionToggle props.
function QuestionToolbar({ 
    numSelected, 
    goToCreatePage, 
    goToEditPage, 
    goToSearchPage, 
    handleDeleteClick, // This is now the universal hard delete handler
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

                {/* ❌ REMOVED: SAFE DELETION TOGGLE BLOCK IS GONE */}
                
                <Button
                    variant="outlined"
                    startIcon={<DeleteIcon />}
                    color="error"
                    disabled={numSelected === 0}
                    // ✅ MODIFICATION: handleDeleteClick now performs HARD DELETE unconditionally.
                    onClick={handleDeleteClick} 
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

            {/* --- RESOLUTION FOR BLOCK 3 (Search Bar UI and Functionality) --- */}
            <Box sx={{ display: 'flex', alignItems: 'center', flex: 1, ml: 3 }}>
                <form onSubmit={handleSearchOrBrowse} style={{ width: '100%' }}>
                    <TextField
                        sx={{ width: '100%' }} 
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
                <IconButton
                    onClick={handleSearchOrBrowse}
                    title="Browse / Search" 
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