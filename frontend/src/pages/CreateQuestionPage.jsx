// src/pages/CreateQuestionPage.jsx

import React, { useState, useEffect, useCallback } from 'react';
import { 
    Box, 
    Container, 
    CssBaseline, 
    Grid, 
    Typography, 
    Divider, 
    Button, 
    TextField 
} from '@mui/material';

// Imports for this specific page's components
import QuestionStepper from '../components/QuestionStepper';
import CreateToolbar from '../components/CreateToolbar';
// Assuming 'QuestionForm' is now what you use for editing/creating single questions
// Based on your EditPage, I will use EditQuestionForm for consistency in component naming
import EditQuestionForm from '../components/EditQuestionForm'; 
import AddIcon from '@mui/icons-material/Add'; 

// Constants (based on EditPage)
const SIDEBAR_WIDTH_MD = 300; 
const ORANGE_COLOR = '#F57F17'; 
const WHITE_COLOR = '#FFFFFF'; 
const TOOLBAR_GRID_WIDTH = '1200px'; 
const FORM_GRID_WIDTH = '900px'; 
const DIVIDER_LEFT_PADDING = '48px';
const DIVIDER_WIDTH_PERCENT = '100%';
const MAIN_CONTAINER_BOTTOM_MARGIN_PX = 32;

// Utility to create a new, unique question template
const createNewQuestion = (id) => ({
    id: id,
    question_type: 'OPEN-ENDED', // Start with a default type
    text: 'Enter your new question here.',
    answer: '',
    options: null, // Start clean for MCQs/MRQs
});

// 🎯 MODIFICATION: Accept headerHeight and footerHeight as props (essential for layout)
function CreateQuestionPage({ goToHomePage, headerHeight = 0, footerHeight = 0 }) {

    // --- State Initialization for Creation ---
    const [questions, setQuestions] = useState(() => {
        // Start with exactly one new question
        return [createNewQuestion(1)];
    });
    const [activeQuestionId, setActiveQuestionId] = useState(1);

    // Effect to ensure the activeQuestionId is always the first question's ID when questions change
    useEffect(() => {
        if (questions && questions.length > 0) {
            setActiveQuestionId(questions[0].id);
        } else {
            // Should not happen in creation mode, but good practice
            setActiveQuestionId(null);
        }
    }, [questions]);

    // Corrected Height Calculation (same as EditPage)
    const SIDEBAR_HEIGHT_CALC = `calc(100vh - ${headerHeight}px - ${footerHeight}px - ${MAIN_CONTAINER_BOTTOM_MARGIN_PX}px)`;

    // --- Handlers (Adapted from EditPage) ---

    // CRITICAL HANDLER: Updates a specific field (key) for a specific question (id).
    const handleQuestionChange = (id, key, value) => {
        setQuestions(prevQuestions =>
            prevQuestions.map(q =>
                q.id === id 
                    ? { ...q, [key]: value }
                    : q
            )
        );
    };

    // Handler for adding a new question
    const handleAddQuestion = useCallback(() => {
        setQuestions(prevQuestions => {
            const nextId = Math.max(0, ...prevQuestions.map(q => q.id)) + 1;
            const newQuestion = createNewQuestion(nextId);
            const newQuestionsArray = [...prevQuestions, newQuestion];
            setActiveQuestionId(nextId); // Make the new question active
            return newQuestionsArray;
        });
    }, []);

    const handleSaveAll = () => {
        console.log('Creating/Saving new questions:', questions);
        alert('Questions created/saved (check console)!');
    };
    
    const handleDownload = () => {
        alert('Download triggered!');
    };

    const handleFileUpload = (event) => {
        const file = event.target.files[0];
        if (file) {
            console.log("File uploaded:", file.name);
        }
    };

    // Find the currently active question object
    const activeQuestion = questions.find(q => q.id === activeQuestionId);

    return (
        <>
            <CssBaseline /> 
            <Container 
                maxWidth={false} 
                sx={{ 
                    flexGrow: 1, 
                    p: 0, 
                    mt: 0, 
                    mb: 0,
                    position: 'relative',
                }}
            >
                
                <Grid 
                    container 
                    spacing={0}
                    sx={{ flexGrow: 1 }} 
                >
                    
                    {/* 🌟 2. LEFT SIDEBAR (QUESTION STEPPER) - ABSOLUTELY POSITIONED */}
                    <Box
                        sx={{
                            position: 'absolute',
                            top: -32, // Cancels the parent's mt:4
                            left: -24,
                            zIndex: 100, 
                            
                            backgroundColor: '#F5F5F5',
                            width: SIDEBAR_WIDTH_MD,
                            height: SIDEBAR_HEIGHT_CALC, // Use the dynamic height calculation
                            overflowY: 'auto',
                            
                            p: 2, 
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 2,
                            
                            border: '1px solid #9E9E9E', 
                        }}
                    >
                        {/* Question Stepper component */}
                        <Box sx={{ width: '100%', flexGrow: 1 }}>
                            <QuestionStepper 
                                questions={questions}
                                activeQuestion={activeQuestionId}
                                setActiveQuestion={setActiveQuestionId}
                            />
                            {/* Button to add a new question */}
                            <Button
                                variant="outlined"
                                startIcon={<AddIcon />}
                                onClick={handleAddQuestion}
                                sx={{ 
                                    mt: 2, 
                                    width: '100%', 
                                    borderColor: ORANGE_COLOR,
                                    color: ORANGE_COLOR,
                                    '&:hover': { borderColor: ORANGE_COLOR, backgroundColor: 'rgba(245, 127, 23, 0.04)' }
                                }}
                            >
                                Add Question
                            </Button>
                        </Box>
                        
                        {/* Upload file button at the bottom */}
                        <Box sx={{ p: 1, textAlign: 'center', flexShrink: 0 }}>
                            <Button 
                                variant="contained" 
                                component="label" 
                                onClick={() => document.getElementById('file-upload-input').click()} 
                                sx={{ 
                                    backgroundColor: ORANGE_COLOR, 
                                    color: WHITE_COLOR,
                                    width: '150px', 
                                    borderRadius: '8px', 
                                    '&:hover': {
                                        backgroundColor: '#E66907', 
                                    },
                                }}
                            >
                                Upload File
                                {/* Hidden file input to handle the actual file selection */}
                                <input 
                                    type="file" 
                                    id="file-upload-input" 
                                    hidden 
                                    onChange={handleFileUpload}
                                />
                            </Button>
                        </Box>
                    </Box>
                    
                    {/* 🌟 3. MAIN CONTENT AREA (RIGHT SIDE) - OFFSET BY MARGIN */}
                    <Grid 
                        item 
                        xs={12} 
                        sx={{ ml: `${SIDEBAR_WIDTH_MD}px`, pt: 0, px: 3 }}
                    >
                        
                        {/* 🌟 Inner Grid Container for the three sections (Toolbar, Filter, Form) */}
                        <Grid container direction="column" rowSpacing={0}> 

                            {/* --- ROW 1: CREATE TOOLBAR --- */}
                            <Grid item sx={{ 
                                pt: 1,
                                width: '100%', 
                                maxWidth: TOOLBAR_GRID_WIDTH,
                            }}>
                                <CreateToolbar 
                                    onSave={handleSaveAll}
                                    onCancel={goToHomePage}
                                    onDownload={handleDownload}
                                    saveText="Create Questions" // Changed text for context
                                />
                            </Grid>

                            {/* 🟢 HORIZONTAL DIVIDER */}
                            <Grid item sx={{ width: '100%', maxWidth: TOOLBAR_GRID_WIDTH }}>
                                <Box sx={{ 
                                    mt: 1, 
                                    mb: 1, 
                                    pl: DIVIDER_LEFT_PADDING, 
                                }}>
                                    <Divider 
                                        sx={{ 
                                            height: '1px', 
                                            borderColor: '#B8B8B8', 
                                            width: DIVIDER_WIDTH_PERCENT,
                                        }} 
                                    />
                                </Box>
                            </Grid>
                            
                            {/* --- ROW 2: TITLE & FORM --- */}
                            <Grid item sx={{
                                width: '100%',
                                maxWidth: FORM_GRID_WIDTH,
                                pt: 2, 
                                pb: 3, 
                            }}>
                                <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                                    <Typography variant="h5" component="h1" fontWeight="bold" gutterBottom>
                                        Create Question 
                                    </Typography>

                                    {/* Render the active question form */}
                                    {activeQuestion ? (
                                        <EditQuestionForm 
                                            key={activeQuestion.id}
                                            // The question number is its index in the array + 1
                                            questionNumber={questions.findIndex(q => q.id === activeQuestion.id) + 1} 
                                            question={activeQuestion}
                                            onQuestionChange={handleQuestionChange}
                                        />
                                    ) : (
                                        <Typography color="error">
                                            No question active. Click "Add Question" to start.
                                        </Typography>
                                    )}
                                </Box>
                            </Grid>
                            
                        </Grid>
                        
                    </Grid>
                    
                </Grid>
            </Container>
        </>
    );
}

export default CreateQuestionPage;