// src/components/QuestionGroups.jsx

import React from 'react';
import { 
  Box, Button, Card, CardContent, CardHeader, 
  List, ListItem, ListItemButton, ListItemText, 
  IconButton, Divider 
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';

function QuestionGroups({ groups }) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 , width: '450px'}}>
      <Button 
        variant="contained" 
        startIcon={<AddIcon />} 
        fullWidth
        sx={{ backgroundColor: '#2196f3' }} // Blue
      >
        Add new group
      </Button>
      
      <Card>
        <CardHeader 
          title="Question Groups"
          titleTypographyProps={{ variant: 'h6', fontSize: '1.1rem' }}
          sx={{ backgroundColor: '#e0e0e0' }} // Grey header
        />
        <CardContent sx={{ p: 0 }}>
          <List dense>
            {/* Hardcoded items from your design */}
            <ListItemButton selected>
              <ListItemText primary="Show All Questions" />
            </ListItemButton>
            <ListItemButton>
              <ListItemText primary="Show Questions Without Groups" />
            </ListItemButton>
            
            <Divider sx={{ my: 1 }} />
            
            {/* Dynamic items */}
            {groups.map((groupName) => (
              <ListItem
                key={groupName}
                secondaryAction={
                  <>
                    <IconButton edge="end" aria-label="edit">
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton edge="end" aria-label="delete">
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </>
                }
              >
                <ListItemText primary={groupName} />
              </ListItem>
            ))}
          </List>
        </CardContent>
      </Card>
    </Box>
  );
}

export default QuestionGroups;