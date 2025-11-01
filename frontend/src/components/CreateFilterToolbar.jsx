import React, { useState, useEffect, useImperativeHandle, forwardRef, useMemo } from 'react';
import {
    Box,
    Button,
    Typography,
    Switch,
    FormControlLabel,
    TextField,
    MenuItem,
    Select,
    InputBase,
    Stack,
    Divider,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import AddIcon from '@mui/icons-material/Add'; 

// --- ASSESSMENT TYPE MAPPING (UNCHANGED) ---
const ASSESSMENT_TYPE_MAP = {
    "Quiz": 'quiz',
    "Midterms": 'midterm',
    "Final": 'final',
    "Assignment": 'assessment', // Based on SQL schema: 'assessment'
    "Project": 'project',
    "Others": 'others',
    // Reverse map for displaying the current selection back in the dropdown UI
    'quiz': "Quiz",
    'midterm': "Midterms",
    'final': "Final",
    'assessment': "Assignment",
    'project': "Project",
    'others': "Others",
};

// --- STYLED COMPONENTS (UNCHANGED) ---
const CustomTextField = styled(TextField)(({ theme }) => ({
    '& .MuiInputBase-root': {
        borderRadius: '8px',
        height: '40px',
        backgroundColor: '#FFFFFF', 
        color: '#F57F17',
        border: '1px solid #F57F17',
        width: '140px',
    },
    '& .MuiOutlinedInput-notchedOutline': { border: 'none' },
    '& .Mui-disabled': {
        '&.MuiInputBase-root': { backgroundColor: '#FFFFFF', border: '1px solid #9E9E9E', cursor: 'not-allowed' },
        '& .MuiInputBase-input': { color: '#9E9E9E' },
    },
    '& .MuiInputBase-input': { padding: '0 8px', boxSizing: 'border-box', color: '#F57F17', textAlign: 'center' },
    '& .MuiInputBase-input::placeholder': { color: '#F57F17', opacity: 1 },
}));

const OrangeSelectButton = styled(Button)(({ theme }) => ({
    height: '40px', 
    minWidth: 'auto', 
    textTransform: 'none', 
    padding: 0, 
    borderRadius: '8px',
    backgroundColor: '#F57F17', 
    color: '#FFFFFF',
    boxSizing: 'border-box', 
    '&:hover': { backgroundColor: '#E66907' },
    '&.Mui-disabled': { backgroundColor: '#FFFFFF', border: '1px solid #9E9E9E', color: '#9E9E9E' },
}));

const WhiteSelectButton = styled(Button)(({ theme }) => ({
    height: '40px', 
    minWidth: 'auto', 
    textTransform: 'none', 
    padding: 0, 
    borderRadius: '8px',
    backgroundColor: '#FFFFFF', color: '#F57F17', border: '1px solid #F57F17',
    boxSizing: 'border-box', 
    '&:hover': { backgroundColor: '#F0F0F0' },
    '&.Mui-disabled': { backgroundColor: '#FFFFFF', border: '1px solid #9E9E9E', color: '#9E9E9E' },
}));

const LeftSwitch = styled(Switch)(({ theme }) => ({
    padding: 8,
    '& .MuiSwitch-switchBase': {
        padding: 10,
        '&.Mui-checked': {
            color: '#FFFFFF',
            transform: 'translateX(20px)',
            '& + .MuiSwitch-track': { backgroundColor: '#97BE98', opacity: 1, border: 0 },
            '& .MuiSwitch-thumb': { backgroundColor: '#2E7D32' },
        },
    },
    '& .MuiSwitch-track': { borderRadius: 22 / 2, backgroundColor: '#E0E0E0' },
    '& .MuiSwitch-thumb': { width: 16, height: 16, backgroundColor: '#9E9E9E' },
}));

// --- COMPONENT ---
const CreateFilterToolbar = forwardRef(({ selectedQuestions, gapSpacing = 4, isEditMode = false, assessmentMetadata, onAssessmentMetadataChange, onToggleGroupedAssessment }, ref) => { 
    
    // Initialize state to use null/empty string as needed for database/display
    // NOTE: assessmentType stores the SQL key (e.g., 'quiz', 'others')
    const [isGrouped, setIsGrouped] = useState(false);
    const [assessmentType, setAssessmentType] = useState(''); 
    const [semester, setSemester] = useState('');
    const [year, setYear] = useState('');
    const [course, setCourse] = useState(''); 
    
    // 🎯 NEW LOCAL STATES FOR ADD COURSE LOGIC 
    const [isAddingNewCourse, setIsAddingNewCourse] = useState(false);
    const [newCourseInput, setNewCourseInput] = useState('');
    const [localNewCourses, setLocalNewCourses] = useState([]); 

    // Local store of the modified filters
    const [modifiedFilters, setModifiedFilters] = useState({});

    // 🎯 LOGIC: Determine available courses based on mode and current questions + local additions
    const availableCourses = useMemo(() => {
        const courses = new Set();

        // 1. Add existing courses (only if in Edit Mode)
        if (isEditMode && selectedQuestions && selectedQuestions.length > 0) {
            selectedQuestions.forEach(q => {
                if (q.course) {
                    courses.add(q.course);
                }
            });
        }
        
        // 2. Add locally created courses
        localNewCourses.forEach(c => courses.add(c));
        
        return Array.from(courses).sort();
    }, [selectedQuestions, isEditMode, localNewCourses]);


    // ✅ CRITICAL FIX: Logic to check uniformity and auto-toggle 'isGrouped' and set local state
    // This hook needs to be robust against initial load and prop changes
    useEffect(() => {
        
        if (!isEditMode || !selectedQuestions || selectedQuestions.length === 0) {
              // Ensure consistent cleanup when not in Edit Mode or when selection is empty
              setIsGrouped(false);
              setAssessmentType(''); setSemester(''); setYear(''); setCourse('');
              return;
        }

        const isUniformAndNotEmpty = (questions) => {
              const firstQ = questions[0];
              // Normalize null values to empty string for consistent comparison
              const firstAssessmentType = firstQ.assessment_type || '';
              const firstSemester = firstQ.semester || '';
              const firstYear = firstQ.year || '';
              const firstCourse = firstQ.course || '';
              
              if (!firstAssessmentType && !firstSemester && !firstYear && !firstCourse) return false;

              const isUniform = questions.every(q => 
                  (q.assessment_type || '') === firstAssessmentType &&
                  (q.semester || '') === firstSemester &&
                  (q.year || '') === firstYear &&
                  (q.course || '') === firstCourse
              );
              
              return isUniform;
        };
        
        const uniform = isUniformAndNotEmpty(selectedQuestions);

        if (uniform) {
            const firstQ = selectedQuestions[0];
            
            // 1. Set internal state to ON
            setIsGrouped(true);
            
            // 2. ✅ FIX: Set local state variables for DISPLAY/INPUT to the uniform values
            // This ensures the input controls reflect the loaded data immediately
            setAssessmentType(firstQ.assessment_type || ''); // SQL key
            setSemester(firstQ.semester || '');
            setYear(firstQ.year || '');
            setCourse(firstQ.course || '');
            
            // 3. Propagate the ON state change to the parent (EditPage)
            if (onToggleGroupedAssessment) {
                 onToggleGroupedAssessment(true);
            }
        } else {
             // If not uniform, ensure toggle is OFF and clear local inputs for a fresh start
             setIsGrouped(false);
             setAssessmentType(''); setSemester(''); setYear(''); setCourse('');
             if (onToggleGroupedAssessment) {
                 onToggleGroupedAssessment(false);
             }
        }
    }, [selectedQuestions, isEditMode]); // Triggered when selections change in EditPage

    // Update modifiedFilters whenever any of the fields change
    useEffect(() => {
        // This hook runs on ANY local state change (assessmentType, year, semester, course)
        
        const toNullIfEmpty = (value) => (value === '' ? null : value);
        
        setModifiedFilters({
            assessment_type: toNullIfEmpty(assessmentType), 
            course: toNullIfEmpty(course),
            year: toNullIfEmpty(year),
            semester: toNullIfEmpty(semester),
        });
        
        // Inform the parent component (EditPage) about the raw input state change
        // This is necessary for EditPage to stamp the current filter settings onto
        // every single question object in its state array when the user manually changes a filter value.
        if (onAssessmentMetadataChange) {
            onAssessmentMetadataChange('assessment_type', assessmentType);
            onAssessmentMetadataChange('course', course);
            onAssessmentMetadataChange('year', year);
            onAssessmentMetadataChange('semester', semester);
        }

    }, [assessmentType, year, semester, course, onAssessmentMetadataChange]); 

    // --- HANDLERS ---
    
    // 🎯 HANDLER: Triggered when "Add New Course" menu item is clicked
    const handleCourseDropdownChange = (event) => {
        const newCourse = event.target.value;
        
        if (newCourse === 'ADD_NEW_COURSE_TRIGGER') {
            setIsAddingNewCourse(true); 
            setNewCourseInput(''); 
        } else {
            setIsAddingNewCourse(false);
            setCourse(newCourse); // Set the selected course
        }
    };
    
    // 🎯 HANDLER: Triggered when the user submits the new course name
    const handleNewCourseSubmit = () => {
        const courseToCreate = newCourseInput.trim();
        if (courseToCreate) {
            if (!availableCourses.includes(courseToCreate)) {
                setLocalNewCourses(prevCourses => [...prevCourses, courseToCreate]);
            }
            setCourse(courseToCreate);
        }
        
        setIsAddingNewCourse(false);
        setNewCourseInput('');
    };

    const handleToggle = (event) => {
        const newIsGrouped = event.target.checked;
        setIsGrouped(newIsGrouped);
        
        if (onToggleGroupedAssessment) {
            onToggleGroupedAssessment(newIsGrouped);
        }
        
        if (!newIsGrouped) {
            // Resetting assessment type to the mandatory SQL key 'others'
            setAssessmentType('others'); 
            setCourse('');         
            setYear('');           
            setSemester('');       
        } 
    };

    // ✅ MODIFICATION: Maps the DISPLAY NAME to the SQL KEY
    const handleAssessmentChange = (event) => {
        const displayValue = event.target.value;
        // Lookup the SQL key (e.g., 'quiz' for "Quiz")
        const sqlKey = ASSESSMENT_TYPE_MAP[displayValue] || displayValue; 
        setAssessmentType(sqlKey);
    };

    const handleSemesterChange = (event) => setSemester(event.target.value);
    const handleYearChange = (event) => {
        const value = event.target.value;
        if (/^\d*$/.test(value) && value.length <= 4) setYear(value);
    };
    
    // Expose a method to parent to get current filters
    useImperativeHandle(ref, () => ({
        getModifiedFilters: () => {
            const toNullIfEmpty = (value) => (value === '' ? null : value);
            return {
                assessment_type: toNullIfEmpty(assessmentType), 
                year: toNullIfEmpty(year),
                semester: toNullIfEmpty(semester),
                course: toNullIfEmpty(course),
            };
        }
    }));

    // --- RENDER CONTENT ---
    const OrangeSelectContent = ({ text, isDisabled }) => (
        <Stack 
            direction="row" 
            alignItems="center" 
            justifyContent="space-between" 
            sx={{ width: '100%', height: '100%', pl: '16px', pr: '8px' }} 
        >
            <Typography variant="button" sx={{ color: isDisabled ? '#9E9E9E' : '#FFFFFF' }}>{text}</Typography>
            <Divider orientation="vertical" sx={{ backgroundColor: isDisabled ? '#9E9E9E' : '#F9A825', width: '2px', height: '100%', mx: '8px' }} />
            <KeyboardArrowDownIcon sx={{ color: isDisabled ? '#9E9E9E' : '#FFFFFF', ml: '-4px' }} /> 
        </Stack>
    );

    const WhiteSelectContent = ({ text, isDisabled }) => (
        <Stack 
            direction="row" 
            alignItems="center" 
            justifyContent="space-between" 
            sx={{ width: '100%', height: '100%', pl: '16px', pr: '8px' }}
        >
            <Typography variant="button" sx={{ color: isDisabled ? '#9E9E9E' : '#F57F17' }}>{text}</Typography>
            <KeyboardArrowDownIcon sx={{ color: isDisabled ? '#9E9E9E' : '#F57F17', ml: '8px' }} /> 
        </Stack>
    );

    const filterControlsDisabled = !isGrouped;
    
    // ✅ MODIFICATION: Create an array of display names for the dropdown
    const assessmentDisplayNames = [
        "Assignment", "Final", "Midterms", "Quiz", "Project", "Others"
    ];

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', }}> 
            
            {/* 🎯 NEW: Conditional Input Field and Buttons for Adding Course */}
            {isAddingNewCourse && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2, ml: 6 }}>
                    <TextField
                        size="small"
                        placeholder="Enter new Course name (e.g., DSA3101)"
                        value={newCourseInput}
                        onChange={(e) => setNewCourseInput(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                handleNewCourseSubmit();
                            }
                        }}
                        sx={{ width: 250, backgroundColor: '#F5F5F5', borderRadius: '4px' }}
                    />
                    <Button variant="contained" size="small" onClick={handleNewCourseSubmit} disabled={!newCourseInput.trim()}>
                        Create & Select
                    </Button>
                    <Button variant="outlined" size="small" onClick={() => setIsAddingNewCourse(false)}>
                        Cancel
                    </Button>
                </Box>
            )}
            
            <Box sx={{ display: 'flex', flexDirection: 'row', alignItems: 'center', py: 2, pl: 6, pr: 2, backgroundColor: '#FFFFFF', borderRadius: '12px', border: 'none' }}>
                <FormControlLabel
                    control={<LeftSwitch checked={isGrouped} onChange={handleToggle} name="group-toggle" />}
                    labelPlacement="start"
                    label={<Typography variant="body1" sx={{ fontWeight: 'bold', color: '#F57F17' }}>Grouped Assessment Question</Typography>}
                    sx={{ m: 0, mr: gapSpacing }}
                />

                {/* 1. ASSESSMENT TYPE DROPDOWN (Orange Button) */}
                <Select
                    // MODIFICATION: Display the User-Friendly name based on the SQL key state
                    // We must convert the SQL key (assessmentType) back to the Display Name for the UI value property
                    value={assessmentType === null || assessmentType === '' ? '' : (ASSESSMENT_TYPE_MAP[assessmentType] || assessmentType)} 
                    onChange={handleAssessmentChange}
                    displayEmpty
                    IconComponent={() => null} 
                    input={<InputBase />} 
                    disabled={filterControlsDisabled}
                    renderValue={(selectedDisplayValue) => {
                        // The selectedDisplayValue is the actual state value (e.g., 'quiz' or 'Midterms')
                        // If it's a SQL key, we look up the Display name for the button text
                        const buttonText = ASSESSMENT_TYPE_MAP[selectedDisplayValue] || selectedDisplayValue;
                        const text = buttonText === '' || buttonText === null ? "ASSESSMENT TYPE" : buttonText;
                        return <OrangeSelectButton variant="contained" disabled={filterControlsDisabled}><OrangeSelectContent text={text} isDisabled={filterControlsDisabled} /></OrangeSelectButton>;
                    }}
                    MenuProps={{ PaperProps: { sx: { borderRadius: '8px', mt: 1 } }, anchorOrigin: { vertical: 'bottom', horizontal: 'left' }, transformOrigin: { vertical: 'top', horizontal: 'left' } }}
                    sx={{ m: 0, '& .MuiSelect-select': { p: 0 }, '& fieldset': { border: 'none' }, mr: 2 }}
                >
                    {/* MODIFICATION: Render using Display Names */}
                    {assessmentDisplayNames.map(option => (
                        <MenuItem 
                            key={option} 
                            value={option} // Pass the DISPLAY NAME as the value for the onChange handler
                            sx={{ color: '#212121', '&.Mui-selected': { backgroundColor: '#212121', color: '#FFFFFF' }, '&:hover': { backgroundColor: '#E0E0E0' } }}
                        >
                            {option}
                        </MenuItem>
                    ))}
                </Select>
                
                {/* 2. COURSE DROPDOWN (Orange Button) */}
                <Select
                    value={course === null ? '' : course} // If null, display empty string
                    onChange={handleCourseDropdownChange}
                    displayEmpty
                    IconComponent={() => null} 
                    input={<InputBase />} 
                    disabled={filterControlsDisabled}
                    renderValue={(selected) => {
                        const text = selected === '' || selected === null ? "COURSE" : selected; 
                        return <OrangeSelectButton variant="contained" disabled={filterControlsDisabled} sx={{ width: '100%' }}><OrangeSelectContent text={text} isDisabled={filterControlsDisabled} /></OrangeSelectButton>;
                    }}
                    MenuProps={{ PaperProps: { sx: { borderRadius: '8px', mt: 1 } }, anchorOrigin: { vertical: 'bottom', horizontal: 'left' }, transformOrigin: { vertical: 'top', horizontal: 'left' } }}
                    sx={{ m: 0, '& .MuiSelect-select': { p: 0 }, '& fieldset': { border: 'none' } }}
                >
                    {/* Dynamic Options: Shows existing courses in Edit Mode, empty list in Create Mode */}
                    {availableCourses.map((option) => (
                        <MenuItem key={option} value={option} sx={{ color: '#212121', '&.Mui-selected': { backgroundColor: '#212121', color: '#FFFFFF' }, '&:hover': { backgroundColor: '#E0E0E0' } }}>
                            {option}
                        </MenuItem>
                    ))}
                    
                    {/* PERMANENT: Add New Course Option */}
                    <Divider sx={{ my: 0.5 }} />
                    
                    <MenuItem 
                        value="ADD_NEW_COURSE_TRIGGER" 
                        sx={{ color: '#007bff' }}
                    >
                        <AddIcon fontSize="small" sx={{ mr: 1 }} />
                        Add New Course
                    </MenuItem>
                    
                </Select>

                {/* 3. YEAR TEXT INPUT FIELD (Orange Outline) */}
                <CustomTextField
                    placeholder="YEAR (YYYY)"
                    // Show empty string if null, which happens when disabled
                    value={year === null ? '' : year} 
                    onChange={handleYearChange}
                    variant="outlined"
                    disabled={filterControlsDisabled} 
                    inputProps={{ maxLength: 4, inputMode: 'numeric' }}
                    InputProps={{ sx: { '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#F57F17', borderWidth: '1px' } } }}
                    sx={{ ml: 2, mr: gapSpacing }} 
                />

                {/* 4. SEMESTER DROPDOWN (White Button) */}
                <Select
                    value={semester === null ? '' : semester} // If null, display empty string
                    onChange={handleSemesterChange}
                    displayEmpty
                    IconComponent={() => null} 
                    input={<InputBase />} 
                    disabled={filterControlsDisabled}
                    renderValue={(selected) => {
                        const text = selected === '' || selected === null ? "SEMESTER" : selected;
                        return <WhiteSelectButton variant="outlined" disabled={filterControlsDisabled}><WhiteSelectContent text={text} isDisabled={filterControlsDisabled} /></WhiteSelectButton>;
                    }}
                    MenuProps={{ PaperProps: { sx: { borderRadius: '8px', mt: 1 } }, anchorOrigin: { vertical: 'bottom', horizontal: 'left' }, transformOrigin: { vertical: 'top', horizontal: 'left' } }}
                    sx={{ '& .MuiSelect-select': { p: 0 }, '& fieldset': { border: 'none' } }}
                >
                    {["Semester 1", "Semester 2", "Special Term 1", "Special Term 2"].map(option => (
                        <MenuItem key={option} value={option} sx={{ color: '#212121', '&.Mui-selected': { backgroundColor: '#212121', color: '#FFFFFF' }, '&:hover': { backgroundColor: '#E0E0E0' } }}>{option}</MenuItem>
                    ))}
                </Select>
            </Box>
        </Box>
    );
});

export default CreateFilterToolbar;