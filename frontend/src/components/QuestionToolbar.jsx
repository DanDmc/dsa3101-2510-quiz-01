// src/components/QuestionToolbar.jsx
import React, { useState } from 'react';
import { 
    Box, Button, TextField, InputAdornment, IconButton, 
    Typography, 
    // REMOVED: Switch, FormControlLabel (since Safe Delete is removed)
    Menu, MenuItem, FormControl, InputLabel, Select, Chip, OutlinedInput 
} from '@mui/material';
import CreateIcon from '@mui/icons-material/Create';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import SearchIcon from '@mui/icons-material/Search';
import ViewListIcon from '@mui/icons-material/ViewList';
import { useTheme } from '@mui/material/styles'; // Import useTheme

// --- MOCK DATA FOR FILTERS ---
// These should match your database tables
const MOCK_QUESTION_TYPES = ["MCQ", "Open-ended", "MRQ", "Ordering", "Matching", "Coding"];
const MOCK_ASSESSMENT_TYPES = ["quiz", "midterm", "final", "assessment", "project"]; 
const MOCK_YEARS = [2024, 2023, 2022, 2021];
const MOCK_SEMESTERS = ["Semester 1", "Semester 2", "Special Term 1", "Special Term 2"];
const MOCK_TAGS = ["linear regression", "residuals", "data visualization", "model suitability", "model limitations", "binary response"];

// --- Style constant ---
const LARGE_BUTTON_SX = {
    py: 1.2,
    px: 2.5,
    fontSize: '0.9rem',
    fontWeight: 'bold',
};

// --- Chip styles for multi-select ---
function getStyles(name, personName, theme) {
  return {
    fontWeight:
      personName.indexOf(name) === -1
        ? theme.typography.fontWeightRegular
        : theme.typography.fontWeightMedium,
  };
}

// ⬅️ FINAL PROPS: Clean, no Safe Delete logic
function QuestionToolbar({ 
    numSelected, 
    goToCreatePage, 
    goToEditPage, 
    goToSearchPage, 
    handleDeleteClick,
}) { 
    
    const theme = useTheme(); 
    
    // --- State for the filter menu anchor ---
    const [anchorEl, setAnchorEl] = useState(null);
    const open = Boolean(anchorEl);

    // --- State for all filter values ---
    const [query, setQuery] = useState("");
    const [filterQuestionType, setFilterQuestionType] = useState(''); 
    const [filterAssessmentType, setFilterAssessmentType] = useState(''); 
    const [filterYear, setFilterYear] = useState(''); 
    const [filterSemester, setFilterSemester] = useState(''); 
    const [filterTags, setFilterTags] = useState([]); 

    // --- Menu open/close handlers ---
    const handleMenuClick = (event) => {
      setAnchorEl(event.currentTarget);
    };
    const handleMenuClose = () => {
      setAnchorEl(null);
    };

    // --- Single function to trigger search ---
    const handleSearchTrigger = (e) => {
        e?.preventDefault(); 
        
        // Bundle all filter states into one object
        const searchParams = {
            query: query.trim(),
            question_type: filterQuestionType, 
            assessment_type: filterAssessmentType, 
            year: filterYear,
            semester: filterSemester,
            tags: filterTags
        };

        // Send the complete search object
        goToSearchPage(searchParams);
        handleMenuClose(); 
    };

    // --- Handler to clear all filters ---
    const handleClearFilters = () => {
        setQuery("");
        setFilterQuestionType(''); 
        setFilterAssessmentType('');
        setFilterYear('');
        setFilterSemester('');
        setFilterTags([]);
    };
    
    // --- Multi-select change handlers ---
    const handleTagChange = (event) => {
        const { target: { value } } = event;
        setFilterTags(typeof value === 'string' ? value.split(',') : value);
    };
    
    return (
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>

            {/* Left Buttons (Create/Delete/Edit) */}
            <Box sx={{ display: 'flex', gap: 0.5 }}>
                <Button variant="contained" startIcon={<CreateIcon />} sx={{ backgroundColor: '#4caf50', '&:hover': { backgroundColor: '#388e3c' }, ...LARGE_BUTTON_SX, }} onClick={goToCreatePage} >
                    Create / Upload
                </Button>

                {/* The Safe Delete Toggle block is removed */}
                
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
                <Button variant="outlined" startIcon={<EditIcon />} color="primary" disabled={numSelected === 0} onClick={goToEditPage} sx={LARGE_BUTTON_SX} >
                    Edit
                </Button>
            </Box>

            {/* Right Search Bar & Filter Button */}
            <Box sx={{ display: 'flex', alignItems: 'center', flex: 1, ml: 3 }}>
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
                
                {/* --- FILTER MENU BUTTON --- */}
                <IconButton
                    onClick={handleMenuClick}
                    title="Filters"
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

                {/* --- FILTER MENU POPUP --- */}
                <Menu
                    anchorEl={anchorEl}
                    open={open}
                    onClose={handleMenuClose}
                    PaperProps={{
                      style: {
                        width: 400, // Set a width for the menu
                        padding: '16px',
                      },
                    }}
                >
                    <Typography variant="h6" gutterBottom>Filters</Typography>
                    
                    {/* --- Question Type Dropdown (Single-Select) --- */}
                    <FormControl fullWidth variant="outlined" size="small" sx={{ mb: 2 }}>
                        <InputLabel>Question Type</InputLabel>
                        <Select
                            value={filterQuestionType}
                            onChange={(e) => setFilterQuestionType(e.target.value)}
                            label="Question Type"
                        >
                            <MenuItem value=""><em>All Types</em></MenuItem>
                            {MOCK_QUESTION_TYPES.map((type) => (
                                <MenuItem key={type} value={type}>{type}</MenuItem>
                            ))}
                        </Select>
                    </FormControl>

                    {/* --- Assessment Type Dropdown --- */}
                    <FormControl fullWidth variant="outlined" size="small" sx={{ mb: 2 }}>
                        <InputLabel>Assessment Type</InputLabel>
                        <Select
                            value={filterAssessmentType}
                            onChange={(e) => setFilterAssessmentType(e.target.value)}
                            label="Assessment Type"
                        >
                            <MenuItem value=""><em>All Types</em></MenuItem>
                            {MOCK_ASSESSMENT_TYPES.map((type) => (
                                <MenuItem key={type} value={type}>{type}</MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    
                    {/* --- Year Dropdown --- */}
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
                    
                    {/* --- Semester Dropdown --- */}
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
                    </FormControl>
                    
                    {/* --- 5. Concept Tags Multi-select --- */}
                    <FormControl fullWidth variant="outlined" size="small" sx={{ mb: 2 }}>
                        <InputLabel>Concept Tags</InputLabel>
                        <Select
                            multiple
                            value={filterTags}
                            onChange={handleTagChange}
                            input={<OutlinedInput label="Concept Tags" />}
                            renderValue={(selected) => (
                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                    {selected.map((value) => (
                                        <Chip key={value} label={value} size="small" />
                                    ))}
                                </Box>
                            )}
                        >
                            {MOCK_TAGS.map((tag) => (
                                <MenuItem key={tag} value={tag} style={getStyles(tag, filterTags, theme)}>
                                    {tag}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    
                    {/* --- Action Buttons --- */}
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
                        <Button onClick={handleClearFilters} size="small">Clear</Button>
                        <Button onClick={handleSearchTrigger} variant="contained" size="small">Apply</Button>
                    </Box>
                </Menu>
            </Box>
        </Box>
    );
}

export default QuestionToolbar;