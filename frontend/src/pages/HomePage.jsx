import React, { useState } from 'react';
// We've removed Box, Container, and CssBaseline from here
import { Grid, Box } from '@mui/material';

// Import your custom components
// ❌ We've REMOVED Header and Footer imports
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
function HomePage({ goToCreatePage, goToEditPage, goToSearchPage }) {
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

  // --- THIS RETURN BLOCK IS UPDATED ---
  // We've removed the outer <Box>, <CssBaseline>, <Header>, <Container>, and <Footer>
  // This component now *only* returns the Grid for the page content.
  // This Grid will be placed inside the <Container> from your App component.
  return (
    <Grid container spacing={13}>
      
      <Grid item xs={12} md={9}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {/* 👈 PASS the navigation functions and the selected IDs down */}
          <QuestionToolbar 
            numSelected={selected.length} 
            selectedIds={selected} 
            goToCreatePage={goToCreatePage} 
            goToEditPage={goToEditPage}
            goToSearchPage={goToSearchPage}
          />
          <QuestionTable 
            questions={questions}
            selected={selected}
            setSelected={setSelected}
            onSelectAllClick={handleSelectAllClick}
          />
        </Box>
      </Grid>
      
      <Grid item xs={12} md={3} sx={{ marginTop: 10 }}>
        <QuestionGroups groups={mockGroups} />
      </Grid>
      
    </Grid>
  );
}

export default HomePage;
