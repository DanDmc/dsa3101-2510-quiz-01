import React, { useState, useEffect } from 'react';
// import { useParams } from 'react-router-dom'; // <-- 1. REMOVE THIS
import { 
    Box, 
    Container, 
    CssBaseline,
    Grid, 
    Typography, 
    Divider, 
    Button, 
    Paper, 
    TextField 
} from '@mui/material';

// Imports for this specific page's components
import QuestionStepper from '../components/QuestionStepper'; 
import CreateToolbar from '../components/CreateToolbar';   
import EditQuestionForm from '../components/EditQuestionForm'; 

// --- 2. ACCEPT 'selectedQuestions' PROP ---
function EditPage({ selectedQuestions, goToHomePage }) {
    
    // Define the desired width of the sidebar
    const SIDEBAR_WIDTH_MD = 300; 
    
    // --- 3. REMOVE all the 'useParams' and 'fetch' logic ---

    // --- 4. SET STATE based on the 'selectedQuestions' prop ---
    const [questions, setQuestions] = useState(selectedQuestions || []);
    const [activeQuestionId, setActiveQuestionId] = useState(
        (selectedQuestions && selectedQuestions.length > 0) ? selectedQuestions[0].id : null
    );

    // This effect updates the state if the prop changes (e.g., user re-enters the page)
    useEffect(() => {
        setQuestions(selectedQuestions || []);
        if (selectedQuestions && selectedQuestions.length > 0) {
            setActiveQuestionId(selectedQuestions[0].id);
        } else {
            // If no questions are selected (e.g., page reload bug), go home
            // This is a safety check
            if (!selectedQuestions || selectedQuestions.length === 0) {
                console.warn("EditPage loaded with no selected questions. Returning home.");
                // We add a small delay to avoid React state update errors
                setTimeout(goToHomePage, 0);
            }
        }
    }, [selectedQuestions, goToHomePage]); // Re-run if the prop array changes

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
    
    // --- 5. The rest of your JSX layout is perfect ---
    // It's already designed to read from the 'questions' state,
    // which we now populate from the prop.

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
                    
                    <Box
                        sx={{
                            position: 'absolute',
                            top: -32,
                            left: -24,
                            zIndex: 100, 
                            backgroundColor: '#F5F5F5',
                            width: SIDEBAR_WIDTH_MD, 
                            minHeight: '112.5vh',
                            p: 2, 
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 2,
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
                        
                        <Box sx={{ flexGrow: 1 }} />
                        <Box sx={{ p: 1, textAlign: 'center' }}>
                            <Button variant="text" component="label" sx={{ color: '#007bff' }}>
                                Upload file
                                {/* <input type="file" hidden /> */}
                            </Button>
                        </Box>
                    </Box>
                    
                    <Grid 
                        item 
                        xs={12} 
                        sx={{ ml: `${SIDEBAR_WIDTH_MD}px` }} 
                    >
                        <Box mb={2} sx={{ p: 3 }}>
                            <Typography variant="h5" component="h1" fontWeight="bold">
                                Edit Question ({questions.length})
                            </Typography>
                            <Divider sx={{ my: 1 }} />
                        </Box>

                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, px: 3, pb: 3 }}>
                            <CreateToolbar 
                                onSave={handleSaveAll}
                                onCancel={goToHomePage}
                            />
                            {questions
                                .filter(q => q.id === activeQuestionId)
                                .map((question, index) => (
                                    <EditQuestionForm 
                                        key={question.id}
                                        questionNumber={questions.findIndex(q => q.id === question.id) + 1} 
                                        question={question}
                                        onQuestionChange={handleQuestionChange}
                                    />
                                ))
                            }
                        </Box>
                    </Grid>
                    
                </Grid>
            </Container>
        </>
    );
}

export default EditPage;
