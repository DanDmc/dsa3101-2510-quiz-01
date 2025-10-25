// src/components/QuestionTable.jsx (MODIFIED to add vertical borders to empty rows)

import React, { useState } from 'react';
import { 
  Box, Card, Table, TableBody, TableCell, TableContainer, 
  TableHead, TableRow, Checkbox, IconButton, Chip, 
  TablePagination, Typography, useTheme 
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import SettingsIcon from '@mui/icons-material/Settings';
import KeyboardArrowLeft from '@mui/icons-material/KeyboardArrowLeft';
import KeyboardArrowRight from '@mui/icons-material/KeyboardArrowRight';

// --- CONSTANTS ---
const ROWS_PER_PAGE = 10; // Fixed rows per page for height limit
const BORDER_COLOR = '#CACACA';
const BORDER_STYLE = `1px solid ${BORDER_COLOR}`;
const ICON_COLOR = '#202020'; 
const QUESTION_COLUMN_MAX_WIDTH = '400px'; 
const MAX_QUESTION_TEXT_WIDTH = '350px'; 
const TIGHT_PADDING_X = '4px'; 
const TEXT_ICON_GAP = '2px'; 
const QUESTION_TEXT_COLOR = '#F57F17'; 
const GREY_BACKGROUND = '#f5f5f5';

// NEW CONSTANTS FOR TIGHTER PADDING
// Standard MUI TableCell usually has 16px vertical padding, which leads to tall rows.
const TIGHT_PADDING_Y = '8px'; // Reduced vertical padding
const CHECKBOX_PADDING = '4px'; // Minimal padding for checkbox column

// Helper to style the "chips" (UNCHANGED)
const getChipColor = (type) => {
  switch (type) {
    case 'MCQ':
      return { bgcolor: '#F48828', color: '#FFFFFF' }; 
    case 'MRQ':
    case 'Open ended':
    default:
      return { bgcolor: '#F48828', color: '#FFFFFF' }; 
  }
};

// --- Custom Pagination Actions Component (For arrow keys - UNCHANGED) ---
function TablePaginationActions(props) {
  const theme = useTheme();
  const { count, page, onPageChange } = props;

  const handleBackButtonClick = (event) => {
    onPageChange(event, page - 1);
  };

  const handleNextButtonClick = (event) => {
    onPageChange(event, page + 1);
  };

  return (
    <Box sx={{ flexShrink: 0, ml: 2.5 }}>
      <IconButton
        onClick={handleBackButtonClick}
        disabled={page === 0}
        aria-label="previous page"
      >
        {theme.direction === 'rtl' ? <KeyboardArrowRight /> : <KeyboardArrowLeft />}
      </IconButton>
      <IconButton
        onClick={handleNextButtonClick}
        disabled={page >= Math.ceil(count / ROWS_PER_PAGE) - 1}
        aria-label="next page"
      >
        {theme.direction === 'rtl' ? <KeyboardArrowLeft /> : <KeyboardArrowRight />}
      </IconButton>
    </Box>
  );
}
// -----------------------------------------------------------


function QuestionTable({ questions, selected, setSelected, onSelectAllClick }) {
  // --- STATE FOR PAGINATION (UNCHANGED) ---
  const [page, setPage] = useState(0);

  const totalQuestions = questions.length;
  
  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };
  
  // --- PAGINATION LOGIC (UNCHANGED) ---
  const visibleQuestions = questions.slice(
    page * ROWS_PER_PAGE,
    page * ROWS_PER_PAGE + ROWS_PER_PAGE,
  );
  
  // Calculate empty rows needed to fill up to ROWS_PER_PAGE
  const emptyRows =
    page > 0 ? Math.max(0, (1 + page) * ROWS_PER_PAGE - totalQuestions) : ROWS_PER_PAGE - visibleQuestions.length;
  
  // --- STYLE DEFINITIONS ---
  const borderedCellStyle = { borderRight: BORDER_STYLE };
  const centeredText = { textAlign: 'center' };
  const wrappingHeaderStyle = {
    whiteSpace: 'normal',
    wordBreak: 'break-word',
    fontWeight: 'bold',
  };
  const tightCellStyle = {
    paddingLeft: TIGHT_PADDING_X,
    paddingRight: TIGHT_PADDING_X,
  };

  // NEW STYLE: Reduced vertical padding for content columns
  const reducedVerticalPaddingStyle = { 
    paddingY: TIGHT_PADDING_Y, // Use reduced vertical padding
    paddingX: TIGHT_PADDING_X,
  };

  // NEW STYLE: Style for the checkbox cell in the body (both header and body)
  const checkboxCellStyle = {
    padding: CHECKBOX_PADDING, // Minimal padding around the checkbox
    ...borderedCellStyle,
  };

  // MODIFIED STYLE: Question column style needs adjustment for content cell padding
  const questionColumnStyle = {
    maxWidth: QUESTION_COLUMN_MAX_WIDTH, 
    width: QUESTION_COLUMN_MAX_WIDTH,     
    minWidth: '200px',
    boxSizing: 'border-box',
    overflow: 'hidden',
  };
  
  // Helper function to render data or '-' if null (UNCHANGED)
  const renderDifficulty = (value) => (
      value === null ? '-' : value.toFixed(1)
  );

  // Row selection logic remains unchanged
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
    <Card sx={{ 
      width: '100%', 
      border: BORDER_STYLE, 
      boxShadow: 'none',
      borderRadius: 0,
      overflowX: 'auto' 
    }}>
      <TableContainer>
        <Table>
          <TableHead sx={{ backgroundColor: '#FFFFFF' }}> 
            <TableRow>
              {/* Column 1: Checkbox - APPLYING NEW TIGHT STYLE */}
              <TableCell sx={checkboxCellStyle}>
                <Checkbox
                  color="primary"
                  indeterminate={selected.length > 0 && selected.length < totalQuestions}
                  checked={totalQuestions > 0 && selected.length === totalQuestions}
                  onChange={onSelectAllClick}
                />
              </TableCell>
              
              {/* Column 2: Question Header (UNCHANGED) */}
              <TableCell sx={{ fontWeight: 'bold', ...borderedCellStyle, ...questionColumnStyle }}>
                Question
              </TableCell>

              {/* Column 3: Question Type Header - APPLYING TIGHT VERTICAL PADDING */}
              <TableCell sx={{ fontWeight: 'bold', ...borderedCellStyle, ...centeredText, ...reducedVerticalPaddingStyle }}>
                Question Type
              </TableCell>
              
              {/* Column 4: Difficulty Rating (Manual) Header - APPLYING TIGHT VERTICAL PADDING */}
              <TableCell sx={{ ...wrappingHeaderStyle, ...borderedCellStyle, ...centeredText, ...reducedVerticalPaddingStyle }}>
                Difficulty (Manual)
              </TableCell>

              {/* Column 5: Difficulty Rating (Generated) Header - APPLYING TIGHT VERTICAL PADDING */}
              <TableCell sx={{ ...wrappingHeaderStyle, ...borderedCellStyle, ...centeredText, ...reducedVerticalPaddingStyle }}>
                Difficulty (Generated)
              </TableCell>
              
              {/* Column 6: Modify Header - APPLYING TIGHT VERTICAL PADDING */}
              <TableCell sx={{ fontWeight: 'bold', ...centeredText, ...reducedVerticalPaddingStyle }}>
                Modify
              </TableCell>
            </TableRow>
          </TableHead>
          
          <TableBody>
            {/* --- Render Visible Questions --- */}
            {visibleQuestions.map((row, index) => {
              const isItemSelected = isSelected(row.id);
              const isEvenRow = index % 2 === 0;
              const rowBackgroundColor = isEvenRow ? GREY_BACKGROUND : 'white';
              
              return (
                <TableRow
                  key={row.id}
                  hover
                  onClick={(event) => handleClick(event, row.id)}
                  role="checkbox"
                  aria-checked={isItemSelected}
                  tabIndex={-1}
                  selected={isItemSelected}
                  sx={{ 
                    '&:not(.Mui-selected)': { backgroundColor: rowBackgroundColor },
                  }}
                >
                  {/* Column 1: Checkbox - APPLYING NEW TIGHT STYLE */}
                  {/* Removed padding="checkbox" prop, relying on custom style */}
                  <TableCell sx={checkboxCellStyle}> 
                    <Checkbox color="primary" checked={isItemSelected} />
                  </TableCell>
                  
                  {/* Column 2: Question - MODIFIED INNER PADDING */}
                  <TableCell 
                    component="th" 
                    scope="row" 
                    sx={{ 
                        ...borderedCellStyle,
                        ...questionColumnStyle, 
                        display: 'flex',
                        alignItems: 'center', 
                        justifyContent: 'space-between', 
                        // Tighter Vertical Padding for the Question column container
                        paddingY: TIGHT_PADDING_Y, // Reduced from '16px' to '8px'
                        paddingX: '16px' // Keep horizontal padding reasonable
                    }}
                  >
                    <Typography 
                        variant="body2" 
                        sx={{ 
                            flexGrow: 0, 
                            marginRight: TEXT_ICON_GAP, 
                            color: QUESTION_TEXT_COLOR,
                            maxWidth: MAX_QUESTION_TEXT_WIDTH, 
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap', 
                        }}
                    >
                        {row.text}
                    </Typography>
                    
                    {/* IconButton is already size="small", reducing the cell padding fixes the height */}
                    <IconButton size="small" sx={{ color: ICON_COLOR, flexShrink: 0, alignSelf: 'center' }}>
                      <DownloadIcon />
                    </IconButton>
                  </TableCell>
                  
                  {/* Column 3: Question Type - APPLYING TIGHT VERTICAL PADDING */}
                  <TableCell sx={{ ...borderedCellStyle, ...centeredText, ...reducedVerticalPaddingStyle }}>
                    <Chip label={row.type} size="small" sx={getChipColor(row.type)} />
                  </TableCell>
                  
                  {/* Column 4: Difficulty Rating (Manual) - APPLYING TIGHT VERTICAL PADDING */}
                  <TableCell sx={{ ...borderedCellStyle, ...centeredText, ...reducedVerticalPaddingStyle }}>
                    {renderDifficulty(row.difficultyManual)}
                  </TableCell>

                  {/* Column 5: Difficulty Rating (Generated) - APPLYING TIGHT VERTICAL PADDING */}
                  <TableCell sx={{ ...borderedCellStyle, ...centeredText, ...reducedVerticalPaddingStyle }}>
                    {renderDifficulty(row.difficultyGenerated)}
                  </TableCell>
                  
                  {/* Column 6: Modify - APPLYING TIGHT VERTICAL PADDING */}
                  <TableCell sx={{ ...centeredText, ...reducedVerticalPaddingStyle }}>
                    {/* IconButton is already size="small", reducing the cell padding fixes the height */}
                    <IconButton size="small" sx={{ color: ICON_COLOR }}>
                      <SettingsIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              );
            })}
            
            {/* --- Render Empty Rows (MODIFIED) --- */}
            {emptyRows > 0 && (
              [...Array(emptyRows)].map((_, index) => {
                const isEvenRow = (visibleQuestions.length + index) % 2 === 0;
                const rowBackgroundColor = isEvenRow ? GREY_BACKGROUND : 'white';
                // Calculate the new approximate height based on reduced padding (e.g., 8px top/bottom padding + ~24px content height = 40px)
                const newApproximateHeight = 40; 
                
                return (
                  <TableRow
                    key={`empty-${index}`}
                    style={{ height: newApproximateHeight }} // Reduced empty row height
                    sx={{ backgroundColor: rowBackgroundColor }}
                  >
                    {/* Apply reduced padding styles to empty cells for consistent height */}
                    <TableCell sx={checkboxCellStyle} />
                    <TableCell sx={{ ...borderedCellStyle, ...questionColumnStyle, paddingY: TIGHT_PADDING_Y }} />
                    <TableCell sx={{ ...borderedCellStyle, ...reducedVerticalPaddingStyle }} />
                    <TableCell sx={{ ...borderedCellStyle, ...reducedVerticalPaddingStyle }} />
                    <TableCell sx={{ ...borderedCellStyle, ...reducedVerticalPaddingStyle }} />
                    <TableCell sx={reducedVerticalPaddingStyle} /> 
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>
      
      {/* --- MODIFIED TABLE PAGINATION (UNCHANGED) --- */}
      <TablePagination
        rowsPerPageOptions={[]} 
        component="div"
        count={totalQuestions} 
        rowsPerPage={ROWS_PER_PAGE} 
        page={page} 
        onPageChange={handleChangePage}
        labelDisplayedRows={({ from, to, count }) => 
          `${from}-${to} of ${count}` 
        }
        ActionsComponent={TablePaginationActions} 
      />
    </Card>
  );
}

export default QuestionTable;