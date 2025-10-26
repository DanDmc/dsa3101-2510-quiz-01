// src/pages/CreateQuestionPage.jsx

import React, { useState } from 'react';
import { Box, Container, CssBaseline, Grid, Typography, Divider } from '@mui/material'; // <-- CssBaseline is imported here

// Imports for structure
import Header from '../components/Header';
import Footer from '../components/Footer';

// Imports for this specific page's components
import QuestionStepper from '../components/QuestionStepper';
import QuestionForm from '../components/QuestionForm';
import CreateToolbar from '../components/CreateToolbar';

function CreateQuestionPage({ goToHomePage }) {
    const [activeQuestion, setActiveQuestion] = useState(1);
    const [questions, setQuestions] = useState([
        { id: 1, type: 'Multiple choice', text: 'Fill in question text...' }
    ]);
    
    // Define the desired width of the sidebar (e.g., 300px)
    const SIDEBAR_WIDTH_MD = 300; 

    return (
        // 🌟 NEW: Add CssBaseline at the highest level of the page component
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
                
                {/* The main content wrapper. */}
                <Grid 
                    container 
                    spacing={0}
                    sx={{ flexGrow: 1 }} 
                >
                    
                    {/* LEFT SIDEBAR (QUESTION STEPPER) */}
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
                            minHeight: '112.5vh', 
                            p: 2, 
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 2,
                            
                            // Border
                            border: '1px solid #9E9E9E', 
                        }}
                    >
                        {/* 🌟 FIX: Wrap QuestionStepper in a Box to force 100% width 
                            The QuestionStepper itself will render inside this box.
                        */}
                        <Box sx={{ width: '100%' }}>
                            <QuestionStepper 
                                questions={questions}
                                activeQuestion={activeQuestion}
                                setActiveQuestion={setActiveQuestion}
                            />
                        </Box>
                        
                        {/* Upload file link at the bottom (Use flexGrow: 1 to push it down) */}
                        <Box sx={{ flexGrow: 1 }} />
                        <Box sx={{ p: 1, textAlign: 'center' }}>
                            <Typography variant="button" sx={{ color: '#007bff' }}>
                                Upload file
                            </Typography>
                        </Box>
                    </Box>
                    
                    {/* MAIN FORM AREA (RIGHT SIDE) - Pushed by margin-left */}
                    <Grid 
                        item 
                        xs={12} 
                        // Set margin-left to push the content past the width of the absolute sidebar
                        sx={{ ml: `${SIDEBAR_WIDTH_MD}px` }} 
                    >
                        {/* Title/Divider Section - ADD PADDING back to the content area ONLY */}
                        <Box mb={2} sx={{ p: 3 }}>
                            <Typography variant="h5" component="h1" fontWeight="bold">
                                Question creation {questions.length}
                            </Typography>
                            <Divider sx={{ my: 1 }} />
                        </Box>

                        {/* Content below the title and divider (Toolbar, Form, etc.) */}
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, px: 3, pb: 3 }}>
                            <CreateToolbar />
                            {/* Pass the current question object to the form */}
                            <QuestionForm activeQuestion={questions.find(q => q.id === activeQuestion)} />
                        </Box>
                    </Grid>
                    
                </Grid>
            </Container>
        </>
    );
}

export default CreateQuestionPage;