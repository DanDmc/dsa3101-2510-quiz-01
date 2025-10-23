// src/pages/CreateQuestionPage.jsx

import React, { useState } from 'react';
import { Box, Container, CssBaseline, Grid, Typography, Divider } from '@mui/material';

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
  
  return (
    <Container maxWidth={false} sx={{ flexGrow: 1, mt: 3, mb: 3 }}>
        <Box mb={2}>
          <Typography variant="h5" component="h1" fontWeight="bold">
            Question creation {questions.length}
          </Typography>
          <Divider sx={{ my: 1 }} />
        </Box>
        
        <Grid container spacing={3}>
          
          {/* LEFT SIDEBAR (QUESTION STEPPER) - Keep md=3 */}
          <Grid item xs={12} md={3}>
            <QuestionStepper 
              questions={questions}
              activeQuestion={activeQuestion}
              setActiveQuestion={setActiveQuestion}
            />
            {/* The 'Upload file' button shown at the bottom of the sidebar */}
            <Box sx={{ p: 2, textAlign: 'center' }}>
                <Typography variant="button" sx={{ color: '#007bff' }}>
                    Upload file
                </Typography>
            </Box>
          </Grid>
          
          {/* MAIN FORM AREA (RIGHT SIDE) - Keep md=9 */}
          <Grid item xs={12} md={9}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <CreateToolbar />
              {/* Pass the current question object to the form */}
              <QuestionForm activeQuestion={questions.find(q => q.id === activeQuestion)} />
            </Box>
          </Grid>
          
        </Grid>
      </Container>
  );
}

export default CreateQuestionPage;