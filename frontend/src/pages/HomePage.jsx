// src/pages/HomePage.jsx

import React, { useState } from 'react';
import { Grid, Box, Typography, CssBaseline } from '@mui/material';

import QuestionToolbar from '../components/QuestionToolbar';
import QuestionTable from '../components/QuestionTable';
import QuestionGroups from '../components/QuestionGroups';

// 🌟 NEW: API_BASE for download
const API_BASE = import.meta.env.VITE_APP_API_URL;

const mockGroups = [
  'DSA4288M', 'DSA4288S', 'DSA4288', 'DSA3102', 'DSA3101', 
  'DSA2102', 'DSA2101', 'DSA1101', 'ST4248', 'ST3236', 
  'ST3131', 'ST2132', 'ST2131'
];

function HomePage({ 
  questions: propQuestions,
  goToCreatePage, 
  goToEditPage, 
  goToSearchPage, 
  goToHomePage, 
  handleDeleteQuestions,
  isSafeDeletionEnabled,
  setIsSafeDeletionEnabled 
}) { 
  const [selected, setSelected] = useState([]);
  const [groups, setGroups] = useState(mockGroups);

  // --- Group Management Handlers ---
  const handleRenameGroup = (oldName, newName) => {
    if (!newName || (groups.includes(newName) && newName !== oldName)) {
      console.error("Invalid rename: New name is empty or already exists.");
      return;
    }
    setGroups(prevGroups => prevGroups.map(group => (group === oldName ? newName : group)));
  };
  
  const handleDeleteGroup = (groupName) => {
    setGroups(prevGroups => prevGroups.filter(group => group !== groupName));
  };

  // --- Table selection handlers ---
  const handleSelectAllClick = (event) => {
    if (event.target.checked) {
      setSelected(propQuestions.map((n) => n.id));
      return;
    }
    setSelected([]);
  };

  const handleEditClick = () => {
    const questionsToEdit = propQuestions.filter(q => selected.includes(q.id));
    goToEditPage(questionsToEdit);
  };

  const handleDeleteClick = () => {
    handleDeleteQuestions(selected);
    setSelected([]);
  };

  const handleSafeDeletionToggle = (event) => {
    setIsSafeDeletionEnabled(event.target.checked);
  };

  // 🌟 NEW: Download Selected Questions (like individual download)
  const handleDownloadSelected = () => {
    if (selected.length === 0) return;

    selected.forEach((id) => {
      const question = propQuestions.find(q => q.id === id);
      if (question && question.file_id) {
        const downloadUrl = `${API_BASE}/files/${question.file_id}/download`;
        window.open(downloadUrl, '_blank');
      }
    });
  };

  return (
    <>
      <CssBaseline />
      <Grid container direction="column" rowSpacing={0}>
        
        {/* Toolbar */}
        <Grid item xs={12}>
          <QuestionToolbar 
            numSelected={selected.length} 
            goToCreatePage={goToCreatePage} 
            goToEditPage={handleEditClick} 
            goToSearchPage={goToSearchPage}
            handleDeleteClick={handleDeleteClick}
            isSafeDeletionEnabled={isSafeDeletionEnabled}
            handleSafeDeletionToggle={handleSafeDeletionToggle}
          />
        </Grid>

        {/* Main content */}
        <Grid item>
          <Grid container columnSpacing={16}>
            
            {/* Left column: Questions */}
            <Grid item xs={12} md={9}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Typography variant="h6" component="h2" sx={{ fontWeight: 'bold' }}>
                    Questions in Group
                  </Typography>

                  {/* Download Selected Button */}
                  <button
                    variant="contained"
                    onClick={handleDownloadSelected}
                    disabled={selected.length === 0}
                    style={{
                      backgroundColor: '#388E3C',
                      color: 'white',
                      border: 'none',
                      padding: '6px 12px',
                      borderRadius: '4px',
                      cursor: selected.length === 0 ? 'not-allowed' : 'pointer'
                    }}
                  >
                    Download Selected
                  </button>
                </Box>

                <QuestionTable 
                  questions={propQuestions}
                  selected={selected}
                  setSelected={setSelected}
                  onSelectAllClick={handleSelectAllClick}
                />
            </Box>
            </Grid>

            {/* Right column: Groups */}
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
