// src/pages/EditPage.jsx

import React, { useState } from 'react';
import { Box, Container, CssBaseline, Grid, Typography, Divider } from '@mui/material';

// Imports for structure
import Header from '../components/Header';
import Footer from '../components/Footer';

// Imports for this specific page's components
import QuestionStepper from '../components/QuestionStepper'; // Re-using from Create page
import CreateToolbar from '../components/CreateToolbar';   // Re-using from Create page
import EditQuestionForm from '../components/EditQuestionForm'; // NEW component for editing

// Mock data for the example (same as HomePage, but will be loaded for editing)
const mockQuestions = [
  { id: 1, text: 'Convert 1110010101 from binary to text', type: 'Open-ended', answer: 'Binary to text conversion.' },
  { id: 2, text: 'If a route function returns the string "Hello world!", the HTTP status code by default is _____', type: 'Open-ended', answer: '200 OK' },
  { id: 3, text: 'How many 8-digit numbers can be formed using 2, 3, 4, 4, 5, 5, 5, 5?', type: 'Open-ended', answer: 'Some combinatorial math calculation.' },
];

function EditPage({ goToHomePage }) { // 👈 Receive goToHomePage as prop
  const [activeQuestionId, setActiveQuestionId] = useState(mockQuestions[0].id); // Start with the first question selected
  const [questions, setQuestions] = useState(mockQuestions); // State to hold the questions being edited

  // Function to update a question's data (e.g., text, answer, type)
  const handleQuestionChange = (id, field, value) => {
    setQuestions(prevQuestions =>
      prevQuestions.map(q =>
        q.id === id ? { ...q, [field]: value } : q
      )
    );
  };

  return (
    <Container maxWidth sx={{ flexGrow: 1, mt: 3, mb: 3 }}>
        <Box mb={2}>
          <Typography variant="h5" component="h1" fontWeight="bold">
            Question mass edit {questions.length}
          </Typography>
          <Divider sx={{ my: 1 }} />
        </Box>

        <Grid container spacing={3}>

          {/* LEFT SIDEBAR (QUESTION STEPPER) */}
          <Grid item xs={12} md={3}>
            <QuestionStepper 
              questions={questions}
              activeQuestion={activeQuestionId}
              setActiveQuestion={setActiveQuestionId}
            />
            <Box sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="button" sx={{ color: '#007bff' }}>
                Upload file
              </Typography>
            </Box>
          </Grid>

          {/* MAIN FORM AREA (RIGHT SIDE) */}
          <Grid item xs={12} md={9}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <CreateToolbar />
              {questions.map((question, index) => (
                <EditQuestionForm 
                  key={question.id}
                  questionNumber={index + 1}
                  question={question}
                  onQuestionChange={handleQuestionChange}
                />
              ))}
            </Box>
          </Grid>

        </Grid>
      </Container>
  );
}

export default EditPage;
