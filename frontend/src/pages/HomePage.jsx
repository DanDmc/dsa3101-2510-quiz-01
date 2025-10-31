// src/pages/HomePage.jsx

import React, { useState } from 'react';
// Imports remain correct, including Grid, Box, Typography, CssBaseline, CircularProgress, Alert
import { Grid, Box, Typography, CssBaseline, CircularProgress, Alert } from '@mui/material'; 

import QuestionToolbar from '../components/QuestionToolbar';
import QuestionTable from '../components/QuestionTable';
import QuestionGroups from '../components/QuestionGroups';

// REMOVED: The hardcoded mockGroups list is no longer needed

function HomePage({ 
    questions: propQuestions, 
    goToCreatePage, 
    goToEditPage, 
    goToSearchPage, 
    goToHomePage, 
    handleDeleteQuestions,
    isSafeDeletionEnabled,
    setIsSafeDeletionEnabled,
    
    // ⭐ MODIFICATION 1: Receive ALL new dynamic props
    courseGroups, 
    onAddGroup, 
    onRenameGroup, 
    onDeleteGroup,
    onFilterChange,
    isProcessing // State for showing loading/processing feedback
}) { 
    // KEPT: Local state for selected rows
    const [selected, setSelected] = useState([]);
    
    // Handlers remain unchanged

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

    // --- START OF JSX RENDER ---
    return (
        <>
            <CssBaseline /> 
            
            {/* ⭐ MODIFICATION 2: Display processing feedback */}
            {isProcessing && (
                <Alert severity="info" sx={{ mb: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <CircularProgress size={16} />
                        <Typography variant="body2">Processing group operation... Please wait.</Typography>
                    </Box>
                </Alert>
            )}

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
                        // ⭐ MODIFICATION 3: Pass processing state to disable toolbar buttons
                        disabled={isProcessing} 
                        handleDeleteClick={handleDeleteClick}
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
                                    questions={propQuestions} 
                                    selected={selected}
                                    setSelected={setSelected}
                                    onSelectAllClick={handleSelectAllClick}
                                    // ⭐ MODIFICATION 4: Pass processing state to QuestionTable
                                    disabled={isProcessing}
                                />
                            </Box>
                        </Grid>

                        {/* RIGHT COLUMN: GROUPS PANEL */}
                        <Grid item xs={12} md={3} /* Removed sx={{ marginTop: 10 }} */> 
                            <QuestionGroups 
                                groups={courseGroups} 
                                onAddGroup={onAddGroup}
                                onRenameGroup={onRenameGroup} 
                                onDeleteGroup={onDeleteGroup} 
                                onFilterChange={onFilterChange}
                                // ⭐ MODIFICATION 5: Pass processing state to QuestionGroups
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