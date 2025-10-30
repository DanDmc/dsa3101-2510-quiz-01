import React, { useState } from 'react';
import {
    Box, Button, TextField, InputAdornment, IconButton,
    Switch, FormControlLabel, Typography,
    // --- NEW IMPORTS ---
    Menu, MenuItem, FormControl, InputLabel, Select,
    Checkbox, ListItemText, OutlinedInput
} from '@mui/material';
import CreateIcon from '@mui/icons-material/Create';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import SearchIcon from '@mui/icons-material/Search';
import ViewListIcon from '@mui/icons-material/ViewList';

// --- NEW MOCK DATA (You can replace this with props or API data) ---
const MOCK_YEARS = [2024, 2023, 2022, 2021, 2020];
const MOCK_SEMESTERS = ["Semester 1", "Semester 2", "Special Term 1", "Special Term 2"];
const MOCK_ASSESSMENT_TYPES = ["Final Exam", "Midterm", "Quiz", "Assignment"];
const MOCK_CONCEPT_TAGS = ["Regression", "Probability", "Data Structures", "Algorithms", "Calculus", "Databases"];


const LARGE_BUTTON_SX = {
    py: 1.2,
    px: 2.5,
    fontSize: '0.9rem',
    fontWeight: 'bold',
};

// --- NEW: For the Multi-Select Dropdown ---
const ITEM_HEIGHT = 48;
const ITEM_PADDING_TOP = 8;
const MenuProps = {
  PaperProps: {
    style: {
      maxHeight: ITEM_HEIGHT * 4.5 + ITEM_PADDING_TOP,
      width: 250,
    },
  },
};

function QuestionToolbar({
    numSelected,
    goToCreatePage,
    goToEditPage,
    goToSearchPage,
    handleDeleteClick,
    isSafeDeletionEnabled,
    handleSafeDeletionToggle
}) {

    const [query, setQuery] = useState("");

    // --- NEW: State for the filter menu ---
    const [filterAnchorEl, setFilterAnchorEl] = useState(null);
    const filterMenuOpen = Boolean(filterAnchorEl);

    // --- NEW: State for filter values ---
    const [filterAssessment, setFilterAssessment] = useState('');
    const [filterYear, setFilterYear] = useState('');
    const [filterSemester, setFilterSemester] = useState('');
    const [filterTags, setFilterTags] = useState([]); // For multi-select

    // --- NEW: Handlers for the filter menu ---
    const handleFilterMenuClick = (event) => {
        setFilterAnchorEl(event.currentTarget);
    };
    const handleFilterMenuClose = () => {
        setFilterAnchorEl(null);
    };

    // --- NEW: Handler for multi-select tag filter ---
    const handleTagFilterChange = (event) => {
        const { target: { value } } = event;
        setFilterTags(
          // On autofill we get a stringified value.
          typeof value === 'string' ? value.split(',') : value,
        );
    };

    // --- 1. REMOVED: handleApplyFilters and handleSearchOrBrowse ---

    // --- 2. ADDED: One single function to trigger the search ---
    /**
     * Gathers all search/filter data and passes it to the parent.
     * This is triggered by both the search bar and the "Apply" button.
     */
    const handleSearchTrigger = (e) => {
        e?.preventDefault(); // Prevents form submission from reloading the page
        
        const searchParams = {
            query: query,
            assessment_type: filterAssessment,
            year: filterYear,
            semester: filterSemester,
            concept_tags: filterTags
        };

        // Log the combined search parameters
        console.log("Sending search parameters:", searchParams);

        // Call the prop function from main.jsx
        goToSearchPage(searchParams);

        // Close the filter menu if it's open
        handleFilterMenuClose();
    };

    // --- NEW: Handler to clear all filters ---
    const handleClearFilters = () => {
        setFilterAssessment('');
        setFilterYear('');
        setFilterSemester('');
        setFilterTags([]);
    };


    const handleCreateClick = () => {
        goToCreatePage();
    };

    const handleEditClick = () => {
        goToEditPage();
    };

    const handleSearchOrBrowse = (e) => {
        e?.preventDefault();
        goToSearchPage?.(query.trim());
    };


    return (
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>

            {/* Left Buttons (Create/Delete/Edit) */}
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
                        labelPlacement="start"
                        sx={{ m: 0 }}
                    />
                </Box>

                <Button
                    variant="outlined"
                    startIcon={<DeleteIcon />}
                    color="error"
                    disabled={numSelected === 0}
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

            {/* Search Bar */}
            <Box sx={{ display: 'flex', alignItems: 'center', flex: 1, ml: 3 }}>
                
                {/* --- 3. UPDATED: Form now uses the new trigger --- */}
                <form onSubmit={handleSearchTrigger} style={{ width: '100%' }}>
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

                {/* --- UPDATED: Orange Filter Menu Button --- */}
                <IconButton
                    id="filter-menu-button"
                    aria-controls={filterMenuOpen ? 'filter-menu' : undefined}
                    aria-haspopup="true"
                    aria-expanded={filterMenuOpen ? 'true' : undefined}
                    onClick={handleFilterMenuClick} // CHANGED: This now opens the menu
                    title="Filters" // UPDATED: Title
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

                {/* --- NEW: Filter Menu --- */}
                <Menu
                    id="filter-menu"
                    anchorEl={filterAnchorEl}
                    open={filterMenuOpen}
                    onClose={handleFilterMenuClose}
                    MenuListProps={{
                        'aria-labelledby': 'filter-menu-button',
                    }}
                    // Keep menu open when clicking inside
                    PaperProps={{ sx: { p: 2, width: '350px' } }}
                >
                    <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>Filters</Typography>

                    {/* Assessment Type Dropdown */}
                    <FormControl fullWidth variant="outlined" size="small" sx={{ mb: 2 }}>
                        <InputLabel>Assessment Type</InputLabel>
                        <Select
                            value={filterAssessment}
                            onChange={(e) => setFilterAssessment(e.target.value)}
                            label="Assessment Type"
                        >
                            <MenuItem value=""><em>All Types</em></MenuItem>
                            {MOCK_ASSESSMENT_TYPES.map((type) => (
                                <MenuItem key={type} value={type}>{type}</MenuItem>
                            ))}
                        </Select>
                    </FormControl>

                    {/* Year Dropdown */}
                    <FormControl fullWidth variant="outlined" size="small" sx={{ mb: 2 }}>
                        <InputLabel>Year</InputLabel>
                        <Select
                            value={filterYear}
                            onChange={(e) => setFilterYear(e.target.value)}
                            label="Year"
                        >
                            <MenuItem value=""><em>All Years</em></MenuItem>
                            {MOCK_YEARS.map((year) => (
                                <MenuItem key={year} value={year}>{year}</MenuItem>
                            ))}
                        </Select>
                    </FormControl>

                    {/* Semester Dropdown */}
                    <FormControl fullWidth variant="outlined" size="small" sx={{ mb: 2 }}>
                        <InputLabel>Semester</InputLabel>
                        <Select
                            value={filterSemester}
                            onChange={(e) => setFilterSemester(e.target.value)}
                            label="Semester"
                        >
                            <MenuItem value=""><em>All Semesters</em></MenuItem>
                            {MOCK_SEMESTERS.map((sem) => (
                                <MenuItem key={sem} value={sem}>{sem}</MenuItem>
                            ))}
                        </Select>
                    {/* --- THIS IS THE FIX --- */}
                    {/* I added the missing closing tag here */}
                    </FormControl>
                    
                    {/* Concept Tags Multi-Select */}
                    <FormControl fullWidth variant="outlined" size="small" sx={{ mb: 2 }}>
                        <InputLabel>Concept Tags</InputLabel>
                        <Select
                            multiple
                            value={filterTags}
                            onChange={handleTagFilterChange}
                            input={<OutlinedInput label="Concept Tags" />}
                            renderValue={(selected) => selected.join(', ')}
                            MenuProps={MenuProps}
                        >
                            {MOCK_CONCEPT_TAGS.map((tag) => (
                                <MenuItem key={tag} value={tag}>
                                    <Checkbox checked={filterTags.indexOf(tag) > -1} />
                                    <ListItemText primary={tag} />
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>

                    {/* Action Buttons */}
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
                        <Button
                            onClick={handleClearFilters}
                            variant="text"
                            size="small"
                        >
                            Clear
                        </Button>
                        <Button
                            // --- 4. UPDATED: "Apply" button now uses the new trigger ---
                            onClick={handleSearchTrigger}
                            variant="contained"
                            size="small"
                            sx={{ backgroundColor: '#f57c00', '&:hover': { backgroundColor: '#e65100' } }}
                        >
                            Apply
                        </Button>
                    </Box>
                </Menu>

            </Box>

        </Box>
    );
}

export default QuestionToolbar;

