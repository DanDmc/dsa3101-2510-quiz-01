import React, { useState, useEffect } from 'react';
import { 
    Box, 
    Container, 
    CssBaseline, // 🌟 NEW: Added back CssBaseline
    Grid, 
    Typography, 
    Divider, 
    Button, 
    Toolbar, 
    Paper, 
    TextField 
} from '@mui/material';

// Imports for this specific page's components
import QuestionStepper from '../components/QuestionStepper'; 
import CreateToolbar from '../components/CreateToolbar';   
import EditQuestionForm from '../components/EditQuestionForm'; 

function EditPage({ selectedQuestions, goToHomePage }) {
    
    // Define the desired width of the sidebar (e.g., 300px)
    const SIDEBAR_WIDTH_MD = 300; 

    const [questions, setQuestions] = useState(selectedQuestions);
    const [activeQuestionId, setActiveQuestionId] = useState(null);

    // When the component loads, highlight the first question in the stepper
    useEffect(() => {
        if (questions && questions.length > 0) {
            setActiveQuestionId(questions[0].id);
        } else {
            setActiveQuestionId(null);
        }
    }, [questions]); 

    // Update this handler to accept an ID from QuestionStepper
    const handleQuestionChange = (updatedQuestion) => {
        setQuestions(prevQuestions =>
            prevQuestions.map(q =>
                q.id === updatedQuestion.id ? updatedQuestion : q
            )
        );
    };

    // Handler for saving changes (you would expand this)
    const handleSaveAll = () => {
        console.log('Saving all changes to:', questions);
        alert('All changes saved (check console)!');
    };
    
    // 11. REMOVED the old 'handleTextChange' handler.

    return (
        <>
            {/* 🌟 1. Added CssBaseline for consistent styling */}
            <CssBaseline /> 
            <Container 
                maxWidth={false} 
                sx={{ 
                    flexGrow: 1, 
                    p: 0, // Reset padding for the absolute layout
                    mt: 0, 
                    mb: 0,
                    position: 'relative', // Necessary for absolute positioning of the sidebar
                }}
            >
                
                {/* The main content wrapper. */}
                <Grid 
                    container 
                    spacing={0}
                    sx={{ flexGrow: 1 }} 
                >
                    
                    {/* 🌟 2. LEFT SIDEBAR (QUESTION STEPPER) - ABSOLUTELY POSITIONED */}
                    <Box
                        sx={{
                            // Positioning
                            position: 'absolute',
                            top: -32,
                            left: -24,
                            zIndex: 100, 
                            
                            // Styles for the sidebar
                            backgroundColor: '#F5F5F5',
                            width: SIDEBAR_WIDTH_MD, 
                            minHeight: '112.5vh', // Ensure it covers the height of the view
                            p: 2, 
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 2,
                            
                            // Border
                            border: '1px solid #9E9E9E', 
                        }}
                    >
                        {/* Question Stepper component */}
                        <Box sx={{ width: '100%' }}>
                            <QuestionStepper 
                                questions={questions}
                                activeQuestion={activeQuestionId}
                                setActiveQuestion={setActiveQuestionId} 
                            />
                        </Box>
                        
                        {/* Upload file link at the bottom (Use flexGrow: 1 to push it down) */}
                        <Box sx={{ flexGrow: 1 }} />
                        <Box sx={{ p: 1, textAlign: 'center' }}>
                            <Button variant="text" component="label" sx={{ color: '#007bff' }}>
                                Upload file
                                {/* <input type="file" hidden /> */}
                            </Button>
                        </Box>
                    </Box>
                    
                    {/* 🌟 3. MAIN FORM AREA (RIGHT SIDE) - OFFSET BY MARGIN */}
                    <Grid 
                        item 
                        xs={12} 
                        // Set margin-left to push the content past the width of the absolute sidebar
                        sx={{ ml: `${SIDEBAR_WIDTH_MD}px` }} 
                    >
                        {/* Title/Divider Section - ADD PADDING back to the content area ONLY */}
                        <Box mb={2} sx={{ p: 3 }}>
                            <Typography variant="h5" component="h1" fontWeight="bold">
                                Question mass edit ({questions.length})
                            </Typography>
                            <Divider sx={{ my: 1 }} />
                        </Box>

                        {/* Content below the title and divider (Toolbar, Form, etc.) */}
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, px: 3, pb: 3 }}>
                            <CreateToolbar 
                                onSave={handleSaveAll}
                                onCancel={goToHomePage}
                            />
                            {/* Render the active question form only */}
                            {questions
                                .filter(q => q.id === activeQuestionId)
                                .map((question, index) => (
                                    <EditQuestionForm 
                                        key={question.id}
                                        // Use the index of the question in the original 'questions' array for numbering
                                        questionNumber={questions.findIndex(q => q.id === question.id) + 1} 
                                        question={question}
                                        onQuestionChange={handleQuestionChange}
                                    />
                                ))
                            }
                            {/* Note: I've changed the mapping logic to only show the ACTIVE question's form, 
                                as typically in an edit page with a sidebar, only one form is visible at a time.
                                If you intended to show ALL forms, let me know, and I'll revert that inner mapping.
                            */}
                        </Box>
                    </Grid>
                    
                </Grid>
            </Container>
        </>
    );
}

export default EditPage;