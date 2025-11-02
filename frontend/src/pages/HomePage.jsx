/**
 * @file HomePage component.
 * @module pages/HomePage
 * Renders the main dashboard for the application. It displays the primary table 
 * of questions, the filtering panel for managing question groups, and the main 
 * toolbar for global actions.
 *
 * This page manages the current question selection (`selected` IDs) and passes 
 * various event handlers to its children to manage navigation, group filtering, 
 * bulk deletion, and processing feedback.
 *
 * @typedef {object} QuestionData
 * @property {number} id - The question's ID.
 * @property {string} question_stem - The question text.
 * * @typedef {object} FilterOption
 * @property {string} key - The unique identifier for the option.
 * @property {string} label - The display name for the option.
 *
 * @param {object} props The component props.
 * @param {Array<QuestionData>} props.questions - The list of questions currently displayed based on the root filter/search state.
 * @param {function(): void} props.goToCreatePage - Navigation handler to the question creation page.
 * @param {function(Array<QuestionData>): void} props.goToEditPage - Navigation handler to the edit page with selected questions.
 * @param {function(object): void} props.goToSearchPage - Handler used to trigger an advanced search query in the parent context.
 * @param {function(): void} props.goToHomePage - Navigation handler to reset to the default home state.
 * @param {function(Array<number>): void} props.handleDeleteQuestions - Handler for bulk deleting the specified question IDs.
 * @param {Array<string>} props.courseGroups - The list of existing question groups (used by QuestionGroups).
 * @param {function(): void} props.onAddGroup - Handler to add a new question group.
 * @param {function(string, string): void} props.onRenameGroup - Handler to rename a question group.
 * @param {function(string): void} props.onDeleteGroup - Handler to delete a question group.
 * @param {function(Array<string>): void} props.onFilterChange - Handler for updating the active group filters.
 * @param {boolean} props.isProcessing - State flag indicating if an asynchronous operation (e.g., loading, saving, deletion) is currently running.
 * @param {Array<FilterOption>} props.courseOptions - Course options for the toolbar filter menu.
 * @param {Array<string>} props.conceptOptions - Concept tag options for the toolbar filter menu.
 * @param {function(): void} props.onGenerateDifficulty - Handler triggered by the "Generate Difficulty" button to start model prediction.
 * @returns {JSX.Element} The primary dashboard layout.
 */

// src/pages/HomePage.jsx

import React, { useState } from 'react';
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

function HomePage({
  questions: propQuestions,
  goToCreatePage,
  goToEditPage,
  goToSearchPage,
  goToHomePage,
  handleDeleteQuestions,

  // Group Management Props
  courseGroups,
  onAddGroup,
  onRenameGroup,
  onDeleteGroup,
  onFilterChange,
  isProcessing, // State for showing loading/processing feedback
  // Filter options for the Toolbar/Search Page
  courseOptions,
  conceptOptions,
  // 2. ACCEPT THE NEW PROP
  onGenerateDifficulty,
}) {
  const [selected, setSelected] = useState([]);

  // The wrapper function that handles the complex filter object
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
  
  // --- DOWNLOAD SELECTED BUTTON HANDLER MOVED HERE ---
  // --- DOWNLOAD SELECTED BUTTON HANDLER MODIFIED FOR POPUP ---
const handleDownloadSelected = async () => {
    if (selected.length === 0) return;

    // 1. Identify all selected questions
    const selectedQuestions = propQuestions.filter((q) => selected.includes(q.id));

    // 2. Separate questions into downloadable and blocked groups
    const questionsToDownload = [];
    const questionsMissingFileId = [];

    for (const q of selectedQuestions) {
        if (q.file_id) {
            questionsToDownload.push(q);
        } else {
            questionsMissingFileId.push(q);
        }
    }

    // 3. CRITICAL CHECK: Show alert if any questions are blocked
    if (questionsMissingFileId.length > 0) {
        const totalBlocked = questionsMissingFileId.length;
        const totalSelected = selected.length;
        
        let message = `⚠️ Warning: ${totalBlocked} of the ${totalSelected} selected question(s) cannot be downloaded.`;
        
        if (totalBlocked === totalSelected) {
            message = '🚫 **Download Failed:** None of the selected questions have an associated source file (file_id) in the database. Download canceled.';
            alert(message);
            return; // Stop the function entirely if nothing can be downloaded
        } else {
            message += ` They are missing a source file (file_id). Only the remaining ${questionsToDownload.length} question(s) will be downloaded.`;
            alert(message);
            // Function continues to download the valid ones
        }
    }

    // 4. Proceed with download for valid questions
    try {
        for (const question of questionsToDownload) {
            const qId = question.id;
            const qStemSnippet = question.question_stem.substring(0, 50) + '...'; // Get first 50 chars for snippet
            
            const res = await fetch(`http://localhost:5001/files/${question.file_id}/download`, {
                method: 'GET',
            });

            if (!res.ok) {
                // Inform user about a single download failure without blocking the rest
                alert(`Error: The question with Question ID ${qId} (Status: ${qStemSnippet}) has no associated valid file id.`);
                console.error(`Failed to download file for question ${qId} (File ID ${question.file_id}): HTTP Status ${res.status}`);
                continue;
            }

            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = question.file_name || `question_${question.question_base_id || qId}.pdf`; 
            
            // Trigger download and cleanup
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
        }
        
    } catch (err) {
        console.error("Global download error:", err);
        alert('A network error occurred during download. Check the console for global error details.');
    }
 };
  // --- END DOWNLOAD HANDLER ---

  // --- START OF JSX RENDER ---
  return (
    <>
      <CssBaseline />

      {/* Display processing feedback */}
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
            goToSearchPage={openSearchWith} // Use the wrapper function
            // Pass processing state to disable toolbar buttons
            disabled={isProcessing}
            handleDeleteClick={handleDeleteClick}
            // Feed options down for the filter menu
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
                {/* HEADER BOX WITH BUTTONS */}
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

                  {/* BUTTONS WRAPPER: Ensures correct ordering and spacing */}
                    <Box sx={{ display: 'flex', gap: 1 }}>
                        
                        {/* 1. NEW DOWNLOAD SELECTED BUTTON (Left) */}
                        <Button
                            variant="contained"
                            onClick={handleDownloadSelected}
                            disabled={selected.length === 0 || isProcessing}
                            sx={{
                                backgroundColor: '#F57F17', // Custom color from original button
                                color: 'white',
                                fontWeight: 'bold',
                                '&:hover': {
                                    backgroundColor: '#e67315',
                                },
                            }}
                        >
                            Download Files Selected
                        </Button>
                        
                        {/* 2. EXISTING GENERATE DIFFICULTY BUTTON (Right) */}
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
                </Box>

                <QuestionTable
                  questions={propQuestions}
                  selected={selected}
                  setSelected={setSelected}
                  onSelectAllClick={handleSelectAllClick}
                  // Pass processing state
                  disabled={isProcessing}
                  // Pass goToEditPage for double-click feature
                  goToEditPage={goToEditPage}
                />
              </Box>
            </Grid>

            {/* RIGHT COLUMN: GROUPS PANEL */}
            <Grid item xs={12} md={3}>
              <QuestionGroups
                groups={courseGroups} // dynamic groups
                onAddGroup={onAddGroup}
                onRenameGroup={onRenameGroup}
                onDeleteGroup={onDeleteGroup}
                onFilterChange={onFilterChange}
                // Pass processing state to QuestionGroups
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