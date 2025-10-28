// src/components/EditQuestionForm.jsx
import React, { useMemo, useState } from 'react'; // 1. ADD useState
import { 
    Box, Card, CardContent, Grid, Select, MenuItem, 
    FormControl, Typography, TextField, 
    Switch, Button, IconButton, Radio, RadioGroup, FormControlLabel, Checkbox,
    Divider, InputBase 
} from '@mui/material';
// --- NEW ICON IMPORTS ---
import MoreVertIcon from '@mui/icons-material/MoreVert';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import ListIcon from '@mui/icons-material/List'; 
import HelpCenterIcon from '@mui/icons-material/HelpCenter'; 
// Icons for Question Types
import EditNoteIcon from '@mui/icons-material/EditNote'; 
import RadioButtonCheckedIcon from '@mui/icons-material/RadioButtonChecked'; 
import CheckBoxIcon from '@mui/icons-material/CheckBox'; 
import CodeIcon from '@mui/icons-material/Code'; 
import QuestionMarkIcon from '@mui/icons-material/QuestionMark'; 
// --- NEW IMAGE IMPORT ---
import PlaceholderImage from '../../Placeholder_image.png';
// --- Shared Field Styling (New Helper Object for Points 3 & 4) ---
const INVISIBLE_TEXTFIELD_STYLE = {
    // 4. Background box color is grey (#F5F5F5) and remove the outline.
    backgroundColor: '#F5F5F5',
    borderRadius: '4px',
    
    // MUI TextField style overrides to remove outline and change placeholder color
    '& .MuiOutlinedInput-notchedOutline': { 
        border: 'none', // Remove outline
    },
    '& .MuiInputBase-input::placeholder': {
        // 4. Default text color is grey (#3C3B3B)
        color: '#3C3B3B',
        opacity: 1, // Ensures custom color is visible
    },
    // Set text color to black (or default)
    '& .MuiInputBase-input': {
        color: '#3C3B3B',
    }
};
/**
 * Renders a single question editing form with dynamic answer options.
 */
// 2. MODIFIED PROP LIST: Added conceptTags prop. Replace dummyTags with actual prop later.
function EditQuestionForm({ questionNumber, question, onQuestionChange, optionWidth = 730, conceptTags = ['Data Structures', 'Algorithms', 'Operating Systems', 'Networking'] }) { 
    // --- LOCAL STATE FOR POINT 1 ---
    const [isAddingNewTag, setIsAddingNewTag] = useState(false);
    const [newTagInput, setNewTagInput] = useState('');
    // NEW STATE: Maintain local list of tags to allow adding new ones.
    const [localConceptTags, setLocalConceptTags] = useState(conceptTags);
    // --- CONSTANTS ---
    const QUESTION_TYPES = {
        OPEN_ENDED: 'OPEN-ENDED',
        CODING: 'CODING', 
        OTHERS: 'others', 
        MULTIPLE_CHOICE: 'MCQ',
        MRQ: 'MRQ',
        DEFAULT: 'TYPE_DEFAULT', 
    };
    const BLACK_ICON_COLOR = '#1F1F1F';
    const REQUIRED_TEXT_COLOR = '#3C3B3B'; 
    const RED_ASTERISK_COLOR = '#FF1744'; 
    const BLUE_ACCENT_COLOR = '#007bff'; 
    const RED_DELETE_ICON_COLOR = '#D50000'; 
    // 🟢 2. Default options structure if missing - **Set to 4 options by default**
    // FIX: Ensure 'text' is an empty string to show placeholder, not the placeholder text itself.
    const defaultOptions = [
        { id: 'opt1', text: "", isCorrect: false, label: 'A' }, 
        { id: 'opt2', text: "", isCorrect: false, label: 'B' }, 
        { id: 'opt3', text: "", isCorrect: false, label: 'C' }, 
        { id: 'opt4', text: "", isCorrect: false, label: 'D' }, 
    ];
    // --- LOCAL-ONLY UPPERCASE NORMALIZATION ---
    const normalizedQuestionType = useMemo(() => {
        const type = question.question_type;
        if (!type) return QUESTION_TYPES.DEFAULT;
        if (type.toLowerCase() === 'others') return QUESTION_TYPES.OTHERS; 
        return type.toUpperCase();
    }, [question.question_type]);
    
    // --- HELPER FUNCTION: Parse API answer string into an array of correct labels ---
    const parseApiAnswerLabels = (answerString) => {
        if (typeof answerString !== 'string' || !answerString) {
            return [];
        }
        // Use a Regex to find all Capital Letters followed by a period and space (e.g., "A. ", "B. ")
        // This handles cases like: "A. True", "C. False", or potentially combined answers in MRQ if provided
        // in a non-standard way, though typically MRQ should be an array or comma-separated list of labels.
        
        // Since the prompt states "question_answer": "A. True" or "question_answer": "C. ...", and you need to consider MRQ:
        // Let's extract all leading capital letters followed by a period/space, and use the existing `question.answer` logic.
        
        // For the purposes of mapping the UI based on the API response:
        // If the API gives a string like "A. Text", extract 'A'. 
        // If it was meant to support multiple, the format should be different, but sticking to the example:
        const matches = answerString.match(/[A-Z]\./g);
        if (matches) {
            // Extract just the letters
            return matches.map(match => match.replace('.', '').trim());
        }
        // Fallback: Check if the answer itself is a single label (e.g. 'A')
        if (answerString.length === 1 && /[A-Z]/.test(answerString)) {
            return [answerString];
        }
        return [];
    };
    
    // 3. NEW MEMO: Normalize API data (question_options and answer) into a uniform options array
    const normalizedOptions = useMemo(() => {
        const type = normalizedQuestionType;
        const apiOptions = question.question_options || [];
        // Use `question.question_answer` from the API for the correctness logic
        const apiAnswerLabels = parseApiAnswerLabels(question.question_answer); 
        if (type !== QUESTION_TYPES.MULTIPLE_CHOICE && type !== QUESTION_TYPES.MRQ) {
            return [];
        }
        
        // 1. If local state (question.options) is available, prioritize it (it's the actively edited state).
        // NOTE: This check is what was causing the stale data, as when the variant was changed, 
        // question.options (if cleared by the type change handler) would be empty, forcing a re-run of this memo.
        // The fix is to ensure the type change handler explicitly sets question.options to the empty-string default if needed.
        if (question.options && question.options.length > 0) {
             return question.options;
        }
        // 2. Map API options to the internal structure (using question_options and question_answer)
        const mappedOptions = apiOptions.map((opt) => {
            const label = opt.label;
            const text = opt.text;
            
            // NEW LOGIC: Check correctness against the parsed labels from `Youtube`
            let isCorrect = apiAnswerLabels.includes(label);
            
            // Generate an internal ID, maybe based on label: A=1, B=2, etc. for better tracking
            const id = `opt${label.charCodeAt(0) - 'A'.charCodeAt(0) + 1}`; 
            
            return {
                id,
                label, // Store the original label (A, B, C...)
                text,
                isCorrect,
            };
        });
        
        // 3. Fallback to mapped API data if available, otherwise use default options
        return mappedOptions.length > 0 ? mappedOptions : defaultOptions;
    }, [question.question_options, question.question_answer, normalizedQuestionType, question.options]); // DEPENDENCY CHANGE
    // Helper function to get the correct Icon for the question type
    const getQuestionTypeIcon = (type) => {
        const normalizedType = type === QUESTION_TYPES.OTHERS ? 'OTHERS' : type.toUpperCase();
        
        switch (normalizedType) {
            case QUESTION_TYPES.OPEN_ENDED:
                return <EditNoteIcon sx={{ color: BLACK_ICON_COLOR, mr: 1, fontSize: '1.2rem' }} />;
            case 'CODING': 
                return <CodeIcon sx={{ color: BLACK_ICON_COLOR, mr: 1, fontSize: '1.2rem' }} />; 
            case 'OTHERS': 
                return <QuestionMarkIcon sx={{ color: BLACK_ICON_COLOR, mr: 1, fontSize: '1.2rem' }} />; 
            case QUESTION_TYPES.MULTIPLE_CHOICE:
                return <RadioButtonCheckedIcon sx={{ color: BLACK_ICON_COLOR, mr: 1, fontSize: '1.2rem' }} />;
            case QUESTION_TYPES.MRQ:
                return <CheckBoxIcon sx={{ color: BLACK_ICON_COLOR, mr: 1, fontSize: '1.2rem' }} />;
            default: 
                return null;
        }
    };
    // --- Handlers (Modified for Point 1 Tagging) ---
    const handleTagChange = (event) => {
        const newTag = event.target.value;
        if (newTag === 'NEW_TAG_INPUT_TRIGGER') {
            setIsAddingNewTag(true);
            setNewTagInput('');
        } else {
            setIsAddingNewTag(false);
            onQuestionChange(question.id, 'concept_tag', newTag);
        }
    };
    const handleNewTagSubmit = () => {
        const tagToCreate = newTagInput.trim();
        if (tagToCreate !== '') {
            if (!localConceptTags.includes(tagToCreate)) {
                // SOLUTION: Update the local list of concept tags
                setLocalConceptTags(prevTags => {
                    const newTagsList = [...prevTags, tagToCreate];
                    // Sort the list for clean display, optionally
                    newTagsList.sort(); 
                    return newTagsList;
                });
            }
            
            // Set the current question's tag to the newly created/entered tag
            onQuestionChange(question.id, 'concept_tag', tagToCreate);
        }
        setIsAddingNewTag(false);
        setNewTagInput('');
    };
    // --- Other Handlers (Modified for Option Handling) ---
    const handleTextChange = (event) => {
        onQuestionChange(question.id, 'question_stem', event.target.value); // 3. MODIFIED KEY: Changed 'text' to 'question_stem'
    };
    const handleAnswerChange = (event) => {
        onQuestionChange(question.id, 'answer', event.target.value);
    };
    const handleTypeChange = (event) => {
        const newType = event.target.value;
        const normalizedNewType = newType.toUpperCase();
        
        // FIX: When switching to MCQ/MRQ, we should ensure the local `question.options` is either pre-filled
        // with API data (which `normalizedOptions` provides) OR an empty-text `defaultOptions`.
        if (normalizedNewType === QUESTION_TYPES.MULTIPLE_CHOICE || normalizedNewType === QUESTION_TYPES.MRQ) {
            
            // CRITICAL FIX: To prevent stale data, when switching to MCQ/MRQ,
            // we check if options are non-existent or if the previous type was incompatible (i.e. options should have been cleared).
            // A simple check for existence/length is usually enough if non-MCQ/MRQ clears it.
            if (!question.options || question.options.length === 0 || normalizedQuestionType !== normalizedNewType) {
                 // Use a fresh copy of defaultOptions here to ensure blank text for a new selection.
                 const freshDefaultOptions = [
                     { id: 'opt1', text: "", isCorrect: false, label: 'A' }, 
                     { id: 'opt2', text: "", isCorrect: false, label: 'B' }, 
                     { id: 'opt3', text: "", isCorrect: false, label: 'C' }, 
                     { id: 'opt4', text: "", isCorrect: false, label: 'D' }, 
                 ];
                 onQuestionChange(question.id, 'options', freshDefaultOptions);
            }
        } else {
            // When switching away from MCQ/MRQ, clear options locally if they exist and are not already empty.
            if (question.options && question.options.length > 0) {
                onQuestionChange(question.id, 'options', []);
            }
        }
        // Only update the question_type if a valid type is selected (not the default display option)
        if (newType !== QUESTION_TYPES.DEFAULT) {
            onQuestionChange(question.id, 'question_type', newType);
        }
    };
    const handleOptionTextChange = (optionId, event) => {
        // Use normalizedOptions which includes API pre-fill/local state changes/defaults
        const optionsToUpdate = normalizedOptions;
        const newOptions = optionsToUpdate.map(opt =>
            opt.id === optionId ? { ...opt, text: event.target.value } : opt
        );
        onQuestionChange(question.id, 'options', newOptions);
    };
    const handleOptionCorrectnessToggle = (optionId) => {
        const isMC = normalizedQuestionType === QUESTION_TYPES.MULTIPLE_CHOICE;
        // Use normalizedOptions which includes API pre-fill/local state changes/defaults
        const optionsToUpdate = normalizedOptions;
        // For API questions, map the internal ID back to the API label for the answer field
        const selectedLabel = optionsToUpdate.find(opt => opt.id === optionId)?.label;
        let newOptions;
        let newAnswer = '';
        if (isMC) {
             // For MCQ, only the selected one is correct
             newOptions = optionsToUpdate.map(opt => ({ 
                 ...opt, 
                 isCorrect: opt.id === optionId 
             }));
             newAnswer = selectedLabel; // Set answer to the single correct label
        } else {
             // For MRQ, toggle the selected one
             newOptions = optionsToUpdate.map(opt => 
                 opt.id === optionId ? { ...opt, isCorrect: !opt.isCorrect } : opt
             );
             // Recalculate MRQ answer as an array of correct labels
             newAnswer = newOptions.filter(opt => opt.isCorrect).map(opt => opt.label);
        }
        onQuestionChange(question.id, 'options', newOptions);
        // Note: The `question.answer` field is what's displayed for open-ended, 
        // but for MC/MRQ, the true answer is derived from `options[].isCorrect`. 
        // However, if the backend expects `question.answer` to be updated with the correct label(s), 
        // we'll update it here. For MRQ, this might need to be joined into a string like "A,B".
        onQuestionChange(question.id, 'answer', newAnswer);
    };
    
    const handleNoOp = () => {};
    
    const handleDeleteQuestion = () => {
        console.log(`Deleting question ${question.id}`);
        handleNoOp();
    };
    const handleAddNewOption = () => {
        // Use normalizedOptions which includes API pre-fill/local state changes/defaults
        const optionsToUpdate = normalizedOptions;
        const optionsCount = optionsToUpdate.length;
        
        // Generate the next sequential label (E, F, G...)
        const nextLabelCode = 'A'.charCodeAt(0) + optionsCount;
        const nextLabel = String.fromCharCode(nextLabelCode);
        
        const newOptionId = `opt${optionsCount + 1}-${Date.now()}`; // Unique ID
        const newOption = { 
            id: newOptionId, 
            label: nextLabel, // Set the sequential label
            text: "", 
            isCorrect: false 
        };
        onQuestionChange(question.id, 'options', [...optionsToUpdate, newOption]);
    };
    const handleDeleteOption = (optionId) => {
        // Use normalizedOptions which includes API pre-fill/local state changes/defaults
        const optionsToUpdate = normalizedOptions;
        
        if (optionsToUpdate.length > 1) {
            let newOptions = optionsToUpdate.filter(opt => opt.id !== optionId);
            
            // Re-label the options after deletion
            newOptions = newOptions.map((opt, index) => {
                const newLabel = String.fromCharCode('A'.charCodeAt(0) + index);
                return { ...opt, label: newLabel };
            });
            
            // Recalculate MRQ answer based on the new labels
            const newAnswer = newOptions.filter(opt => opt.isCorrect).map(opt => opt.label);
            
            onQuestionChange(question.id, 'options', newOptions);
            onQuestionChange(question.id, 'answer', newAnswer);
        } else {
            console.log("Cannot delete option: Must have at least one option remaining.");
        }
    };
    
    const handleClearOpenEndedAnswer = () => {
        onQuestionChange(question.id, 'answer', ''); 
    };
    
    // --- Render answer sections (MODIFIED: Use normalizedOptions) ---
    const renderOpenEndedAnswer = () => (
        <Box mt={3}>
            <Typography variant="body1" fontWeight="bold" sx={{ color: REQUIRED_TEXT_COLOR, mb: 1 }}>
                Answer
                <Box component="span" sx={{ color: RED_ASTERISK_COLOR }}>*</Box>
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 1 }}>
                <TextField
                    fullWidth
                    multiline
                    rows={2}
                    variant="outlined"
                    size="small"
                    placeholder="Enter correct answer here (or expected answer format)."
                    value={question.answer || ''}
                    onChange={handleAnswerChange}
                    sx={{ 
                        mr: 1,
                        ...INVISIBLE_TEXTFIELD_STYLE 
                    }}
                />
                <IconButton 
                    size="small" 
                    aria-label="clear answer" 
                    onClick={handleClearOpenEndedAnswer} 
                    sx={{ mt: '4px' }}
                >
                    <DeleteIcon color="error" />
                </IconButton>
            </Box>
        </Box>
    );
    
    const renderCodingAnswer = renderOpenEndedAnswer;
    const renderOthersAnswer = renderOpenEndedAnswer;
    const renderMultipleChoiceAnswers = () => {
        const optionsToRender = normalizedOptions; // USE NORMALIZED/PRE-FILLED OPTIONS
        
        // Find the correct option ID for RadioGroup value
        const correctOptionId = optionsToRender.find(opt => opt.isCorrect)?.id;
        return (
            <Box mt={3}>
                <Typography variant="body1" fontWeight="bold" gutterBottom>
                    Choices
                    <Box component="span" sx={{ color: RED_ASTERISK_COLOR }}>*</Box>
                    {' '} (Select ONE correct answer)
                </Typography>
                <RadioGroup
                    value={correctOptionId || ''} 
                    name={`mc-options-${question.id}`}
                    onChange={(e) => handleOptionCorrectnessToggle(e.target.value)}
                >
                    {optionsToRender.map((option) => (
                        <Box key={option.id} sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                            <FormControlLabel
                                value={option.id}
                                control={<Radio size="small" />}
                                label={
                                    // Wrap the TextField in a Box to display the label (A, B, C...)
                                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                        <Typography variant="body1" sx={{ mr: 1, fontWeight: 'bold' }}>
                                            {option.label}.
                                        </Typography>
                                        <TextField
                                            variant="outlined"
                                            size="small"
                                            value={option.text} // Use the actual text here to pre-fill
                                            placeholder={`Option ${option.label} (Click to Edit)`} 
                                            onChange={(e) => handleOptionTextChange(option.id, e)}
                                            sx={{ 
                                                width: optionWidth, 
                                                ...INVISIBLE_TEXTFIELD_STYLE 
                                            }}
                                        />
                                    </Box>
                                }
                            />
                            <IconButton 
                                size="small" 
                                aria-label="delete option" 
                                sx={{ ml: 1 }}
                                onClick={() => handleDeleteOption(option.id)}
                                disabled={optionsToRender.length <= 1}
                            >
                                <DeleteIcon 
                                    sx={{ color: optionsToRender.length <= 1 ? '#B8B8B8' : RED_DELETE_ICON_COLOR }}
                                /> 
                            </IconButton>
                        </Box>
                    ))}
                </RadioGroup>
                <Button 
                    variant="text" 
                    startIcon={<AddIcon />} 
                    onClick={handleAddNewOption} 
                    sx={{ 
                        mt: 1, 
                        textTransform: 'none', 
                        color: BLUE_ACCENT_COLOR,
                        border: `1px dotted ${BLUE_ACCENT_COLOR}`, 
                        borderRadius: '4px',
                        '&:hover': {
                            backgroundColor: 'rgba(0, 123, 255, 0.04)', 
                        }
                    }}
                >
                    Add Option
                </Button>
            </Box>
        );
    };
    const renderMRQAnswers = () => {
        const optionsToRender = normalizedOptions; // USE NORMALIZED/PRE-FILLED OPTIONS
        return (
            <Box mt={3}>
                <Typography variant="body1" fontWeight="bold" gutterBottom>
                    Choices
                    <Box component="span" sx={{ color: RED_ASTERISK_COLOR }}>*</Box>
                    {' '} (Select ALL correct answers)
                </Typography>
                {optionsToRender.map((option) => (
                    <Box key={option.id} sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <FormControlLabel
                            control={
                                <Checkbox 
                                    size="small" 
                                    checked={!!option.isCorrect} 
                                    onChange={() => handleOptionCorrectnessToggle(option.id)}
                                />
                            }
                            label={
                                // Wrap the TextField in a Box to display the label (A, B, C...)
                                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                    <Typography variant="body1" sx={{ mr: 1, fontWeight: 'bold' }}>
                                        {option.label}.
                                    </Typography>
                                    <TextField
                                        variant="outlined"
                                        size="small"
                                        value={option.text} // Use the actual text here to pre-fill
                                        placeholder={`Option ${option.label} (Click to Edit)`} 
                                        onChange={(e) => handleOptionTextChange(option.id, e)}
                                        sx={{ 
                                            width: optionWidth, 
                                            ...INVISIBLE_TEXTFIELD_STYLE 
                                        }}
                                    />
                                </Box>
                            }
                        />
                        <IconButton 
                            size="small" 
                            aria-label="delete option" 
                            sx={{ ml: 1 }}
                            onClick={() => handleDeleteOption(option.id)}
                            disabled={optionsToRender.length <= 1}
                        >
                            <DeleteIcon 
                                sx={{ color: optionsToRender.length <= 1 ? '#B8B8B8' : RED_DELETE_ICON_COLOR }}
                            />
                        </IconButton>
                    </Box>
                ))}
                <Button 
                    variant="text" 
                    startIcon={<AddIcon />} 
                    onClick={handleAddNewOption} 
                    sx={{ 
                        mt: 1, 
                        textTransform: 'none', 
                        color: BLUE_ACCENT_COLOR,
                        border: `1px dotted ${BLUE_ACCENT_COLOR}`, 
                        borderRadius: '4px',
                        '&:hover': {
                            backgroundColor: 'rgba(0, 123, 255, 0.04)', 
                        }
                    }}
                >
                    Add Option
                </Button>
            </Box>
        );
    };
    // --- Conditional Rendering ---
    const renderAnswerSection = () => {
        switch (normalizedQuestionType) {
            case QUESTION_TYPES.MULTIPLE_CHOICE:
                return renderMultipleChoiceAnswers();
            case QUESTION_TYPES.MRQ:
                return renderMRQAnswers();
            case QUESTION_TYPES.CODING: 
                return renderCodingAnswer();
            case QUESTION_TYPES.OTHERS: 
                return renderOthersAnswer(); 
            case QUESTION_TYPES.OPEN_ENDED:
            default:
                return renderOpenEndedAnswer(); 
        }
    };
    return (
        <Card
            sx={{
                ml: 6,
                boxShadow: 'none', 
                border: '1px solid #B8B8B8', 
                borderRadius: 2 
            }}
        >
            <CardContent>
                {/* Dropdowns and Required Toggle */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '800px', mb: 1 }}> 
                    
                    {/* --- Question Type Dropdown (Unchanged) --- */}
                    <FormControl size="small" sx={{ minWidth: 150 }}>
                        <Select 
                            input={<InputBase />} 
                            value={normalizedQuestionType} 
                            onChange={handleTypeChange}
                            sx={{
                                backgroundColor: '#F5F5F5',
                                borderRadius: '4px',
                                border: 'none',
                                '& .MuiOutlinedInput-notchedOutline': { border: 'none' },
                                '& .MuiSelect-select': { 
                                    p: '8px 12px',
                                    display: 'flex', 
                                    alignItems: 'center',
                                },
                            }}
                        >
                            <MenuItem 
                                value={QUESTION_TYPES.DEFAULT} 
                                disabled={normalizedQuestionType !== QUESTION_TYPES.DEFAULT}
                                sx={{ display: normalizedQuestionType !== QUESTION_TYPES.DEFAULT ? 'none' : 'flex' }}
                            >
                                <Typography sx={{ color: '#9E9E9E', ml: '24px' }}>Type</Typography>
                            </MenuItem>
                            
                            <MenuItem value={QUESTION_TYPES.OPEN_ENDED} sx={{ color: BLACK_ICON_COLOR }}>
                                {getQuestionTypeIcon(QUESTION_TYPES.OPEN_ENDED)} Open-ended
                            </MenuItem>
                            <MenuItem value={QUESTION_TYPES.CODING} sx={{ color: BLACK_ICON_COLOR }}>
                                {getQuestionTypeIcon(QUESTION_TYPES.CODING)} CODING
                            </MenuItem>
                            <MenuItem value={QUESTION_TYPES.OTHERS} sx={{ color: BLACK_ICON_COLOR }}>
                                {getQuestionTypeIcon(QUESTION_TYPES.OTHERS)} OTHERS
                            </MenuItem>
                            <MenuItem value={QUESTION_TYPES.MULTIPLE_CHOICE} sx={{ color: BLACK_ICON_COLOR }}>
                                {getQuestionTypeIcon(QUESTION_TYPES.MULTIPLE_CHOICE)} Multiple choice
                            </MenuItem>
                            <MenuItem value={QUESTION_TYPES.MRQ} sx={{ color: BLACK_ICON_COLOR }}>
                                {getQuestionTypeIcon(QUESTION_TYPES.MRQ)} MRQ (Multiple Response)
                            </MenuItem>
                        </Select>
                    </FormControl>
                    {/* --- Tagging Dropdown (MODIFIED: Uses localConceptTags) --- */}
                    <FormControl size="small" sx={{ minWidth: 120 }}>
                        <Select 
                            input={<InputBase />}
                            // 3. Set value to the question's concept_tag or a default 'Tagging'
                            value={question.concept_tag || 'Tagging'} 
                            onChange={handleTagChange}
                            sx={{
                                backgroundColor: '#F5F5F5',
                                borderRadius: '4px',
                                border: 'none',
                                '& .MuiOutlinedInput-notchedOutline': { border: 'none' },
                                '& .MuiSelect-select': { 
                                    p: '8px 12px',
                                    display: 'flex', 
                                    alignItems: 'center' 
                                },
                            }}
                        >
                            {/* Display the default 'Tagging' label if no tag is selected */}
                            {(!question.concept_tag || question.concept_tag === 'Tagging') && (
                                <MenuItem value="Tagging" sx={{ color: '#9E9E9E' }}>
                                    <ListIcon sx={{ color: BLACK_ICON_COLOR, mr: 1, fontSize: '1.2rem' }} /> Tagging
                                </MenuItem>
                            )}
                            
                            {/* Map all available concept tags to menu items (NOW USING localConceptTags) */}
                            {localConceptTags.map((tag) => (
                                <MenuItem key={tag} value={tag}>
                                    {tag}
                                </MenuItem>
                            ))}
                            {/* Add Iconbutton at the very bottom */}
                            <Divider sx={{ my: 0.5 }} />
                            <MenuItem 
                                value="NEW_TAG_INPUT_TRIGGER" 
                                onClick={(e) => { e.preventDefault(); handleTagChange({ target: { value: 'NEW_TAG_INPUT_TRIGGER' } }) }}
                            >
                                <AddIcon fontSize="small" sx={{ mr: 1 }} />
                                Add New Tag
                            </MenuItem>
                        </Select>
                    </FormControl>
                    <Box sx={{ flexGrow: 1 }} />
                    {/* Required Toggle, MoreVert, Delete Buttons (Unchanged) */}
                    <Typography variant="body2" sx={{ color: REQUIRED_TEXT_COLOR, fontWeight: 'normal' }}>
                        Required
                    </Typography>
                    <Switch defaultChecked color="success" />
                    
                    <Box sx={{ border: '1px solid #B8B8B8', borderRadius: '4px', width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <IconButton size="small" aria-label="more options" sx={{ p: 0 }} onClick={handleNoOp}>
                            <MoreVertIcon sx={{ color: BLACK_ICON_COLOR }} />
                        </IconButton>
                    </Box>
                    <Box sx={{ border: '1px solid #B8B8B8', borderRadius: '4px', width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <IconButton size="small" aria-label="delete question" sx={{ p: 0 }} onClick={handleDeleteQuestion}>
                            <DeleteIcon sx={{ color: RED_DELETE_ICON_COLOR }} /> 
                        </IconButton>
                    </Box>
                </Box>
                {/* --- New Tag Input Field (Conditional Render for Point 1) --- */}
                {isAddingNewTag && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2, ml: 1 }}>
                        <TextField
                            size="small"
                            placeholder="Enter new concept tag name"
                            value={newTagInput}
                            onChange={(e) => setNewTagInput(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    handleNewTagSubmit();
                                }
                            }}
                            sx={{ width: 250, ...INVISIBLE_TEXTFIELD_STYLE }}
                        />
                        <Button variant="contained" size="small" onClick={handleNewTagSubmit} disabled={newTagInput.trim() === ''}>
                            Create & Select
                        </Button>
                        <Button variant="outlined" size="small" onClick={() => setIsAddingNewTag(false)}>
                            Cancel
                        </Button>
                    </Box>
                )}
                
                {/* --- Horizontal Divider --- */}
                <Divider sx={{ height: '1px', borderColor: '#B8B8B8', mt: 0, mb: 2 }} />
                {/* --- Question Title Input and Image --- */}
                
                {/* 1. Question Number/Title on its own line (full width) */}
                <Grid container spacing={2}>
                    <Grid item xs={12}>
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                            <HelpCenterIcon 
                                sx={{ 
                                    color: '#000000', 
                                    fontSize: '1.5rem', 
                                    mr: 1,
                                }}
                            />
                            
                            <Typography variant="body1" sx={{ color: REQUIRED_TEXT_COLOR }}>
                                Question {questionNumber}
                                <Box component="span" sx={{ color: RED_ASTERISK_COLOR }}>*</Box>
                            </Typography>
                        </Box>
                    </Grid>
                </Grid>
                {/* 2. Grid container for TextField and Image on the line below */}
                <Grid container spacing={2} sx={{ mt: 0 }}> 
                    
                    {/* --- Grid for Question TextField (Left Side) --- */}
                    <Grid item xs={9}>
                        <TextField
                            multiline
                            rows={5}
                            // 4. ADD PRE-FILLING: Use question.question_stem
                            placeholder="Enter your question here."
                            variant="outlined"
                            value={question.question_stem || ''} // MODIFIED: Changed question.text to question.question_stem
                            onChange={handleTextChange}
                            sx={{ 
                                width: '550px', 
                                ...INVISIBLE_TEXTFIELD_STYLE
                            }}
                        />
                    </Grid>
                    
                    {/* --- Grid for Static Image (Right Side) --- */}
                    <Grid item xs={3}>
                        <Box 
                            sx={{
                                height: '100%', 
                                display: 'flex',
                                alignItems: 'flex-start',
                                justifyContent: 'flex-start',
                            }}
                        >
                            <img 
                                src={PlaceholderImage} 
                                alt="Placeholder Image" 
                                style={{ 
                                    height: '150px', 
                                    width: '250px', 
                                    objectFit: 'cover', 
                                    border: '1px solid #ccc', 
                                }} 
                            />
                        </Box>
                    </Grid>
                </Grid>
                {/* DYNAMIC ANSWER SECTION */}
                {renderAnswerSection()}
            </CardContent>
        </Card>
    );
}
export default EditQuestionForm;