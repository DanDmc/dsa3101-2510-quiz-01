import React, { useState, useEffect } from 'react';
import {
    Box,
    Button,
    Grid,
    Typography,
    Switch,
    FormControlLabel,
    TextField,
    MenuItem,
    Select,
    InputBase,
    Stack, // Added Stack for arranging the button content (text, divider, icon)
    Divider, // Added Divider for the vertical line
} from '@mui/material';
import { styled } from '@mui/material/styles';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';

// --- STYLED COMPONENTS FOR REUSABILITY AND LOOK (UNCHANGED) ---

// Custom styled component for the rounded text input (YEAR)
const CustomTextField = styled(TextField)(({ theme }) => ({
    '& .MuiInputBase-root': {
        borderRadius: '8px',
        height: '40px',
        // Default (Active) Styles
        backgroundColor: '#FFFFFF', 
        color: '#F57F17',
        border: '1px solid #F57F17',
        width: '140px',
    },
    // 🛑 FIX: Remove the internal MUI outline (fieldset/notchedOutline) entirely
    '& .MuiOutlinedInput-notchedOutline': {
        border: 'none', 
    },
    
    // 🟢 Disabled styles for the input field with #9E9E9E
    '& .Mui-disabled': {
        // Target the root when disabled
        '&.MuiInputBase-root': {
            backgroundColor: '#FFFFFF',
            border: '1px solid #9E9E9E', // Primary Grey outline (single outline)
            cursor: 'not-allowed',
        },
        // Target the input element when disabled
        '& .MuiInputBase-input': {
            color: '#9E9E9E', // Grey text
        },
    },
    // Allows typing and controls text appearance
    '& .MuiInputBase-input': {
        padding: '0 8px',
        boxSizing: 'border-box',
        color: '#F57F17',
        textAlign: 'center',
    },
    // Style for the default placeholder text
    '& .MuiInputBase-input::placeholder': {
        color: '#F57F17',
        opacity: 1,
    },
}));

// Custom styled component for the Select (Dropdown) button with the orange style
const OrangeSelectButton = styled(Button)(({ theme }) => ({
    height: '40px',
    minWidth: '160px',
    textTransform: 'none',
    padding: 0,
    borderRadius: '8px',
    // Default (Active) Styles
    backgroundColor: '#F57F17',
    color: '#FFFFFF',
    '&:hover': {
        backgroundColor: '#E66907',
    },
    // 🟢 Disabled styles for the orange button with #9E9E9E
    '&.Mui-disabled': {
        backgroundColor: '#FFFFFF', // White background
        border: '1px solid #9E9E9E', // Grey outline
        color: '#9E9E9E', 
    },
}));

// Custom styled component for the Select (Dropdown) button with the white style
const WhiteSelectButton = styled(Button)(({ theme }) => ({
    height: '40px',
    minWidth: '160px',
    textTransform: 'none',
    padding: 0,
    borderRadius: '8px',
    // Default (Active) Styles
    backgroundColor: '#FFFFFF',
    color: '#F57F17',
    border: '1px solid #F57F17',
    '&:hover': {
        backgroundColor: '#F0F0F0',
    },
    // 🟢 Disabled styles for the white button with #9E9E9E
    '&.Mui-disabled': {
        backgroundColor: '#FFFFFF', // White background
        border: '1px solid #9E9E9E', // Grey outline
        color: '#9E9E9E', 
    },
}));

// Custom styling for the Switch component to place the toggle on the left
const LeftSwitch = styled(Switch)(({ theme }) => ({
    padding: 8,
    '& .MuiSwitch-switchBase': {
        padding: 10, 
        // 1. Checked (ON state) styles
        '&.Mui-checked': {
            color: '#FFFFFF', // Ensures thumb is white
            // 🛑 FIX: Changed transform from 'translateX(16px)' to 'translateX(24px)' for correct visual placement
            transform: 'translateX(20px)', 
            '& + .MuiSwitch-track': {
                // Track color when checked (ON state)
                backgroundColor: '#97BE98',
                opacity: 1,
                border: 0,
            },
            '& .MuiSwitch-thumb': {
                // Thumb color when checked (ON state)
                backgroundColor: '#2E7D32',
            }
        },
    },
    '& .MuiSwitch-track': {
        borderRadius: 22 / 2,
        // Default (OFF state) track color
        backgroundColor: '#E0E0E0', 
    },
    '& .MuiSwitch-thumb': {
        width: 16,
        height: 16,
        // Default (OFF state) thumb color
        backgroundColor: '#9E9E9E',
    },
}));


function CreateFilterToolbar({ selectedQuestions, gapSpacing = 4 }) { 
    
    // --- STATE PLACEHOLDERS (UNCHANGED) ---
    const [isGrouped, setIsGrouped] = useState(false);
    const [assessmentType, setAssessmentType] = useState('');
    const [semester, setSemester] = useState('');
    const [year, setYear] = useState('');

    // --- LOGIC (UNCHANGED) ---
    
    // Corrected Toggle Logic
    useEffect(() => {
        // If no questions are selected, the toggle should be off by default.
        if (!selectedQuestions || selectedQuestions.length === 0) {
            setIsGrouped(false);
            return;
        }

        const isUniformAndNotEmpty = (questions) => {
            const firstQ = questions[0];
            
            // Check if ALL fields are empty/null (the exception case)
            if (!firstQ.assessment_type && !firstQ.semester && !firstQ.year) {
                // If the first one is empty, check if ALL are empty.
                const allEmpty = questions.every(q => 
                    !q.assessment_type && !q.semester && !q.year
                );
                // If all are empty, they are technically uniform, but we want the toggle OFF.
                return false; 
            }

            // Check for strict uniformity (all must match and be NON-EMPTY)
            return questions.every(q => 
                q.assessment_type === firstQ.assessment_type && 
                q.semester === firstQ.semester && 
                q.year === firstQ.year &&
                // Enforce that all fields are NOT empty/null for grouping to be enabled
                q.assessment_type && q.semester && q.year 
            );
        };
        
        setIsGrouped(isUniformAndNotEmpty(selectedQuestions));
    }, [selectedQuestions]);

    const handleToggle = (event) => {
        setIsGrouped(event.target.checked);
    };

    const handleAssessmentChange = (event) => {
        setAssessmentType(event.target.value);
    };
    
    const handleSemesterChange = (event) => {
        setSemester(event.target.value);
    };

    const handleYearChange = (event) => {
        const value = event.target.value;
        if (/^\d*$/.test(value) && value.length <= 4) {
            setYear(value);
        }
    };

    // Component to render the content inside the Orange Select Button (UNCHANGED)
    const OrangeSelectContent = ({ text, isDisabled }) => (
        <Stack 
            direction="row" 
            alignItems="center" 
            justifyContent="space-between"
            sx={{ 
                width: '100%', 
                height: '100%', 
                px: 1
            }} 
        >
            <Typography 
                variant="button" 
                sx={{ 
                    color: isDisabled ? '#9E9E9E' : '#FFFFFF' 
                }}
            >
                {text}
            </Typography>
            <Divider 
                orientation="vertical" 
                sx={{ 
                    backgroundColor: isDisabled ? '#9E9E9E' : '#F9A825', 
                    width: '2px',
                    height: '100%', 
                    mx: '8px', 
                }} 
            />
            <KeyboardArrowDownIcon sx={{ color: isDisabled ? '#9E9E9E' : '#FFFFFF' }} /> 
        </Stack>
    );

    // Component to render the content inside the White Select Button (UNCHANGED)
    const WhiteSelectContent = ({ text, isDisabled }) => (
        <Stack 
            direction="row" 
            alignItems="center" 
            justifyContent="space-between"
            sx={{ 
                width: '100%', 
                height: '100%', 
                px: 1
            }} 
        >
            <Typography 
                variant="button" 
                sx={{ 
                    color: isDisabled ? '#9E9E9E' : '#F57F17' 
                }}
            >
                {text}
            </Typography>
            <KeyboardArrowDownIcon sx={{ color: isDisabled ? '#9E9E9E' : '#F57F17' }} /> 
        </Stack>
    );

    // --- RENDERING ---
    // The disabled state is determined by the inverse of isGrouped (!isGrouped)
    const filterControlsDisabled = !isGrouped;

    return (
        <Box sx={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            py: 2,
            pl: 6, // Intentional left gap (modify 3 to match desired alignment)
            pr: 2, // Added right padding for balance
            backgroundColor: '#FFFFFF', 
            borderRadius: '12px',
            border: 'none', 
        }}>

            {/* 1. TOGGLE SWITCH */}
            <FormControlLabel
                control={
                    <LeftSwitch
                        checked={isGrouped}
                        onChange={handleToggle}
                        name="group-toggle"
                    />
                }
                labelPlacement="start" 
                label={
                    <Typography 
                        variant="body1" 
                        sx={{ 
                            fontWeight: 'bold', 
                            color: '#F57F17' 
                        }}
                    >
                        Grouped Assessment Question
                    </Typography>
                }
                // 🟢 FIX: Apply gapSpacing as right margin (mr) to space it from the next element
                sx={{ m: 0, mr: gapSpacing }} 
            />
            
            {/* 2. ASSESSMENT TYPE DROPDOWN (Orange Button) */}
            <Select
                value={assessmentType}
                onChange={handleAssessmentChange}
                displayEmpty
                IconComponent={() => null} 
                input={<InputBase />} 
                disabled={filterControlsDisabled} 
                renderValue={(selected) => {
                    const text = selected.length === 0 ? "ASSESSMENT TYPE" : selected;
                    return (
                        <OrangeSelectButton variant="contained" disabled={filterControlsDisabled}>
                            <OrangeSelectContent text={text} isDisabled={filterControlsDisabled} />
                        </OrangeSelectButton>
                    );
                }}
                MenuProps={{
                    PaperProps: { sx: { borderRadius: '8px', mt: 1, } },
                    anchorOrigin: { vertical: 'bottom', horizontal: 'left', },
                    transformOrigin: { vertical: 'top', horizontal: 'left', },
                }}
                sx={{
                    '& .MuiSelect-select': { p: 0 },
                    '& fieldset': { border: 'none' },
                    // 🟢 FIX: Added a small margin to space it from the Year input
                    mr: 2,
                }}
            >
                {["Assignment", "Final", "Midterms", "Quiz"].map((option) => (
                    <MenuItem 
                        key={option} 
                        value={option}
                        sx={{ 
                            color: '#212121', 
                            '&.Mui-selected': { backgroundColor: '#212121', color: '#FFFFFF', },
                            '&:hover': { backgroundColor: '#E0E0E0', }
                        }}
                    >
                        {option}
                    </MenuItem>
                ))}
            </Select>
            
            {/* 3. YEAR TEXT INPUT FIELD (Orange Outline) */}
            <CustomTextField
                placeholder="YEAR (YYYY)"
                value={year}
                onChange={handleYearChange}
                variant="outlined"
                disabled={filterControlsDisabled} 
                inputProps={{ 
                    maxLength: 4, 
                    inputMode: 'numeric', 
                }}
                InputProps={{
                    sx: {
                        '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                            borderColor: '#F57F17', 
                            borderWidth: '1px',
                        },
                    }
                }}
                // 🟢 FIX: Apply gapSpacing as right margin (mr) to control gap with SEMESTER
                sx={{ mr: gapSpacing }}
            />

            {/* 4. SEMESTER DROPDOWN (White Button) */}
            <Select
                value={semester}
                onChange={handleSemesterChange}
                displayEmpty
                IconComponent={() => null} 
                input={<InputBase />} 
                disabled={filterControlsDisabled}
                renderValue={(selected) => {
                    const text = selected.length === 0 ? "SEMESTER" : selected;
                    return (
                        <WhiteSelectButton variant="outlined" disabled={filterControlsDisabled}>
                            <WhiteSelectContent text={text} isDisabled={filterControlsDisabled} />
                        </WhiteSelectButton>
                    );
                }}
                MenuProps={{
                    PaperProps: { sx: { borderRadius: '8px', mt: 1, } },
                    anchorOrigin: { vertical: 'bottom', horizontal: 'left', },
                    transformOrigin: { vertical: 'top', horizontal: 'left', },
                }}
                sx={{
                    '& .MuiSelect-select': { p: 0 },
                    '& fieldset': { border: 'none' },
                }}
            >
                {["SEM 1", "SEM 2"].map((option) => (
                    <MenuItem 
                        key={option} 
                        value={option}
                        sx={{ 
                            color: '#212121', 
                            '&.Mui-selected': { backgroundColor: '#212121', color: '#FFFFFF', },
                            '&:hover': { backgroundColor: '#E0E0E0', }
                        }}
                    >
                        {option}
                    </MenuItem>
                ))}
            </Select>
            
        </Box>
    );
}

export default CreateFilterToolbar;