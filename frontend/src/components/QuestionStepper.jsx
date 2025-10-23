// src/components/QuestionStepper.jsx

import React from 'react';
import { Box, Card, Typography, List, ListItem, ListItemIcon, ListItemText, Divider } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RadioButtonCheckedIcon from '@mui/icons-material/RadioButtonChecked';

/**
 * Renders the sidebar with the list of questions (the stepper).
 */
function QuestionStepper({ questions, activeQuestion, setActiveQuestion }) {
  
  // Helper to get the icon based on question type
  const getIconForType = (type) => {
    // Note: You can customize icons for different types (Open Ended, MRQ, etc.)
    return <RadioButtonCheckedIcon fontSize="small" color="primary" />; 
  };
  
  return (
    <Card sx={{ p: 0, height: 'auto' }}>
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
            <ListItemText primary={`Question (${index + 1})`} secondary={q.text} sx={{ m: 0 }} />
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