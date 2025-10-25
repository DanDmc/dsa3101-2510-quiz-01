import React, { useState, useEffect } from 'react'; // 1. Added useEffect
import { 
  Box, 
  Container, 
  Grid, // 2. Removed CssBaseline (was unused)
  Typography, 
  Divider, 
  Button, // 3. Added Button
  Toolbar, // 4. Added Toolbar
  Paper, // 5. Added Paper
  TextField // 6. Added TextField
} from '@mui/material';

// Imports for this specific page's components
import QuestionStepper from '../components/QuestionStepper'; // Re-using from Create page
import CreateToolbar from '../components/CreateToolbar';   // Re-using from Create page
import EditQuestionForm from '../components/EditQuestionForm'; // NEW component for editing

// 7. REMOVED the entire mockQuestions array. 
// We must use the 'selectedQuestions' prop.

function EditPage({ selectedQuestions, goToHomePage }) {
  
  // This state holds the list of questions for the *left panel*
  // It's initialized directly from the prop
  const [questions, setQuestions] = useState(selectedQuestions);
  
  // 8. REMOVED the old 'currentQuestion' state
  
  // 9. ADDED the 'activeQuestionId' state needed by the stepper
  const [activeQuestionId, setActiveQuestionId] = useState(null);

  // 10. REPLACED old useEffect with the correct one
  // When the component loads, highlight the first question in the stepper
  useEffect(() => {
    if (questions && questions.length > 0) {
      setActiveQuestionId(questions[0].id);
    } else {
      setActiveQuestionId(null);
    }
  }, [questions]); // Dependency on the 'questions' state

  // 2. Update this handler to accept an ID from QuestionStepper
  const handleQuestionChange = (updatedQuestion) => {
    setQuestions(prevQuestions =>
      prevQuestions.map(q =>
        q.id === updatedQuestion.id ? updatedQuestion : q
      )
    );
  };

  // Handler for saving changes (you would expand this)
   /* This function is passed to the CreateToolbar to save all changes.
   */
  const handleSaveAll = () => {
    // Here you would:
    // 1. Send the `questions` state array to your API/backend
    console.log('Saving all changes to:', questions);
    alert('All changes saved (check console)!');
    // 2. (Optional) Navigate back home
    // goToHomePage();
  };
  
  // 11. REMOVED the old 'handleTextChange' handler.
  // The EditQuestionForm handles this itself.

  return (
    <Container maxWidth={false} sx={{ flexGrow: 1, mt: 3, mb: 3 }}>
        <Box mb={2}>
          <Typography variant="h5" component="h1" fontWeight="bold">
            Question mass edit ({questions.length})
          </Typography>
          <Divider sx={{ my: 1 }} />
        </Box>

        <Grid container spacing={3}>

          {/* LEFT SIDEBAR (QUESTION STEPPER) */}
          <Grid item xs={12} md={3}>
            <QuestionStepper 
              questions={questions}
              activeQuestion={activeQuestionId}
              setActiveQuestion={setActiveQuestionId} // Pass the setter directly
            />
            <Box sx={{ p: 2, textAlign: 'center' }}>
              <Button variant="text" component="label">
                Upload file
                {/* You would add a hidden input for file upload */}
                {/* <input type="file" hidden /> */}
              </Button>
            </Box>
          </Grid>

          {/* MAIN FORM AREA (RIGHT SIDE) */}
          <Grid item xs={12} md={9}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <CreateToolbar 
                onSave={handleSaveAll}
                onCancel={goToHomePage}
              />
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


