// src/components/EditQuestionForm.jsx

import React from 'react';
import { 
  Box, Card, CardContent, Grid, Select, MenuItem, 
  FormControl, InputLabel, Typography, TextField, 
  Switch, Button, IconButton 
} from '@mui/material';
import MoreVertIcon from '@mui/icons-material/MoreVert'; // For the three dots menu
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';


/**
 * Renders a single question editing form for the mass edit page.
 * @param {object} props - Component props.
 * @param {number} props.questionNumber - The display number of the question (e.g., 1, 2).
 * @param {object} props.question - The question object to be edited.
 * @param {function} props.onQuestionChange - Callback for when a question field changes.
 */
function EditQuestionForm({ questionNumber, question, onQuestionChange }) {

  // --- FIXED: This handler now passes the *entire updated question object* ---
  const handleTextChange = (event) => {
    const updatedQuestion = { ...question, question_stem: event.target.value };
    onQuestionChange(updatedQuestion);
  };

  // --- FIXED: This handler now passes the *entire updated question object* ---
  const handleAnswerChange = (event) => {
    const updatedQuestion = { ...question, answer: event.target.value };
    onQuestionChange(updatedQuestion);
  };

  // --- FIXED: This handler now passes the *entire updated question object* ---
  const handleTypeChange = (event) => {
    const updatedQuestion = { ...question, question_type: event.target.value };
    onQuestionChange(updatedQuestion);
  };

  return (
    <Card sx={{ ml: 6 }}>
      <CardContent>
        {/* Dropdowns and Required Toggle */}
        <Box sx={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center', mb: 3, gap: 2, width: '800px' }}>
          
          <FormControl variant="outlined" size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Type</InputLabel>
            <Select 
              label="Type" 
              // --- FIXED: Use 'question_type' and provide a fallback ---
              value={question.question_type || 'Open-ended'} 
              onChange={handleTypeChange}
            >
              <MenuItem value="Open-ended">Open-ended</MenuItem>
              <MenuItem value="MCQ">MCQ</MenuItem>
              <MenuItem value="MRQ">MRQ</MenuItem>
              <MenuItem value="Ordering">Ordering</MenuItem>
              <MenuItem value="Matching">Matching</MenuItem>
            </Select>
          </FormControl>

          <FormControl variant="outlined" size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Tagging</InputLabel>
            <Select label="Tagging" value="Tagging">
              <MenuItem value="Tagging">Tagging</MenuItem>
              <MenuItem value="None">None</MenuItem>
            </Select>
          </FormControl>
          
          <Box sx={{ flexGrow: 1 }} />
          
          <Typography variant="body2" sx={{ fontWeight: 'bold' }}>Required</Typography>
          <Switch defaultChecked color="success" />
          <IconButton size="small" aria-label="more options">
            <MoreVertIcon /> {/* Three dots icon */}
          </IconButton>

        </Box>

        {/* Question Input Area */}
        <Grid container spacing={2} >
          <Grid item xs={12}> 
            <Typography variant="body1" fontWeight="bold" gutterBottom>Question {questionNumber}*</Typography>
            <TextField
              fullWidth
              multiline
              rows={6}
              placeholder="Enter your question here."
              variant="outlined"
              // --- FIXED: Use 'question_stem' instead of 'text' ---
              value={question.question_stem || ''} 
              onChange={handleTextChange}
              sx={{ backgroundColor: '#f9f9f9' }}
            />
          </Grid>
          {/* Removed the image placeholder Grid item */}
        </Grid>
        
        {/* Answer Section (for Open-ended) */}
        <Box mt={3}>
          <Typography variant="body1" fontWeight="bold">Answer*</Typography>
          {/* Removed "Question with Image" Switch */}
          
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
            <TextField
              fullWidth
              multiline
              rows={2} // Allow multiple lines for answer
              variant="outlined"
              size="small"
              placeholder="Enter answer here"
              value={question.answer || ''} // This assumes an 'answer' property
              onChange={handleAnswerChange}
              sx={{ mr: 1 }}
            />
            <IconButton size="small" aria-label="delete answer">
              <DeleteIcon color="error" />
            </IconButton>
          </Box>
          
          <Button 
            variant="text" 
            startIcon={<AddIcon />} 
            sx={{ mt: 1, textTransform: 'none', color: '#007bff' }}
          >
            Add answers
          </Button>
        </Box>
        
      </CardContent>
    </Card>
  );
}

export default EditQuestionForm;
