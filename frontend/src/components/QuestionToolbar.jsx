/**
 * @file QuestionToolbar component.
 * @module components/QuestionToolbar
 * Renders the main toolbar for the question bank. It provides access to creation, 
 * bulk editing, and deletion of questions, alongside a unified search bar that 
 * triggers a detailed filter menu.
 *
 * All filter logic is handled internally, and the collected parameters are passed 
 * to the parent component via the `goToSearchPage` prop when triggered.
 *
 * @typedef {object} SearchParams
 * @property {string} [query] - Keyword search string.
 * @property {string} [question_type] - Filter by a single question type.
 * @property {string} [assessment_type] - Filter by a single assessment type.
 * @property {string} [year] - Filter by a single year.
 * @property {string} [semester] - Filter by a single semester.
 * @property {Array<string>} [tags] - Filter by multiple concept tags (multi-select).
 * @property {string} [course] - Filter by a single course key.
 * @property {string} [academic_year] - Filter by a single academic year range.
 *
 * @param {object} props The component props.
 * @param {number} props.numSelected - The number of questions currently selected in the table (used to disable Edit/Delete buttons).
 * @param {function(): void} props.goToCreatePage - Handler to navigate to the question creation/upload page.
 * @param {function(): void} props.goToEditPage - Handler to navigate to the bulk edit page (disabled if numSelected is 0).
 * @param {function(SearchParams): void} props.goToSearchPage - Handler executed to trigger a new search/filter request in the parent component.
 * @param {function(): void} props.handleDeleteClick - Handler to perform the bulk deletion of selected questions.
 * @param {Array<{key: string, label: string}>} [props.courseOptions] - List of available courses for the filter dropdown.
 * @param {Array<string>} [props.conceptOptions] - List of all available concept tags for the multi-select filter.
 * @returns {JSX.Element} A Material-UI Box containing action buttons and the search/filter interface.
 */

// src/components/QuestionToolbar.jsx
import React, { useState } from 'react';
import {
    Box, Button, TextField, InputAdornment, IconButton,
    Typography,
    Menu, MenuItem, FormControl, InputLabel, Select, Chip, OutlinedInput // Keep all necessary filter imports
} from '@mui/material';
import CreateIcon from '@mui/icons-material/Create';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import SearchIcon from '@mui/icons-material/Search';
import ViewListIcon from '@mui/icons-material/ViewList';
import { useTheme } from '@mui/material/styles';

// --- MOCK DATA FOR FILTERS ---
const MOCK_QUESTION_TYPES = ["MCQ", "Open-ended", "MRQ", "FILL-IN-THE-BLANKS", "Coding", "Others"];
const MOCK_ASSESSMENT_TYPES = ["quiz", "midterm", "final", "assessment", "project"];
const MOCK_YEARS = [2024, 2023, 2022, 2021];
const MOCK_SEMESTERS = ["Semester 1", "Semester 2", "Special Term 1", "Special Term 2"];
const MOCK_TAGS = ["linear regression", "residuals", "data visualization", "model suitability", "model limitations", "binary response"];

// --- Academic Year Options ---
const AY_OPTIONS = ["All", "2025/2026", "2024/2025", "2023/2024", "2022/2023", "Unknown"];

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

// PROPS: Removed Safe Delete logic, was required for testing
function QuestionToolbar({
    numSelected,
    goToCreatePage,
    goToEditPage,
    goToSearchPage,
    handleDeleteClick,
    courseOptions = [{ key: 'All', label: 'All' }, { key: 'UNKNOWN', label: 'Unknown' }],
    conceptOptions = ['All'],
}) {

    const theme = useTheme();

    // --- Menu State ---
    const [anchorEl, setAnchorEl] = useState(null);
    const open = Boolean(anchorEl);

    // --- Filter State  ---
    const [query, setQuery] = useState('');
    const [filterQuestionType, setFilterQuestionType] = useState('');
    const [filterAssessmentType, setFilterAssessmentType] = useState('');
    const [filterYear, setFilterYear] = useState('');
    const [filterSemester, setFilterSemester] = useState(''); 
    const [filterAY, setFilterAY] = useState('All'); // AY state
    const [filterCourse, setFilterCourse] = useState('All'); // Course state
    const [filterTags, setFilterTags] = useState([]); // multi-select state
    const [filterConcept, setFilterConcept] = useState('All'); // single-select concept

    // --- Menu open/close handlers ---
    const handleMenuClick = (event) => setAnchorEl(event.currentTarget);
    const handleMenuClose = () => setAnchorEl(null);

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
            tags: filterTags,
            // Pass the course and academic year states
            course: filterCourse,
            academic_year: filterAY,
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

                {/* The Safe Delete Toggle box from Incoming is discarded */}

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
                        <Select value={filterQuestionType} label="Question Type" onChange={(e) => setFilterQuestionType(e.target.value)}>
                            <MenuItem value=""><em>All Types</em></MenuItem>
                            {MOCK_QUESTION_TYPES.map((type) => (
                                <MenuItem key={type} value={type}>{type}</MenuItem>
                            ))}
                        </Select>
                    </FormControl>

                    {/* Course Dropdown (Integrated from Incoming logic/state) */}
                    <FormControl fullWidth size="small" sx={{ mb: 2 }}>
                        <InputLabel>Course</InputLabel>
                        <Select value={filterCourse} label="Course" onChange={(e) => setFilterCourse(e.target.value)}>
                            {courseOptions.map(opt => (
                                <MenuItem key={opt.key} value={opt.key}>{opt.label}</MenuItem>
                            ))}
                        </Select>
                    </FormControl>

                    {/* Academic Year Dropdown */}
                    <FormControl fullWidth size="small" sx={{ mb: 2 }}>
                        <InputLabel>Academic Year</InputLabel>
                        <Select value={filterAY} label="Academic Year" onChange={(e) => setFilterAY(e.target.value)}>
                            {AY_OPTIONS.map(ay => <MenuItem key={ay} value={ay}>{ay}</MenuItem>)}
                        </Select>
                    </FormControl>

                    {/* Assessment Type Dropdown */}
                    <FormControl fullWidth size="small" sx={{ mb: 2 }}>
                        <InputLabel>Assessment Type</InputLabel>
                        <Select value={filterAssessmentType} label="Assessment Type" onChange={(e) => setFilterAssessmentType(e.target.value)}>
                            <MenuItem value=""><em>All Types</em></MenuItem>
                            {MOCK_ASSESSMENT_TYPES.map((type) => (
                                <MenuItem key={type} value={type}>{type}</MenuItem>
                            ))}
                        </Select>
                    </FormControl>

                    {/* Concept Tags Multi-select */}
                    <FormControl fullWidth size="small" sx={{ mb: 2 }}>
                        <InputLabel>Concept Tags</InputLabel>
                        <Select
                            multiple
                            value={filterTags} // Using state
                            onChange={handleTagChange} // Using handler
                            input={<OutlinedInput label="Concept Tags" />}
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