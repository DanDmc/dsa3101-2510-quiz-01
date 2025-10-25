// src/components/QuestionStepper.jsx (FIXED: Displaying question_stem instead of placeholder)

import React from 'react';
import { Box, Card, Typography, List, ListItem, ListItemIcon, ListItemText, Divider } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RadioButtonCheckedIcon from '@mui/icons-material/RadioButtonChecked';

// CONSTANT for truncation
const MAX_LENGTH = 50; 

/**
 * Renders the sidebar with the list of questions (the stepper).
 */
function QuestionStepper({ questions, activeQuestion, setActiveQuestion }) {
  
  // Helper to get the icon based on question type (UNCHANGED)
  const getIconForType = (type) => {
    // Note: You can customize icons for different types (Open Ended, MRQ, etc.)
    return <RadioButtonCheckedIcon fontSize="small" color="primary" />; 
  };
  
  // Helper to truncate the question text (NEW)
  const truncateText = (text, maxLength) => {
    if (!text) return `Question (No Text)`;
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  return (
    <Card sx={{ p: 0, height: 'auto', width: '400px', ml: 4 }}>
      <Box sx={{ p: 2, backgroundColor: '#f0f0f0' }}>
        <Typography variant="subtitle1" fontWeight="bold">
          QUESTION ({questions.length})
        </Typography>
      </Box>
      <Divider />
      
      <List dense disablePadding>
        {questions.map((q, index) => (
          <ListItem
            key={q.id}
            button
            onClick={() => setActiveQuestion(q.id)}
            sx={{
              backgroundColor: activeQuestion === q.id ? '#e3f2fd' : 'transparent',
              borderLeft: activeQuestion === q.id ? '4px solid #1976d2' : 'none',
              py: 1,
              px: 2,
            }}
          >
            {/* 🌟 FIX APPLIED HERE */}
            <ListItemText 
              primary={truncateText(q.question_stem, MAX_LENGTH)} // Use truncated question_stem
              secondary={`Question (${index + 1})`} // Move the index to secondary for context
              sx={{ m: 0 }} 
              primaryTypographyProps={{ 
                noWrap: false, // Allow truncation instead of single-line overflow
                fontWeight: 'medium' 
              }}
            />
            {/* ------------------- */}
            
            <ListItemIcon sx={{ minWidth: 'auto', ml: 1 }}>
              {getIconForType(q.type)}
            </ListItemIcon>
          </ListItem>
        ))}
      </List>
      <Divider />
    </Card>
  );
}

export default QuestionStepper;