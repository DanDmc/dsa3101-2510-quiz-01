// src/components/QuestionGroups.jsx

import React, { useState } from 'react';
import { 
  Box, Button, Card, CardContent, 
  List, ListItem, ListItemButton, ListItemText, 
  IconButton, TextField, InputAdornment,
  Typography // <--- ADDED: Import Typography
} from '@mui/material';
// NEW IMPORT: Use AddCircle for the icon
import AddCircleIcon from '@mui/icons-material/AddCircle'; 
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import CheckIcon from '@mui/icons-material/Check'; 
import CloseIcon from '@mui/icons-material/Close'; 

// Define constants for the special filter keys
const ALL_QUESTIONS_KEY = 'ALL_QUESTIONS';
const NO_GROUPS_KEY = 'NO_GROUPS'; 

// Define a common style for the selected item background override
const SELECTED_ITEM_SX = {
    // Target the selected state using the '&.Mui-selected' selector
    '&.Mui-selected': {
        backgroundColor: '#BDBDBD', // Your desired grey color
        color: 'black',
    },
    // Keep the highlight color the same grey on hover when selected
    '&.Mui-selected:hover': {
        backgroundColor: '#BDBDBD',
    },
};

// Approximate height of one dense list item (used for calculation)
const ITEM_HEIGHT = 40; 
// The number of dynamic group items visible at once
const VISIBLE_ITEM_COUNT = 5;
// Fine-tuning variable: Set by the user
const SCROLL_HEIGHT_ADJUSTMENT = 15; // User-set value

// Calculate the maximum height for the scrollable area
const MAX_GROUP_ITEMS_HEIGHT = (VISIBLE_ITEM_COUNT * ITEM_HEIGHT) - SCROLL_HEIGHT_ADJUSTMENT;

// Border color constant
const BORDER_COLOR = '#B8B8B8';

function QuestionGroups({ groups, onRenameGroup, onDeleteGroup }) { 
    const [selectedFilters, setSelectedFilters] = useState(new Set([ALL_QUESTIONS_KEY]));
    const [editingGroupName, setEditingGroupName] = useState(null);
    const [newGroupName, setNewGroupName] = useState('');

    // --- Handler Logic (UNCHANGED) ---
    const handleFilterClick = (filterKey) => {
        setEditingGroupName(null); 

        setSelectedFilters(prevFilters => {
            const newFilters = new Set(prevFilters);
            
            if (filterKey === ALL_QUESTIONS_KEY) {
                if (newFilters.has(ALL_QUESTIONS_KEY)) {
                    newFilters.delete(ALL_QUESTIONS_KEY);
                } else {
                    return new Set([ALL_QUESTIONS_KEY]);
                }
            } else { 
                if (newFilters.has(ALL_QUESTIONS_KEY)) {
                    newFilters.clear();
                }
                
                if (newFilters.has(filterKey)) {
                    newFilters.delete(filterKey);
                } else {
                    newFilters.add(filterKey);
                }
            }
            
            if (newFilters.size === 0) {
                return new Set([ALL_QUESTIONS_KEY]);
            }
            
            return newFilters;
        });
    };

    const handleStartEdit = (e, groupName) => {
        e.stopPropagation(); 
        if (!isAllSelected) {
            setEditingGroupName(groupName);
            setNewGroupName(groupName);
        }
    };
    
    const handleSaveEdit = (groupName) => {
        if (newGroupName.trim() && newGroupName.trim() !== groupName) {
            if (onRenameGroup) {
                onRenameGroup(groupName, newGroupName.trim());
            }
        }
        setEditingGroupName(null); 
        setNewGroupName('');
    };

    const handleCancelEdit = () => {
        setEditingGroupName(null);
        setNewGroupName('');
    };

    const handleDeleteClick = (e, groupName) => {
        e.stopPropagation(); 
        setSelectedFilters(prevFilters => {
            const newFilters = new Set(prevFilters);
            newFilters.delete(groupName);
            if (newFilters.size === 0) {
                return new Set([ALL_QUESTIONS_KEY]);
            }
            return newFilters;
        });
        
        if (onDeleteGroup) {
            onDeleteGroup(groupName); 
        }
    }
    
    const isAllSelected = selectedFilters.has(ALL_QUESTIONS_KEY);

    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 , width: '450px'}}>
        
        {/* --- NEW HEADER STRUCTURE --- */}
        <Box sx={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
          }}>
            {/* Question Groups Title (Left) */}
            <Typography variant="h6" component="h2" sx={{ fontWeight: 'bold' }}>
              Question Groups
            </Typography>

            {/* Add New Group Button (Right) - MODIFIED STYLES AND ICON */}
            <Button 
              variant="contained" 
              // Replace AddIcon with the custom icon component
              startIcon={<AddCircleIcon sx={{ color: '#212121' }} />} 
              size="small" 
              disableElevation // Remove shadow for a flatter look
              sx={{ 
                // 2. Fill the inside color grey (#EFF2EF)
                backgroundColor: '#EFF2EF', 
                // 1. Add a grey (#B8B8B8) border color
                border: `1px solid ${BORDER_COLOR}`, 
                // 3. Make the text color grey (#747775)
                color: '#747775',
                // Ensure hover state keeps the background consistent if needed
                '&:hover': {
                  backgroundColor: '#EFF2EF', 
                }
              }}
            >
              Add new group
            </Button>
        </Box>
        
        {/* Card Container for Group List */}
        <Card sx={{ 
          border: `1px solid ${BORDER_COLOR}`,
          borderRadius: 0 // Removed rounded corners
        }}> 
          <CardContent sx={{ p: 0 }}>
            <List dense sx={{ paddingTop: 0 }}> 
              
              {/* 1. Show All Questions (Key: ALL_QUESTIONS_KEY) */}
              <ListItemButton 
                selected={isAllSelected}
                onClick={() => handleFilterClick(ALL_QUESTIONS_KEY)}
                sx={{ 
                  ...SELECTED_ITEM_SX, 
                  borderBottom: `1px solid ${BORDER_COLOR}` 
                }}
              >
                <ListItemText primary="Show All Questions" />
              </ListItemButton>
              
              {/* 2. Show Questions Without Groups (Key: NO_GROUPS_KEY) */}
              <ListItemButton
                selected={selectedFilters.has(NO_GROUPS_KEY)}
                onClick={() => handleFilterClick(NO_GROUPS_KEY)}
                sx={{ 
                  ...SELECTED_ITEM_SX, 
                  borderBottom: `1px solid ${BORDER_COLOR}` 
                }}
              >
                <ListItemText primary="Show Questions Without Groups" />
              </ListItemButton>
              
              {/* 3. Dynamic Group Items Container */}
              <Box 
                sx={{ 
                  maxHeight: MAX_GROUP_ITEMS_HEIGHT, 
                  overflowY: 'auto', 
                  '&::-webkit-scrollbar': { width: '4px' }, 
                  '&::-webkit-scrollbar-thumb': { backgroundColor: '#ccc', borderRadius: '2px' }
                }}
              >
              {groups.map((groupName) => (
                <ListItem
                  key={groupName}
                  component={editingGroupName === groupName ? 'div' : ListItemButton}
                  selected={selectedFilters.has(groupName)}
                  onClick={editingGroupName === groupName ? null : () => handleFilterClick(groupName)}
                  sx={{ 
                    ...SELECTED_ITEM_SX, 
                    borderBottom: `1px solid ${BORDER_COLOR}` 
                  }}
                  secondaryAction={
                    // ... (secondary action remains unchanged)
                    editingGroupName !== groupName ? (
                        <>
                            <IconButton 
                                edge="end" 
                                aria-label="edit" 
                                size="small" 
                                disabled={isAllSelected}
                                onClick={(e) => handleStartEdit(e, groupName)}
                                sx={{ color: isAllSelected ? undefined : '#1976D2' }} 
                            >
                                <EditIcon fontSize="small" />
                            </IconButton>
                            
                            <IconButton 
                                edge="end" 
                                aria-label="delete" 
                                size="small" 
                                disabled={isAllSelected}
                                onClick={(e) => handleDeleteClick(e, groupName)}
                                sx={{ color: isAllSelected ? undefined : '#DA2020' }} 
                            >
                                <DeleteIcon fontSize="small" />
                            </IconButton>
                        </>
                    ) : (
                        // Save/Cancel buttons displayed when editing
                        <InputAdornment position="end" sx={{ mr: 1, my: 0.5 }}>
                            <IconButton 
                                aria-label="save-edit" 
                                size="small" 
                                onClick={() => handleSaveEdit(groupName)}
                                sx={{ color: '#1976D2' }}
                            >
                                <CheckIcon fontSize="small" />
                            </IconButton>
                            <IconButton 
                                aria-label="cancel-edit" 
                                size="small" 
                                onClick={handleCancelEdit}
                                sx={{ color: '#DA2020' }}
                            >
                                <CloseIcon fontSize="small" />
                            </IconButton>
                        </InputAdornment>
                    )
                  }
                >
                  {editingGroupName === groupName ? (
                    <TextField
                      value={newGroupName}
                      onChange={(e) => setNewGroupName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveEdit(groupName);
                        if (e.key === 'Escape') handleCancelEdit();
                      }}
                      variant="standard"
                      size="small"
                      fullWidth
                      autoFocus
                      sx={{ 
                        '& .MuiInputBase-root': { paddingLeft: 0, paddingRight: 0, height: '40px' },
                        '& .MuiInputBase-input': { padding: '8px 0' }
                      }}
                    />
                  ) : (
                    <ListItemText primary={groupName} />
                  )}
                </ListItem>
              ))}
              </Box> 
            </List>
          </CardContent>
        </Card>
      </Box>
    );
}

export default QuestionGroups;