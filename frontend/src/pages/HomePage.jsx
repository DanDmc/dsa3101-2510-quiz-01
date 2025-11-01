// src/pages/HomePage.jsx

import React, { useState } from 'react';
// 1. IMPORT BUTTON
import {
  Grid,
  Box,
  Typography,
  CssBaseline,
  CircularProgress,
  Alert,
  Button,
} from '@mui/material';

import QuestionToolbar from '../components/QuestionToolbar';
import QuestionTable from '../components/QuestionTable';
import QuestionGroups from '../components/QuestionGroups';

// ❌ REMOVED: The hardcoded mockGroups list is no longer needed (from your HEAD logic)

function HomePage({
  questions: propQuestions,
  goToCreatePage,
  goToEditPage,
  goToSearchPage,
  goToHomePage,
  handleDeleteQuestions,

  // ⭐ Group Management Props (FROM YOUR HEAD)
  courseGroups,
  onAddGroup,
  onRenameGroup,
  onDeleteGroup,
  onFilterChange,
  isProcessing, // State for showing loading/processing feedback
  // NEW: Filter options for the Toolbar/Search Page (FROM INCOMING)
  courseOptions,
  conceptOptions,
  // 2. ACCEPT THE NEW PROP
  onGenerateDifficulty,
}) {
  const [selected, setSelected] = useState([]);

  // ⬅️ NEW: The wrapper function that handles the complex filter object (FROM INCOMING)
  const openSearchWith = (payload) => {
    let params = {};

    if (typeof payload === 'string') {
      params = { query: payload.trim() };
    } else if (payload && typeof payload === 'object') {
      const {
        query = '',
        course = '',
        question_type = '',
        assessment_type = '',
        academic_year,
        year,
        semester = '',
        tags,
        concept_tags,
      } = payload;

      params = {
        query: (query || '').trim(),
        course: (course || '').toString().trim(),
        question_type: (question_type || '').toString().trim(),
        assessment_type: (assessment_type || '').toString().trim(),
        year: academic_year ?? year ?? '',
        semester: (semester || '').toString().trim(),
        tags: Array.isArray(tags)
          ? tags.map(String)
          : Array.isArray(concept_tags)
          ? concept_tags.map(String)
          : [],
      };
    } else {
      params = { query: '' };
    }

    goToSearchPage(params);
  };
  // Handlers
  const handleSelectAllClick = (event) => {
    if (event.target.checked) {
      setSelected(propQuestions.map((n) => n.id));
      return;
    }
    setSelected([]);
  };

  const handleEditClick = () => {
    const questionsToEdit = propQuestions.filter((q) => selected.includes(q.id));
    goToEditPage(questionsToEdit);
  };

  const handleDeleteClick = () => {
    handleDeleteQuestions(selected); // Calls the hard delete wrapper in main.jsx
    setSelected([]);
  };

  // ❌ DELETED: handleSafeDeletionToggle is removed
  // ❌ DELETED: handleRenameGroup/handleDeleteGroup from Incoming are removed (Using HEAD's props/logic)

  // --- START OF JSX RENDER ---
  return (
    <>
      <CssBaseline />

      {/* ⭐ Display processing feedback */}
      {isProcessing && (
        <Alert severity="info" sx={{ mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CircularProgress size={16} />
            <Typography variant="body2">
              Processing operation... Please wait.
            </Typography>
          </Box>
        </Alert>
      )}

      <Grid container direction="column" rowSpacing={0}>
        {/* --- FULL WIDTH TOOLBAR (row 1) --- */}
        <Grid item xs={12}>
          <QuestionToolbar
            numSelected={selected.length}
            goToCreatePage={goToCreatePage}
            goToEditPage={handleEditClick}
            goToSearchPage={openSearchWith} // ⬅️ NEW: Use the wrapper function
            // ⬅️ Pass processing state to disable toolbar buttons
            disabled={isProcessing}
            handleDeleteClick={handleDeleteClick}
            // ⬅️ NEW: Feed options down for the filter menu
            courseOptions={courseOptions}
            conceptOptions={conceptOptions}
          />
        </Grid>

        {/* --- ROW 2: COLUMNS WITH HORIZONTAL SPACING --- */}
        <Grid item>
          <Grid container columnSpacing={16}>
            {/* LEFT COLUMN: TEXT + TABLE */}
            <Grid item xs={12} md={9}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {/* 3. ADD THE HEADER BOX WITH BUTTON */}
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <Typography
                    variant="h6"
                    component="h2"
                    sx={{ fontWeight: 'bold' }}
                  >
                    Questions in Group
                  </Typography>

                  <Button
                    variant="contained"
                    onClick={onGenerateDifficulty}
                    disabled={isProcessing}
                    sx={{
                      backgroundColor: '#F48828',
                      color: '#FFFFFF',
                      fontWeight: 'bold',
                      '&:hover': {
                        backgroundColor: '#D3731E', // A slightly darker orange
                      },
                    }}
                  >
                    Generate Difficulty
                  </Button>
                </Box>

                <QuestionTable
                  questions={propQuestions}
                  selected={selected}
                  setSelected={setSelected}
                  onSelectAllClick={handleSelectAllClick}
                  // ⬅️ Pass processing state
                  disabled={isProcessing}
                  // ⬅️ Pass goToEditPage for double-click feature
                  goToEditPage={goToEditPage}
                />
              </Box>
            </Grid>

            {/* RIGHT COLUMN: GROUPS PANEL */}
            <Grid item xs={12} md={3}>
              <QuestionGroups
                groups={courseGroups} // ⬅️ Uses HEAD's dynamic groups
                onAddGroup={onAddGroup}
                onRenameGroup={onRenameGroup}
                onDeleteGroup={onDeleteGroup}
                onFilterChange={onFilterChange}
                // ⬅️ Pass processing state to QuestionGroups
                disabled={isProcessing}
              />
            </Grid>
          </Grid>
        </Grid>
      </Grid>
    </>
  );
}

export default HomePage;