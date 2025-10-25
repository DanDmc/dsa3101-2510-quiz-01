// src/pages/HomePage.jsx

import React, { useState } from 'react';
import { Grid, Box, Typography } from '@mui/material';

import QuestionToolbar from '../components/QuestionToolbar';
import QuestionTable from '../components/QuestionTable';
import QuestionGroups from '../components/QuestionGroups';

const mockQuestions = [
  { id: 1, text: 'Convert 1110010101 from binary to text', type: 'Open ended', difficultyManual: 0.5, difficultyGenerated: null },
  { id: 2, text: 'If a route function returns the string "Hello world!", the HTTP status...', type: 'Open ended', difficultyManual: 0.8, difficultyGenerated: null },
  { id: 3, text: 'How many 8-digit numbers can be formed using 2, 3, 4, 4, 5, 5, 5, 5?', type: 'Open ended', difficultyManual: 0.2, difficultyGenerated: null },
  { id: 4, text: 'In a simple regression, the RMSE of the regression line is equal to 0.6...', type: 'MCQ', difficultyManual: 0.6, difficultyGenerated: null },
  { id: 5, text: 'In an SQL database, a record with ID = 1 already exists. Another record...', type: 'MCQ', difficultyManual: 0.9, difficultyGenerated: null },
  { id: 6, text: 'Which of the following statement(s) is/are correct about primary keys...', type: 'MRQ', difficultyManual: 0.3, difficultyGenerated: null },
  { id: 7, text: 'You are testing a Flask API endpoint that checks book orders. The...', type: 'MRQ', difficultyManual: 0.7, difficultyGenerated: null },
  { id: 8, text: 'Correctly order the following steps using the Karush-Kuhn-Tucker (KKT)...', type: 'Ordering', difficultyManual: 0.44, difficultyGenerated: null },
  { id: 9, text: 'Order the typical stages of finding the Maximum Likelihood Estimator...', type: 'Ordering', difficultyManual: 0.32, difficultyGenerated: null },
  { id: 10, text: 'Match the term in the Karush-Kuhn-Tucker (KKT) necessary conditions...', type: 'Matching', difficultyManual: 0.25, difficultyGenerated: null },
  { id: 11, text: 'Match the following matrix or vector components from the Multiple...', type: 'Matching', difficultyManual: 0.41, difficultyGenerated: null },
  { id: 12, text: 'Match the estimator criterion to the correct principle or context it represents', type: 'Matching', difficultyManual: 0.12, difficultyGenerated: null },
];

const initialGroups = ['DSA4288M', 'DSA4288S', 'DSA4288', 'DSA3102', 'DSA3101', 'DSA2102', 'DSA2101', 'DSA1101','ST4248', 'ST3236', 'ST3131', 'ST2132', 'ST2131'];

function HomePage({ goToCreatePage, goToEditPage }) { 
  const [questions] = useState(mockQuestions);
  const [selected, setSelected] = useState([]);
  const [groups, setGroups] = useState(initialGroups);

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

  const handleSelectAllClick = (event) => {
    if (event.target.checked) {
      setSelected(questions.map((n) => n.id));
      return;
    }
    setSelected([]);
  };

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
          selectedIds={selected} 
          goToCreatePage={goToCreatePage} 
          goToEditPage={goToEditPage}
        />
      </Grid>

      {/* --- ROW 2: COLUMNS WITH HORIZONTAL SPACING --- */}
      <Grid item>
        <Grid
          container
          columnSpacing={13} 
        >
          
          {/* LEFT COLUMN: TEXT + TABLE (The starting point) */}
          <Grid item xs={12} md={9}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Typography variant="h6" component="h2" sx={{ fontWeight: 'bold' }}>
                Questions in Group
              </Typography>

              <QuestionTable 
                questions={questions}
                selected={selected}
                setSelected={setSelected}
                onSelectAllClick={handleSelectAllClick}
              />
            </Box>
          </Grid>

          {/* RIGHT COLUMN: GROUPS PANEL (Removed the misaligning margin) */}
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