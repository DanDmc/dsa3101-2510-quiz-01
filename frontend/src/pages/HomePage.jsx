// src/pages/HomePage.jsx

import React, { useState } from 'react';
import { Grid, Box, Typography } from '@mui/material';

import QuestionToolbar from '../components/QuestionToolbar';
import QuestionTable from '../components/QuestionTable';
import QuestionGroups from '../components/QuestionGroups';

// Unified and comprehensive list of mock groups
const mockGroups = ['DSA4288M', 'DSA4288S', 'DSA4288', 'DSA3102', 'DSA3101', 'DSA2102', 'DSA2101', 'DSA1101','ST4248', 'ST3236', 'ST3131', 'ST2132', 'ST2131'];

function HomePage({ 
  questions: propQuestions, // Use propQuestions to refer to the data array prop
  goToCreatePage, 
  goToEditPage, 
  goToSearchPage, 
  goToHomePage, 
  handleDeleteQuestions,
  // 🌟 ISSUE 1 FIX: Receive the new props from App (main.jsx)
  isSafeDeletionEnabled,
  setIsSafeDeletionEnabled 
}) { 
  // KEPT: Local state for selected rows (needed for table interactivity)
  const [selected, setSelected] = useState([]);
  
  // KEPT: Local state for group management
  const [groups, setGroups] = useState(mockGroups); 

  // --- Group Management Handlers (UNCHANGED) ---

  // Handler function to rename a group
  const handleRenameGroup = (oldName, newName) => {
    if (!newName || (groups.includes(newName) && newName !== oldName)) {
      console.error("Invalid rename: New name is empty or already exists.");
      return;
    }

    setGroups(prevGroups => 
      prevGroups.map(group => (group === oldName ? newName : group))
    );
  };
  
  // Handler function to delete a group
  const handleDeleteGroup = (groupName) => {
    setGroups(prevGroups => 
      // Filter out the group name to be deleted
      prevGroups.filter(group => group !== groupName)
    );
  };
  
  // --- End Group Management Handlers ---

  // UPDATED: handleSelectAllClick now uses 'propQuestions'
  const handleSelectAllClick = (event) => {
    if (event.target.checked) {
      setSelected(propQuestions.map((n) => n.id)); 
      return;
    }
    setSelected([]);
  };

  // UPDATED: handleEditClick now uses 'propQuestions'
  const handleEditClick = () => {
    // 1. Filter to get the *objects* using the 'propQuestions' prop
    const questionsToEdit = propQuestions.filter(q => selected.includes(q.id)); 
    // 2. Pass the array of OBJECTS to the function from main.jsx
    goToEditPage(questionsToEdit); 
  };

  const handleDeleteClick = () => {
    // Pass the selected IDs up to the App component (main.jsx)
    handleDeleteQuestions(selected);
    
    // Clear the local selection state
    setSelected([]);
  };

  // 🌟 NEW HANDLER: For the safe deletion toggle
  const handleSafeDeletionToggle = (event) => {
      setIsSafeDeletionEnabled(event.target.checked);
  };

  // --- START OF JSX RENDER ---
  return (
    <Grid
      container
      direction="column"
      rowSpacing={0} 
    >
      
      {/* --- FULL WIDTH TOOLBAR (row 1) --- */}
      <Grid item xs={12}>
        <QuestionToolbar 
          numSelected={selected.length} 
          goToCreatePage={goToCreatePage} 
          goToEditPage={handleEditClick} 
          goToSearchPage={goToSearchPage}
          handleDeleteClick={handleDeleteClick}
          // 🌟 ISSUE 1 FIX: Pass the new props to QuestionToolbar for display
          isSafeDeletionEnabled={isSafeDeletionEnabled}
          handleSafeDeletionToggle={handleSafeDeletionToggle}
        />
      </Grid>

      {/* --- ROW 2: COLUMNS WITH HORIZONTAL SPACING --- */}
      <Grid item>
        <Grid
          container
          columnSpacing={16} 
        >
          
          {/* LEFT COLUMN: TEXT + TABLE */}
          <Grid item xs={12} md={9}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Typography variant="h6" component="h2" sx={{ fontWeight: 'bold' }}>
                Questions in Group
              </Typography>

              <QuestionTable 
                questions={propQuestions} // Use prop directly
                selected={selected}
                setSelected={setSelected}
                onSelectAllClick={handleSelectAllClick}
              />
            </Box>
          </Grid>

          {/* RIGHT COLUMN: GROUPS PANEL */}
          <Grid item xs={12} md={3} /* Removed sx={{ marginTop: 10 }} */> 
            <QuestionGroups 
              groups={groups} 
              onRenameGroup={handleRenameGroup} 
              onDeleteGroup={handleDeleteGroup} 
            />
          </Grid>

       </Grid>
      </Grid>

    </Grid>
  );
}

export default HomePage;