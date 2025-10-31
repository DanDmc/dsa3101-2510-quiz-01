// src/components/QuestionToolbar.jsx
import React, { useState } from 'react';
import {
  Box, Button, TextField, InputAdornment, IconButton,
  Switch, FormControlLabel, Typography, Menu,
  FormControl, InputLabel, Select, MenuItem, Chip
} from '@mui/material';
import CreateIcon from '@mui/icons-material/Create';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import SearchIcon from '@mui/icons-material/Search';
import ViewListIcon from '@mui/icons-material/ViewList';

const LARGE_BUTTON_SX = { py: 1.2, px: 2.5, fontSize: '0.9rem', fontWeight: 'bold' };

const TYPE_OPTIONS = [
  { label: 'All Types', value: '' },
  { label: 'Open Ended', value: 'open-ended' },
  { label: 'MCQ', value: 'mcq' },
  { label: 'Coding', value: 'coding' },
];

const ASSESSMENT_OPTIONS = [
  { label: 'All', value: '' },
  { label: 'Final', value: 'final' },
  { label: 'Midterm', value: 'midterm' },
  { label: 'Quiz', value: 'quiz' },
];

const AY_OPTIONS = ["All","2025/2026","2024/2025","2023/2024","2022/2023","Unknown"];

function QuestionToolbar({
  numSelected,
  goToCreatePage,
  goToEditPage,
  goToSearchPage,
  handleDeleteClick,
  isSafeDeletionEnabled,
  handleSafeDeletionToggle,
  courseOptions = [{ key: 'All', label: 'All' }, { key: 'UNKNOWN', label: 'Unknown' }],
  conceptOptions = ['All'], // will be populated from App on first load
}) {
  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);

  const [query, setQuery] = useState('');
  const [filterQuestionType, setFilterQuestionType] = useState('');
  const [filterAssessmentType, setFilterAssessmentType] = useState('');
  const [filterAY, setFilterAY] = useState('');      // NEW: Academic Year
  const [filterCourse, setFilterCourse] = useState('');
  const [filterConcept, setFilterConcept] = useState(''); // SINGLE

  const handleMenuClick = (e) => setAnchorEl(e.currentTarget);
  const handleMenuClose = () => setAnchorEl(null);

  const handleSearchTrigger = (e) => {
    e?.preventDefault();
    goToSearchPage({
      query: query.trim(),
      question_type: filterQuestionType,
      assessment_type: filterAssessmentType,
      course: filterCourse === 'All' ? '' : filterCourse,
      academic_year: filterAY === 'All' ? '' : filterAY, // App/QS will convert AY label → year when needed
      tags: (filterConcept && filterConcept !== 'All') ? [filterConcept] : [],
    });
    handleMenuClose();
  };

  const handleClearFilters = () => {
    setQuery('');
    setFilterQuestionType('');
    setFilterAssessmentType('');
    setFilterAY('All');
    setFilterCourse('All');
    setFilterConcept('All');
  };

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
      <Box sx={{ display: 'flex', gap: 0.5 }}>
        <Button variant="contained" startIcon={<CreateIcon />} sx={{ backgroundColor: '#4caf50', '&:hover': { backgroundColor: '#388e3c' }, ...LARGE_BUTTON_SX }} onClick={goToCreatePage}>
          Create / Upload
        </Button>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mr: 1 }}>
          <FormControlLabel control={<Switch checked={isSafeDeletionEnabled} onChange={handleSafeDeletionToggle} color="primary" />} label={<Typography variant="caption" sx={{ whiteSpace: 'nowrap' }}>Safe Delete</Typography>} labelPlacement="start" sx={{ m: 0 }} />
        </Box>

        <Button variant="outlined" startIcon={<DeleteIcon />} color="error" disabled={numSelected === 0} onClick={handleDeleteClick} sx={LARGE_BUTTON_SX}>Delete</Button>
        <Button variant="outlined" startIcon={<EditIcon />} color="primary" disabled={numSelected === 0} onClick={goToEditPage} sx={LARGE_BUTTON_SX}>Edit</Button>
      </Box>

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
                  <IconButton type="submit" aria-label="search"><SearchIcon /></IconButton>
                </InputAdornment>
              ),
            }}
          />
        </form>

        <IconButton
          onClick={handleMenuClick}
          title="Filters"
          sx={{ backgroundColor: '#f57c00', color: 'white', borderRadius: '8px', '&:hover': { backgroundColor: '#e65100' }, ml: 2 }}
        >
          <ViewListIcon />
        </IconButton>

        <Menu
          anchorEl={anchorEl}
          open={open}
          onClose={handleMenuClose}
          PaperProps={{ style: { width: 420, padding: 16 } }}
        >
          <Typography variant="h6" gutterBottom>Filters</Typography>

          {/* Question Type */}
          <FormControl fullWidth size="small" sx={{ mb: 2 }}>
            <InputLabel>Question Type</InputLabel>
            <Select value={filterQuestionType} label="Question Type" onChange={(e)=>setFilterQuestionType(e.target.value)}>
              {TYPE_OPTIONS.map(opt => <MenuItem key={opt.label} value={opt.value}>{opt.label}</MenuItem>)}
            </Select>
          </FormControl>

          {/* Course */}
          <FormControl fullWidth size="small" sx={{ mb: 2 }}>
            <InputLabel>Course</InputLabel>
            <Select value={filterCourse} label="Course" onChange={(e)=>setFilterCourse(e.target.value)}>
              {courseOptions.map(opt => (
                <MenuItem key={opt.key} value={opt.key}>{opt.label}</MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Academic Year */}
          <FormControl fullWidth size="small" sx={{ mb: 2 }}>
            <InputLabel>Academic Year</InputLabel>
            <Select value={filterAY} label="Academic Year" onChange={(e)=>setFilterAY(e.target.value)}>
              {AY_OPTIONS.map(ay => <MenuItem key={ay} value={ay}>{ay}</MenuItem>)}
            </Select>
          </FormControl>

          {/* Assessment */}
          <FormControl fullWidth size="small" sx={{ mb: 2 }}>
            <InputLabel>Assessment Type</InputLabel>
            <Select value={filterAssessmentType} label="Assessment Type" onChange={(e)=>setFilterAssessmentType(e.target.value)}>
              {ASSESSMENT_OPTIONS.map(opt => <MenuItem key={opt.label} value={opt.value}>{opt.label}</MenuItem>)}
            </Select>
          </FormControl>

          {/* Concept Tag (SINGLE) */}
          <FormControl fullWidth size="small" sx={{ mb: 2 }}>
            <InputLabel>Concept Tag</InputLabel>
            <Select value={filterConcept} label="Concept Tag" onChange={(e)=>setFilterConcept(e.target.value)}>
              {(conceptOptions || ['All']).map(tag => (
                <MenuItem key={tag} value={tag}>{tag}</MenuItem>
              ))}
            </Select>
          </FormControl>

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
