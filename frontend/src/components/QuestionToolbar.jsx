// src/components/QuestionToolbar.jsx
import React, { useState } from 'react';
import {
    Box, Button, TextField, InputAdornment, IconButton,
    Typography, 
    Menu, MenuItem, FormControl, InputLabel, Select, Chip, OutlinedInput // Kept all necessary filter imports
} from '@mui/material';
import CreateIcon from '@mui/icons-material/Create';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import SearchIcon from '@mui/icons-material/Search';
import ViewListIcon from '@mui/icons-material/ViewList';
import { useTheme } from '@mui/material/styles'; 

// --- MOCK DATA FOR FILTERS (Combined/Refined) ---
const MOCK_QUESTION_TYPES = ["MCQ", "Open-ended", "MRQ", "Ordering", "Matching", "Coding", "others"];
const MOCK_ASSESSMENT_TYPES = ["quiz", "midterm", "final", "assessment", "project"]; 
const MOCK_YEARS = [2024, 2023, 2022, 2021];
const MOCK_SEMESTERS = ["Semester 1", "Semester 2", "Special Term 1", "Special Term 2"];
const MOCK_TAGS = ["linear regression", "residuals", "data visualization", "model suitability", "model limitations", "binary response"];

// --- Academic Year Options (from Incoming) ---
const AY_OPTIONS = ["All","2025/2026","2024/2025","2023/2024","2022/2023","Unknown"];

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
    courseOptions = [{ key: 'All', label: 'All' }, { key: 'UNKNOWN', label: 'Unknown' }], // From Incoming
    conceptOptions = ['All'], // From Incoming
}) { 
    
    const theme = useTheme(); 
    
    // --- Menu State ---
    const [anchorEl, setAnchorEl] = useState(null);
    const open = Boolean(anchorEl);

    // --- Filter State (Combined from HEAD and Incoming) ---
    const [query, setQuery] = useState('');
    const [filterQuestionType, setFilterQuestionType] = useState(''); 
    const [filterAssessmentType, setFilterAssessmentType] = useState(''); 
    const [filterYear, setFilterYear] = useState(''); // Your HEAD logic
    const [filterSemester, setFilterSemester] = useState(''); // Your HEAD logic
    const [filterAY, setFilterAY] = useState('All'); // Incoming AY state
    const [filterCourse, setFilterCourse] = useState('All'); // Incoming Course state
    const [filterTags, setFilterTags] = useState([]); // Your HEAD multi-select state
    const [filterConcept, setFilterConcept] = useState('All'); // Incoming single-select concept

    // --- Menu open/close handlers ---
    const handleMenuClick = (event) => setAnchorEl(event.currentTarget);
    const handleMenuClose = () => setAnchorEl(null);

    // --- Single function to trigger search (Consolidated logic) ---
    const handleSearchTrigger = (e) => {
        e?.preventDefault(); 
        
        // Bundle all filter states into one object
        const searchParams = {
            query: query.trim(),
            // Using your HEAD's fields, mapping incoming state to them
            question_type: filterQuestionType, 
            assessment_type: filterAssessmentType, 
            year: filterYear, // Placeholder for future logic
            semester: filterSemester, // Placeholder for future logic
            tags: filterTags, // Using HEAD's multi-select state
        };

        goToSearchPage(searchParams);
        handleMenuClose(); 
    };

    // --- Handler to clear all filters ---
    const handleClearFilters = () => {
        setQuery('');
        setFilterQuestionType(''); 
        setFilterAssessmentType('');
        setFilterYear('');
        setFilterSemester('');
        setFilterAY('All');
        setFilterCourse('All');
        setFilterTags([]);
        setFilterConcept('All');
    };
    
    // --- Multi-select change handlers (HEAD Logic) ---
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

                {/* ❌ REMOVED: The Safe Delete Toggle box from Incoming is discarded */}
                
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
                
                {/* --- FILTER MENU BUTTON (From HEAD) --- */}
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

                {/* --- FILTER MENU POPUP (Combined/Integrated) --- */}
                <Menu
                    anchorEl={anchorEl}
                    open={open}
                    onClose={handleMenuClose}
                    PaperProps={{
                      style: {
                        width: 420, // Adjusted width
                        padding: '16px',
                      },
                    }}
                >
                    <Typography variant="h6" gutterBottom>Filters</Typography>

                    {/* Question Type Dropdown */}
                    <FormControl fullWidth size="small" sx={{ mb: 2 }}>
                        <InputLabel>Question Type</InputLabel>
                        <Select value={filterQuestionType} label="Question Type" onChange={(e)=>setFilterQuestionType(e.target.value)}>
                            <MenuItem value=""><em>All Types</em></MenuItem>
                            {MOCK_QUESTION_TYPES.map((type) => (
                                <MenuItem key={type} value={type}>{type}</MenuItem>
                            ))}
                        </Select>
                    </FormControl>

                    {/* Course Dropdown (Integrated from Incoming logic/state) */}
                    <FormControl fullWidth size="small" sx={{ mb: 2 }}>
                        <InputLabel>Course</InputLabel>
                        <Select value={filterCourse} label="Course" onChange={(e)=>setFilterCourse(e.target.value)}>
                            {courseOptions.map(opt => (
                                <MenuItem key={opt.key} value={opt.key}>{opt.label}</MenuItem>
                            ))}
                        </Select>
                    </FormControl>

                    {/* Academic Year Dropdown (Integrated from Incoming) */}
                    <FormControl fullWidth size="small" sx={{ mb: 2 }}>
                        <InputLabel>Academic Year</InputLabel>
                        <Select value={filterAY} label="Academic Year" onChange={(e)=>setFilterAY(e.target.value)}>
                            {AY_OPTIONS.map(ay => <MenuItem key={ay} value={ay}>{ay}</MenuItem>)}
                        </Select>
                    </FormControl>

                    {/* Assessment Type Dropdown */}
                    <FormControl fullWidth size="small" sx={{ mb: 2 }}>
                        <InputLabel>Assessment Type</InputLabel>
                        <Select value={filterAssessmentType} label="Assessment Type" onChange={(e)=>setFilterAssessmentType(e.target.value)}>
                            <MenuItem value=""><em>All Types</em></MenuItem>
                            {MOCK_ASSESSMENT_TYPES.map((type) => (
                                <MenuItem key={type} value={type}>{type}</MenuItem>
                            ))}
                        </Select>
                    </FormControl>

                    {/* Concept Tags Multi-select (Using HEAD's Multi-select logic) */}
                    <FormControl fullWidth size="small" sx={{ mb: 2 }}>
                        <InputLabel>Concept Tags</InputLabel>
                        <Select
                            multiple
                            value={filterTags} // Using HEAD's state
                            onChange={handleTagChange} // Using HEAD's handler
                            input={<OutlinedInput label="Concept Tags" />} // Needs OutlinedInput import
                            renderValue={(selected) => (
                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                    {selected.map((value) => (
                                        <Chip key={value} label={value} size="small" />
                                    ))}
                                </Box>
                            )}
                        >
                            {(conceptOptions || ['All']).map(tag => (
                                <MenuItem key={tag} value={tag} style={getStyles(tag, filterTags, theme)}>
                                    {tag}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>

                    {/* Action Buttons */}
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
                        <Button onClick={handleClearFilters} size="small">CLEAR</Button>
                        <Button onClick={handleSearchTrigger} variant="contained" size="small">APPLY</Button>
                    </Box>
                </Menu>
              </Box>
            </Box>
        );
}

export default QuestionToolbar;