import React, { useState } from 'react';
// We've removed Box, Container, and CssBaseline from here
import { Grid, Box } from '@mui/material';

// Import your custom components
// ❌ We've REMOVED Header and Footer imports
import QuestionToolbar from '../components/QuestionToolbar';
import QuestionTable from '../components/QuestionTable';
import QuestionGroups from '../components/QuestionGroups';

const mockGroups = ['DSA3102', 'DSA3101', 'DSA2102', 'ST3131', 'ST2132', 'ST2131'];

// 1. ACCEPT THE 'questions' PROP HERE
function HomePage({ questions, goToCreatePage, goToEditPage, goToSearchPage, goToHomePage, handleDeleteQuestions}) {
  
  // 2. REMOVED THIS LINE: const [questions] = useState(mockQuestions);
  // We will use the 'questions' prop directly.
  
  const [selected, setSelected] = useState([]); // For checkboxes

  const handleSelectAllClick = (event) => {
    if (event.target.checked) {
      // 3. This now correctly uses the 'questions' prop
      const newSelecteds = questions.map((n) => n.id);
      setSelected(newSelecteds);
      return;
    }
    setSelected([]);
  };

  const handleEditClick = () => {
    // 1. Filter to get the *objects* using the 'questions' prop
    const questionsToEdit = questions.filter(q => selected.includes(q.id));
    // 2. Pass the array of OBJECTS to the function from main.jsx
    goToEditPage(questionsToEdit); 
  };

  const handleDeleteClick = () => {
    // Pass the selected IDs up to the App component (main.jsx)
    // The App component will be responsible for filtering the master list
    handleDeleteQuestions(selected);
    
    // Clear the local selection state
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
          {/* 4. REMOVED 'selectedIds={selected}' - it's not needed by the toolbar */}
          <QuestionToolbar 
            numSelected={selected.length} 
            goToCreatePage={goToCreatePage} 
            goToEditPage={handleEditClick}
            goToSearchPage={goToSearchPage}
            handleDeleteClick={handleDeleteClick}
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

