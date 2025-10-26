// src/components/QuestionStepper.jsx 

import React from 'react';
import { Box, Card, Typography, List, ListItem, ListItemIcon, ListItemText, Divider } from '@mui/material';
// 🌟 NEW IMPORTS for Goal 2
import EditNoteIcon from '@mui/icons-material/EditNote'; 
import CheckBoxOutlineBlankIcon from '@mui/icons-material/CheckBoxOutlineBlank'; 
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RadioButtonCheckedIcon from '@mui/icons-material/RadioButtonChecked';

// CONSTANT for truncation
const MAX_LENGTH = 23; 

/**
 * Renders the sidebar with the list of questions (the stepper).
 */
function QuestionStepper({ questions, activeQuestion, setActiveQuestion }) {
    
    // Helper to get the correct icon component based on question type
    const getQuestionTypeIcon = (type) => {
        const normalizedType = (type || '').toUpperCase();
        if (normalizedType.includes("OPEN ENDED")) {
            return <EditNoteIcon sx={{ color: '#525151' }} fontSize="small" />;
        }
        // Assuming 'MCQ' or 'Multiple choice' falls here
        return <CheckBoxOutlineBlankIcon sx={{ color: '#525151' }} fontSize="small" />;
    };
    
    // Helper to truncate the question text (UNCHANGED, now uses new MAX_LENGTH)
    const truncateText = (text, maxLength) => {
        if (!text) return `Question (No Text)`;
        const content = text || `Question (ID: ${activeQuestion})`; // Fallback if no text provided

        if (!content) return `Question (No Text)`;
        if (content.length <= maxLength) return content;
        return content.substring(0, maxLength) + '...';
    };

    return (
        <Card sx={{ p: 0, height: 'auto', width: '100%' }}> 
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
                            // Background color is grey (#EDEDED) for active state
                            backgroundColor: activeQuestion === q.id ? '#EDEDED' : 'transparent',
                            // Border color is orange (#F57F17) for active state
                            borderLeft: activeQuestion === q.id ? '4px solid #F57F17' : 'none',
                            py: 1.5, // 🌟 INCREASED vertical padding for extra height
                            px: 2,
                            alignItems: 'flex-start', 
                        }}
                    >
                        {/* Custom Question Number Element (UNCHANGED) */}
                        <Box
                            sx={{
                                display: 'flex',
                                justifyContent: 'center',
                                alignItems: 'center',
                                width: '24px', 
                                height: '24px', 
                                borderRadius: '8px', 
                                backgroundColor: '#E4E2E2', 
                                mr: 2, 
                                mt: 0.2, 
                                flexShrink: 0, 
                            }}
                        >
                            <Typography 
                                variant="caption" 
                                component="span" 
                                fontWeight="bold" 
                                sx={{ color: '#9E9E9E' }} 
                            >
                                {index + 1}
                            </Typography>
                        </Box>

                        {/* 🌟 NEW: Wrapper Box to hold the Question Stem and the Type Box in a column */}
                        <Box sx={{ display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
                            
                            {/* Question Stem (Primary Text) - Goal 1 implementation */}
                            <ListItemText 
                                primary={truncateText(q.question_stem || q.text, MAX_LENGTH)}
                                sx={{ m: 0, mb: 1 }} // Added margin-bottom to separate from the new box
                                primaryTypographyProps={{ 
                                    noWrap: false, 
                                    fontWeight: 'bold',
                                    color: '#525151',
                                }}
                            />
                            
                            {/* 🌟 NEW: Question Type Box - Goal 2 implementation */}
                            <Box
                                sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    p: 0.5,
                                    width: 'fit-content', // Only take necessary width
                                    borderRadius: '4px',
                                    backgroundColor: '#E4E2E2', // Grey background
                                }}
                            >
                                {/* Dynamic Icon */}
                                {getQuestionTypeIcon(q.type)}
                                
                                {/* Question Type Text */}
                                <Typography 
                                    variant="caption" 
                                    fontWeight="bold" 
                                    sx={{ 
                                        ml: 0.5, 
                                        color: '#525151', 
                                        lineHeight: 1 // Ensures compact vertical spacing
                                    }}
                                >
                                    {q.type ? q.type.toUpperCase().replace(' ', '') : 'N/A'}
                                </Typography>
                            </Box>
                        </Box>
                        
                    </ListItem>
                ))}
            </List>
            <Divider />
        </Card>
    );
}

export default QuestionStepper;