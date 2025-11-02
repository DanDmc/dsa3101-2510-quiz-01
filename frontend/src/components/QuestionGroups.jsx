/**
 * @file QuestionGroups component.
 * @module components/QuestionGroups
 * Renders a list interface for managing and filtering questions by group.
 *
 * It supports multi-selection of groups (OR logic), and includes actions for 
 * renaming and deleting groups directly within the list. It also features 
 * special "Show All Questions" and "Show Questions Without Groups" filter options.
 * The entire interface can be disabled via the `disabled` prop during asynchronous operations.
 *
 * @param {object} props The component props.
 * @param {Array<string>} props.groups - A list of unique question group names to display in the dynamic section.
 * @param {function(string, string): void} props.onRenameGroup - Callback function fired when a group is renamed. 
 * - Arguments: (oldGroupName, newGroupName).
 * @param {function(string): void} props.onDeleteGroup - Callback function fired when a group is deleted.
 * - Argument: (groupName).
 * @param {function(): void} props.onAddGroup - Callback function fired when the "Add new group" button is clicked.
 * @param {function(Array<string>): void} props.onFilterChange - Callback function fired when the active filter selection changes. 
 * - Arguments: (activeFilterKeys), where keys can include 'ALL_QUESTIONS', 'NO_GROUPS', or group names.
 * @param {boolean} [props.disabled=false] - If true, all interactive elements (buttons, filters) are disabled, 
 * typically used during save or load operations.
 * @returns {JSX.Element} A Material-UI Box containing the group title, Add button, and the filter list.
 */

// src/components/QuestionGroups.jsx

import React, { useState } from 'react';
import { 
  Box, Button, Card, CardContent, 
  List, ListItem, ListItemButton, ListItemText, 
  IconButton, TextField, InputAdornment,
  Typography 
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

// Receive the disabled prop
function QuestionGroups({ groups, onRenameGroup, onDeleteGroup, onAddGroup, onFilterChange, disabled }) { 
    const [selectedFilters, setSelectedFilters] = useState(new Set([ALL_QUESTIONS_KEY]));
    const [editingGroupName, setEditingGroupName] = useState(null);
    const [newGroupName, setNewGroupName] = useState('');

    // --- Handler Logic: MODIFIED FOR OR FILTER ---
    const handleFilterClick = (filterKey) => {
        // Prevent filter changes if an operation is ongoing or we are in edit mode
        if (disabled || editingGroupName) return; 

        setEditingGroupName(null); 

        setSelectedFilters(prevFilters => {
            const newFilters = new Set(prevFilters);
            // Declare finalFilter here to ensure it is in scope everywhere
            let finalFilter;
            
            if (filterKey === ALL_QUESTIONS_KEY) {
                // 1. Toggle ALL_QUESTIONS_KEY
                if (newFilters.has(ALL_QUESTIONS_KEY)) {
                    newFilters.delete(ALL_QUESTIONS_KEY);
                } else {
                    // Selecting ALL always clears everything else and selects just ALL
                    finalFilter = [ALL_QUESTIONS_KEY]; // Initialize here for this path
                    if (onFilterChange) onFilterChange(finalFilter);
                    return new Set([ALL_QUESTIONS_KEY]);
                }
            } else { 
                // 2. Handle specific group/NO_GROUPS key
                
                // If ALL was active, clicking any specific filter cancels ALL
                if (newFilters.has(ALL_QUESTIONS_KEY)) {
                    newFilters.delete(ALL_QUESTIONS_KEY);
                }
                
                // Toggle the current specific filter
                if (newFilters.has(filterKey)) {
                    newFilters.delete(filterKey);
                } else {
                    newFilters.add(filterKey); // Allows multiple specific filters (OR logic)
                }
            }
            
            // 3. Ensure a filter is always active (default to ALL)
            if (newFilters.size === 0) {
                finalFilter = [ALL_QUESTIONS_KEY]; // Report [ALL_QUESTIONS_KEY]
                if (onFilterChange) onFilterChange(finalFilter);
                return new Set([ALL_QUESTIONS_KEY]);
            }

            // 4. Report the full active set (or just [ALL_QUESTIONS_KEY])
            // This is the line that caused the ReferenceError if finalFilter wasn't declared above
            if (newFilters.has(ALL_QUESTIONS_KEY)) {
                finalFilter = [ALL_QUESTIONS_KEY];
            } else {
                finalFilter = Array.from(newFilters); // Report the array of specific filters
            }
            
            // Pass the entire array (finalFilter) to the parent
            if (onFilterChange) {
                onFilterChange(finalFilter);
            }
            
            return newFilters;
        });
    };

    const handleStartEdit = (e, groupName) => {
        e.stopPropagation(); 
        if (disabled) return; // Prevent edit start during processing
        if (!isAllSelected) {
            setEditingGroupName(groupName);
            setNewGroupName(groupName);
        }
    };
    
    const handleSaveEdit = (groupName) => {
        if (disabled) return; // Prevent save during processing
        if (newGroupName.trim() && newGroupName.trim() !== groupName) {
            if (onRenameGroup) {
                onRenameGroup(groupName, newGroupName.trim());
            }
        }
        setEditingGroupName(null); 
        setNewGroupName('');
    };

    const handleCancelEdit = () => {
        if (disabled) return; // Prevent cancel during processing
        setEditingGroupName(null);
        setNewGroupName('');
    };

    const handleDeleteClick = (e, groupName) => {
        e.stopPropagation(); 
        if (disabled) return; // Prevent delete during processing
        
        setSelectedFilters(prevFilters => {
            const newFilters = new Set(prevFilters);
            newFilters.delete(groupName);
            
            // 1. Determine the final list of filters to send out
            let finalFilter; // Declare finalFilter here
            if (newFilters.size === 0) {
                finalFilter = [ALL_QUESTIONS_KEY]; // Revert to ALL
            } else {
                finalFilter = Array.from(newFilters);
            }
            
            // 2. Report to parent
            if (onFilterChange) {
                onFilterChange(finalFilter);
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

            {/* Add New Group Button (Right) */}
            <Button 
              variant="contained" 
              onClick={onAddGroup}
              // Disable the Add Group button during processing
              disabled={disabled}
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
              
              {/* 1. Show All Questions */}
              <ListItemButton 
                selected={isAllSelected}
                onClick={() => handleFilterClick(ALL_QUESTIONS_KEY)}
                disabled={disabled} // Disable filter items during processing
                sx={{ 
                  ...SELECTED_ITEM_SX, 
                  borderBottom: `1px solid ${BORDER_COLOR}` 
                }}
              >
                <ListItemText primary="Show All Questions" />
              </ListItemButton>
              
              {/* 2. Show Questions Without Groups */}
              <ListItemButton
                selected={selectedFilters.has(NO_GROUPS_KEY)}
                onClick={() => handleFilterClick(NO_GROUPS_KEY)}
                disabled={disabled} // Disable filter items during processing
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
                {groups && groups.length > 0 && groups.map((groupName) => (
                  <ListItem
                    key={groupName}
                    // Disable clicking on the list item button if processing or editing
                    component={(disabled || editingGroupName === groupName) ? 'div' : ListItemButton} 
                    selected={selectedFilters.has(groupName)}
                    onClick={(disabled || editingGroupName === groupName) ? null : () => handleFilterClick(groupName)}
                    sx={{ 
                      ...SELECTED_ITEM_SX, 
                      borderBottom: `1px solid ${BORDER_COLOR}` 
                    }}
                    secondaryAction={
                      editingGroupName !== groupName ? (
                          <>
                              <IconButton 
                                  edge="end" 
                                  aria-label="edit" 
                                  size="small" 
                                  // Disable if ALL is selected OR if processing
                                  disabled={isAllSelected || disabled}
                                  onClick={(e) => handleStartEdit(e, groupName)}
                                  sx={{ color: (isAllSelected || disabled) ? undefined : '#1976D2' }} 
                              >
                                  <EditIcon fontSize="small" />
                              </IconButton>
                              
                              <IconButton 
                                  edge="end" 
                                  aria-label="delete" 
                                  size="small" 
                                  // Disable if ALL is selected OR if processing
                                  disabled={isAllSelected || disabled}
                                  onClick={(e) => handleDeleteClick(e, groupName)}
                                  sx={{ color: (isAllSelected || disabled) ? undefined : '#DA2020' }} 
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
                                  // Disable if processing
                                disabled={disabled}
                                  sx={{ color: disabled ? undefined : '#1976D2' }}
                              >
                                  <CheckIcon fontSize="small" />
                              </IconButton>
                              <IconButton 
                                  aria-label="cancel-edit" 
                                  size="small" 
                                  onClick={handleCancelEdit}
                                // Disable if processing
                                disabled={disabled}
                                  sx={{ color: disabled ? undefined : '#DA2020' }}
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