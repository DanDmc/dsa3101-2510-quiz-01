// src/components/QuestionForm.jsx (Updated to remove image functionality)

import React from 'react';
import { 
  Box, Card, CardContent, Grid, Select, MenuItem, 
  FormControl, InputLabel, Typography, TextField, 
  Switch, Button, Checkbox, FormControlLabel, IconButton 
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';

function QuestionForm({ activeQuestion }) {
  const mockChoices = [1, 2, 3]; 

  return (
    <Card>
      <CardContent>
        {/* Dropdowns and Required Toggle */}
        <Box sx={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center', mb: 4, gap: 2 }}>
          
          <FormControl variant="outlined" size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Multiple choice</InputLabel>
            <Select label="Multiple choice" value="Multiple choice">
              <MenuItem value="Multiple choice">Multiple choice</MenuItem>
              <MenuItem value="Open ended">Open ended</MenuItem>
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
          <IconButton size="small"><Box sx={{ width: 20, height: 20, border: '1px solid gray', borderRadius: '50%' }} /></IconButton>

        </Box>

        {/* Question Input Area - Now uses full 12 columns since image is removed */}
        <Grid container spacing={2}>
          <Grid item xs={12}> {/* 🛠️ FIX 2: Changed to xs=12 to take up full row width */}
            <Typography variant="body1" fontWeight="bold" gutterBottom>Question 1*</Typography>
            <TextField
              fullWidth
              multiline
              rows={4}
              placeholder="Fill in question text..."
              variant="outlined"
              defaultValue={activeQuestion?.text}
              sx={{ backgroundColor: '#f9f9f9' }}
            />
          </Grid>
          {/* Removed the image placeholder Grid item */}
        </Grid>
        
        {/* Choices Section */}
        <Box mt={3}>
          <Typography variant="body1" fontWeight="bold">Choices*</Typography>
          
          {/* Removed the "Question with Image" Switch */}
          
          {mockChoices.map((index) => (
            <Box key={index} sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <Checkbox color="primary" disabled />
              <TextField
                fullWidth
                variant="outlined"
                size="small"
                placeholder={`Enter option ${index} here`}
                sx={{ mr: 1 }}
              />
              <IconButton size="small" aria-label="delete">
                <DeleteIcon color="error" />
              </IconButton>
            </Box>
          ))}

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

export default QuestionForm;