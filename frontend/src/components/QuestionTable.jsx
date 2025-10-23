// src/components/QuestionTable.jsx

import React from 'react';
import { 
  Box, Card, Table, TableBody, TableCell, TableContainer, 
  TableHead, TableRow, Checkbox, IconButton, Chip, 
  TablePagination 
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import SettingsIcon from '@mui/icons-material/Settings';

// Helper to style the "chips"
const getChipColor = (type) => {
  switch (type) {
    case 'MCQ':
      return { bgcolor: '#ffc107', color: 'black' }; // Amber
    case 'MRQ':
      return { bgcolor: '#f44336', color: 'white' }; // Red
    case 'Open ended':
    default:
      return { bgcolor: '#2196f3', color: 'white' }; // Blue
  }
};

function QuestionTable({ questions, selected, setSelected, onSelectAllClick }) {

  const handleClick = (event, id) => {
    const selectedIndex = selected.indexOf(id);
    let newSelected = [];

    if (selectedIndex === -1) {
      newSelected = newSelected.concat(selected, id);
    } else if (selectedIndex === 0) {
      newSelected = newSelected.concat(selected.slice(1));
    } else if (selectedIndex === selected.length - 1) {
      newSelected = newSelected.concat(selected.slice(0, -1));
    } else if (selectedIndex > 0) {
      newSelected = newSelected.concat(
        selected.slice(0, selectedIndex),
        selected.slice(selectedIndex + 1),
      );
    }
    setSelected(newSelected);
  };

  const isSelected = (id) => selected.indexOf(id) !== -1;

  return (
    <Card>
      <TableContainer>
        <Table>
          <TableHead sx={{ backgroundColor: '#f9f9f9' }}>
            <TableRow>
              <TableCell padding="checkbox">
                <Checkbox
                  color="primary"
                  indeterminate={selected.length > 0 && selected.length < questions.length}
                  checked={questions.length > 0 && selected.length === questions.length}
                  onChange={onSelectAllClick}
                />
              </TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Question</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Question Type</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Modify</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {questions.map((row) => {
              const isItemSelected = isSelected(row.id);
              return (
                <TableRow
                  key={row.id}
                  hover
                  onClick={(event) => handleClick(event, row.id)}
                  role="checkbox"
                  aria-checked={isItemSelected}
                  tabIndex={-1}
                  selected={isItemSelected}
                >
                  <TableCell padding="checkbox">
                    <Checkbox
                      color="primary"
                      checked={isItemSelected}
                    />
                  </TableCell>
                  <TableCell component="th" scope="row">
                    {row.text}
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={row.type} 
                      size="small" 
                      sx={getChipColor(row.type)}
                    />
                  </TableCell>
                  <TableCell>
                    <IconButton size="small">
                      <DownloadIcon />
                    </IconButton>
                    <IconButton size="small">
                      <SettingsIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
      {/* Pagination component to match the footer of the table */}
      <TablePagination
        rowsPerPageOptions={[10, 25, 50]}
        component="div"
        count={questions.length} // In a real app, this would be total count from API
        rowsPerPage={10} // Manage this with state
        page={0} // Manage this with state
        onPageChange={() => {}} // Add state handler
        onRowsPerPageChange={() => {}} // Add state handler
      />
    </Card>
  );
}

export default QuestionTable;