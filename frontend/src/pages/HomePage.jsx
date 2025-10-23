// src/pages/HomePage.jsx

import React, { useState } from 'react';
import { Box, Container, Grid, CssBaseline } from '@mui/material';

// Import your custom components (saved in '../components/')
import Header from '../components/Header';
import Footer from '../components/Footer';
import QuestionToolbar from '../components/QuestionToolbar';
import QuestionTable from '../components/QuestionTable';
import QuestionGroups from '../components/QuestionGroups';

// Mock data for the example (Kept the same)
const mockQuestions = [
  { id: 1, text: 'Convert 1110010101 from binary to text', type: 'Open ended' },
  { id: 2, text: 'If a route function returns the string "Hello world!", the HTTP status...', type: 'Open ended' },
  { id: 3, text: 'How many 8-digit numbers can be formed using 2, 3, 4, 4, 5, 5, 5, 5?', type: 'Open ended' },
  { id: 4, text: 'In a simple regression, the RMSE of the regression line is equal to 0.6...', type: 'MCQ' },
  { id: 5, text: 'In an SQL database, a record with ID = 1 already exists. Another record...', type: 'MCQ' },
  { id: 6, text: 'Which of the following statement(s) is/are correct about primary keys...', type: 'MRQ' },
  { id: 7, text: 'You are testing a Flask API endpoint that checks book orders. The...', type: 'MRQ' },
];

const mockGroups = ['DSA3102', 'DSA3101', 'DSA2102', 'ST3131', 'ST2132', 'ST2131'];

// 👈 ACCEPT navigation handlers as props
function HomePage({ goToCreatePage, goToEditPage }) { 
  const [questions] = useState(mockQuestions);
  const [selected, setSelected] = useState([]); // For checkboxes

  const handleSelectAllClick = (event) => {
    if (event.target.checked) {
      const newSelecteds = questions.map((n) => n.id);
      setSelected(newSelecteds);
      return;
    }
    setSelected([]);
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', backgroundColor: '#f4f7fa' }}>
      <CssBaseline />
      <Header /> 
      
      <Container maxWidth="xl" sx={{ flexGrow: 1, mt: 3, mb: 3 }}>
        <Grid container spacing={3}>
          
          <Grid item xs={12} md={9}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {/* 👈 PASS the navigation functions and the selected IDs down */}
              <QuestionToolbar 
                numSelected={selected.length} 
                selectedIds={selected} 
                goToCreatePage={goToCreatePage} 
                goToEditPage={goToEditPage}
              />
              <QuestionTable 
                questions={questions}
                selected={selected}
                setSelected={setSelected}
                onSelectAllClick={handleSelectAllClick}
              />
            </Box>
          </Grid>
          
          <Grid item xs={12} md={3}>
            <QuestionGroups groups={mockGroups} />
          </Grid>
          
        </Grid>
      </Container>
      
      <Footer /> 
    </Box>
  );
}

export default HomePage;