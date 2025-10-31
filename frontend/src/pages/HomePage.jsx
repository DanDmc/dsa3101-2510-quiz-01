// src/pages/HomePage.jsx
import React, { useState } from 'react';
import { Grid, Box, Typography, CssBaseline } from '@mui/material';

import QuestionToolbar from '../components/QuestionToolbar';
import QuestionTable from '../components/QuestionTable';
import QuestionGroups from '../components/QuestionGroups';

// Unified and comprehensive list of mock groups
const mockGroups = [
  'DSA4288M','DSA4288S','DSA4288','DSA3102','DSA3101',
  'DSA2102','DSA2101','DSA1101','ST4248','ST3236','ST3131','ST2132','ST2131'
];

function HomePage({
  questions: propQuestions,
  goToCreatePage,
  goToEditPage,
  goToSearchPage,        // <-- from App (will navigate + store filters)
  goToHomePage,
  handleDeleteQuestions,
  isSafeDeletionEnabled,
  setIsSafeDeletionEnabled,
  // NEW:
  courseOptions,
  conceptOptions,
}) {
  const [selected, setSelected] = useState([]);
  const [groups, setGroups] = useState(mockGroups);

  // --- Helpers: normalize and forward filters/keyword to App ---
  // Accepts either a string or an object from the toolbar.
  const openSearchWith = (payload) => {
    let params = {};

    if (typeof payload === 'string') {
      // simple keyword
      params = { query: payload.trim() };
    } else if (payload && typeof payload === 'object') {
      // normalize possible fields from the orange-button filter UI
      const {
        query = '',
        course = '',
        question_type = '',
        assessment_type = '',
        academic_year, // in case the toolbar sends this
        year,          // or year directly
        semester = '',
        tags,          // array of strings
        concept_tags   // alt name
      } = payload;

      params = {
        query: (query || '').trim(),
        course: (course || '').toString().trim(),
        question_type: (question_type || '').toString().trim(),
        assessment_type: (assessment_type || '').toString().trim(),
        year: academic_year ?? year ?? '',     // prefer explicit year if given
        semester: (semester || '').toString().trim(),
        tags: Array.isArray(tags)
          ? tags.map(String)
          : Array.isArray(concept_tags)
            ? concept_tags.map(String)
            : []
      };
    } else {
      params = { query: '' };
    }

    // Hand off to App, which should:
    // - store params in state (e.g., setSearchParams(params))
    // - navigate to QuestionSearchPage
    goToSearchPage(params);
  };

  // --- Group Management (unchanged) ---
  const handleRenameGroup = (oldName, newName) => {
    if (!newName || (groups.includes(newName) && newName !== oldName)) return;
    setGroups(prev => prev.map(g => (g === oldName ? newName : g)));
  };
  const handleDeleteGroup = (groupName) => setGroups(prev => prev.filter(g => g !== groupName));

  // Selection + actions
  const handleSelectAllClick = (e) => {
    if (e.target.checked) setSelected(propQuestions.map(n => n.id));
    else setSelected([]);
  };
  const handleEditClick = () => {
    const questionsToEdit = propQuestions.filter(q => selected.includes(q.id));
    goToEditPage(questionsToEdit);
  };
  const handleDeleteClick = () => {
    handleDeleteQuestions(selected);
    setSelected([]);
  };
  const handleSafeDeletionToggle = (e) => setIsSafeDeletionEnabled(e.target.checked);

  return (
    <>
      <CssBaseline />
      <Grid container direction="column" rowSpacing={0}>
        {/* Toolbar row */}
        <Grid item xs={12}>
          <QuestionToolbar
            numSelected={selected.length}
            goToCreatePage={goToCreatePage}
            goToEditPage={handleEditClick}
            // ⬇️ Use the wrapper that supports keyword or full filter object
            goToSearchPage={openSearchWith}
            handleDeleteClick={handleDeleteClick}
            isSafeDeletionEnabled={isSafeDeletionEnabled}
            handleSafeDeletionToggle={handleSafeDeletionToggle}
            // NEW: feed options down
            courseOptions={courseOptions}
            conceptOptions={conceptOptions}
          />
        </Grid>

        {/* Content row */}
        <Grid item>
          <Grid container columnSpacing={16}>
            {/* LEFT: table */}
            <Grid item xs={12} md={9}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Typography variant="h6" component="h2" sx={{ fontWeight: 'bold' }}>
                  Questions in Group
                </Typography>

                <QuestionTable
                  questions={propQuestions}
                  selected={selected}
                  setSelected={setSelected}
                  onSelectAllClick={handleSelectAllClick}
                  goToEditPage={goToEditPage}
                />
              </Box>
            </Grid>

            {/* RIGHT: groups */}
            <Grid item xs={12} md={3}>
              <QuestionGroups
                groups={groups}
                onRenameGroup={handleRenameGroup}
                onDeleteGroup={handleDeleteGroup}
              />
            </Grid>
          </Grid>
        </Grid>
      </Grid>
    </>
  );
}

export default HomePage;
