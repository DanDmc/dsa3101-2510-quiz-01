// src/components/QuestionTable.jsx

import React, { useState } from 'react';
import { 
  Box, Card, Table, TableBody, TableCell, TableContainer, 
  TableHead, TableRow, Checkbox, IconButton, Chip, 
  TablePagination, Typography, useTheme, Tooltip // ADDED Tooltip import for Feature 2
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import SettingsIcon from '@mui/icons-material/Settings';
import KeyboardArrowLeft from '@mui/icons-material/KeyboardArrowLeft';
import KeyboardArrowRight from '@mui/icons-material/KeyboardArrowRight';

// --- CONSTANTS ---
const ROWS_PER_PAGE = 10;
const BORDER_COLOR = '#CACACA';
const BORDER_STYLE = `1px solid ${BORDER_COLOR}`;
const ICON_COLOR = '#202020'; 
const TABLE_MAX_WIDTH = '875px'; 
const QUESTION_COLUMN_MAX_WIDTH = '450px'; 
const MAX_QUESTION_TEXT_WIDTH = '400px'; 
const TIGHT_PADDING_X = '4px'; 
const TEXT_ICON_GAP = '2px'; 
const QUESTION_TEXT_COLOR = '#F57F17'; 
const GREY_BACKGROUND = '#f5f5f5';
const TIGHT_PADDING_Y = '8px'; 
const CHECKBOX_PADDING = '4px'; 

// ⭐ NEW CONSTANT: Defines the stem text to be excluded
const PLACEHOLDER_STEM = '[Placeholder Question for Group Management]'; 

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

// Pagination Actions Component (UNCHANGED)
function TablePaginationActions(props) {
  const theme = useTheme();
  const { count, page, onPageChange } = props;

  const handleBackButtonClick = (event) => onPageChange(event, page - 1);
  const handleNextButtonClick = (event) => onPageChange(event, page + 1);

  return (
    <Box sx={{ flexShrink: 0, ml: 2.5 }}>
      <IconButton onClick={handleBackButtonClick} disabled={page === 0} aria-label="previous page">
        {theme.direction === 'rtl' ? <KeyboardArrowRight /> : <KeyboardArrowLeft />}
      </IconButton>
      <IconButton onClick={handleNextButtonClick} disabled={page >= Math.ceil(count / ROWS_PER_PAGE) - 1} aria-label="next page">
        {theme.direction === 'rtl' ? <KeyboardArrowLeft /> : <KeyboardArrowRight />}
      </IconButton>
    </Box>
  );
}

// Main Component
function QuestionTable({ questions, selected, setSelected, onSelectAllClick, goToEditPage }) { // ⬅️ UPDATED: Added goToEditPage prop
  const [page, setPage] = useState(0);

  // ⭐ MODIFICATION 1: Filter out placeholder questions immediately
  const actualQuestions = questions.filter(q => q.question_stem !== PLACEHOLDER_STEM);

  const totalQuestions = actualQuestions.length; // Use the filtered count

  const handleChangePage = (event, newPage) => setPage(newPage);

  // ⭐ MODIFICATION 2: Base pagination on the filtered list
  const visibleQuestions = actualQuestions.slice(
    page * ROWS_PER_PAGE,
    page * ROWS_PER_PAGE + ROWS_PER_PAGE,
  );

  const emptyRows =
    page > 0 ? Math.max(0, (1 + page) * ROWS_PER_PAGE - totalQuestions) : ROWS_PER_PAGE - visibleQuestions.length;
  
  const borderedCellStyle = { borderRight: BORDER_STYLE };
  const centeredText = { textAlign: 'center' };
  const wrappingHeaderStyle = { whiteSpace: 'normal', wordBreak: 'break-word', fontWeight: 'bold' };
  const reducedVerticalPaddingStyle = { paddingY: TIGHT_PADDING_Y, paddingX: TIGHT_PADDING_X };
  const checkboxCellStyle = { padding: CHECKBOX_PADDING, ...borderedCellStyle };
  const questionColumnStyle = { maxWidth: QUESTION_COLUMN_MAX_WIDTH, width: QUESTION_COLUMN_MAX_WIDTH, minWidth: '200px', boxSizing: 'border-box', overflow: 'hidden' };

  const renderDifficulty = (value) => (value == null ? '-' : Number(value).toFixed(2));

  const handleClick = (event, id) => {
    const selectedIndex = selected.indexOf(id);
    let newSelected = [];

    if (selectedIndex === -1) newSelected = newSelected.concat(selected, id);
    else if (selectedIndex === 0) newSelected = newSelected.concat(selected.slice(1));
    else if (selectedIndex === selected.length - 1) newSelected = newSelected.concat(selected.slice(0, -1));
    else if (selectedIndex > 0) newSelected = newSelected.concat(selected.slice(0, selectedIndex), selected.slice(selectedIndex + 1));

setSelected(newSelected);
  };

  const isSelected = (id) => selected.indexOf(id) !== -1;

  // --- NEW: Download Selected Handler (Updated to Port 5001) ---
  const handleDownloadSelected = async () => {
    if (selected.length === 0) return;
    try {
      const res = await fetch('http://localhost:5001/download_questions', { // ⬅️ UPDATED: Port 5001
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question_ids: selected }),
      });

      if (!res.ok) throw new Error('Download failed');
      
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'questions.pdf';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert('Failed to download questions. (Note: This route may not exist on the server yet)'); // ⬅️ UPDATED: Better alert
    }
  };

  return (
    <Card sx={{ width: TABLE_MAX_WIDTH, maxWidth: TABLE_MAX_WIDTH, border: BORDER_STYLE, boxShadow: 'none', borderRadius: 0, overflowX: 'auto' }}>
      
      {/* --- DOWNLOAD SELECTED BUTTON --- */}
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1, mr: 2 }}>
        <button
          onClick={handleDownloadSelected}
          disabled={selected.length === 0}
          style={{
            backgroundColor: '#F57F17',
            color: 'white',
            border: 'none',
            padding: '6px 12px',
            borderRadius: '4px',
            cursor: selected.length === 0 ? 'not-allowed' : 'pointer'
          }}
        >
          Download Selected
        </button>
      </Box>

      <TableContainer>
        <Table>
          <TableHead sx={{ backgroundColor: '#FFFFFF' }}> 
            <TableRow>
              <TableCell sx={checkboxCellStyle}>
                <Checkbox
                  color="primary"
                  // ⭐ MODIFICATION 3: Use totalQuestions for all/indeterminate check
                  indeterminate={selected.length > 0 && selected.length < totalQuestions}
                  checked={totalQuestions > 0 && selected.length === totalQuestions}
                  onChange={onSelectAllClick}
                />
              </TableCell>
              <TableCell sx={{ fontWeight: 'bold', ...borderedCellStyle, ...questionColumnStyle }}>Question</TableCell>
              <TableCell sx={{ fontWeight: 'bold', ...borderedCellStyle, ...centeredText, ...reducedVerticalPaddingStyle }}>Question Type</TableCell>
              <TableCell sx={{ ...wrappingHeaderStyle, ...borderedCellStyle, ...centeredText, ...reducedVerticalPaddingStyle }}>Difficulty (Manual)</TableCell>
              <TableCell sx={{ ...wrappingHeaderStyle, ...borderedCellStyle, ...centeredText, ...reducedVerticalPaddingStyle }}>Difficulty (Generated)</TableCell>
              <TableCell sx={{ fontWeight: 'bold', ...centeredText, ...reducedVerticalPaddingStyle }}>Modify</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {visibleQuestions.map((row, index) => {
              const isItemSelected = isSelected(row.id);
              const isEvenRow = index % 2 === 0;
              const rowBackgroundColor = isEvenRow ? GREY_BACKGROUND : 'white';
              const questionType = row.question_type || '';

              return (
                <TableRow
                  key={row.id}
                  hover
                  onDoubleClick={() => goToEditPage(row.id)} // ⬅️ Integrated Feature 1
                  onClick={(event) => handleClick(event, row.id)}
                  role="checkbox"
                  aria-checked={isItemSelected}
                  tabIndex={-1}
                  selected={isItemSelected}
                  sx={{ '&:not(.Mui-selected)': { backgroundColor: rowBackgroundColor } }}
                >
                  <TableCell sx={checkboxCellStyle}><Checkbox color="primary" checked={isItemSelected} /></TableCell>
                  <TableCell component="th" scope="row" sx={{ ...borderedCellStyle, ...questionColumnStyle, display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingY: TIGHT_PADDING_Y, paddingX: '16px' }}>
                    {/* ⬅️ Integrated Feature 2: Tooltip */}
                    <Tooltip title={row.question_stem} placement="bottom-start" arrow>
                      <Typography variant="body2" sx={{ flexGrow: 1, marginRight: TEXT_ICON_GAP, color: QUESTION_TEXT_COLOR, maxWidth: MAX_QUESTION_TEXT_WIDTH, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {row.question_stem}
                      </Typography>
                    </Tooltip>
                    {/* ⬅️ Integrated Feature 3: Advanced Image Download Logic (Port 5001) */}
                    <IconButton
                      size="small"
                      sx={{ color: ICON_COLOR, flexShrink: 0, alignSelf: 'center' }}
                      onClick={async (e) => {
                        e.stopPropagation(); 
                        try {
                          // Correct API URL: 5001
                          const res = await fetch(`http://localhost:5001/question/${row.id}/download_image`, {
                            method: 'GET'
                          });

                          if (!res.ok) {
                            if (res.status === 404) {
                              alert('Download failed: No image was found for this question.');
                            } else {
                              throw new Error(`Download failed: Server responded with ${res.status}`);
                            }
                            return;
                          }

                          const disposition = res.headers.get('content-disposition');
                          let filename = `question_${row.id}_image.png`; 
                          if (disposition && disposition.includes('attachment')) {
                            const filenameMatch = /filename="?([^"]+)"?/.exec(disposition);
                            if (filenameMatch && filenameMatch[1]) {
                              filename = filenameMatch[1];
                            }
                          }

                          const blob = await res.blob();
                          const url = window.URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = filename;
                          document.body.appendChild(a);
                          a.click();
                          a.remove();
                          window.URL.revokeObjectURL(url);

                        } catch (err) {
                          console.error(err);
                          alert('Failed to download file.');
                        }
                      }}
                    >
                      <DownloadIcon />
                    </IconButton>
                  </TableCell>
                  <TableCell sx={{ ...borderedCellStyle, ...centeredText, ...reducedVerticalPaddingStyle }}>
                    <Chip label={questionType.toUpperCase()} size="small" sx={getChipColor(questionType)} />
                  </TableCell>
                  <TableCell sx={{ ...borderedCellStyle, ...centeredText, ...reducedVerticalPaddingStyle }}>{renderDifficulty(row.difficultyManual)}</TableCell>
                  <TableCell sx={{ ...borderedCellStyle, ...centeredText, ...reducedVerticalPaddingStyle }}>{renderDifficulty(row.difficultyGenerated)}</TableCell>
                  <TableCell sx={{ ...centeredText, ...reducedVerticalPaddingStyle }}>
                    <IconButton size="small" sx={{ color: ICON_COLOR }}><SettingsIcon /></IconButton>
                  </TableCell>
                </TableRow>
              );
            })}

            {emptyRows > 0 && (
              [...Array(emptyRows)].map((_, index) => {
                const isEvenRow = (visibleQuestions.length + index) % 2 === 0;
                const rowBackgroundColor = isEvenRow ? GREY_BACKGROUND : 'white';
                const newApproximateHeight = 40; 
                return (
                  <TableRow key={`empty-${index}`} style={{ height: newApproximateHeight }} sx={{ backgroundColor: rowBackgroundColor }}>
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

      <TablePagination
        // ⭐ MODIFICATION 4: Use totalQuestions for count
        rowsPerPageOptions={[]} 
        component="div"
        count={totalQuestions} 
        rowsPerPage={ROWS_PER_PAGE} 
        page={page} 
        onPageChange={handleChangePage}
        labelDisplayedRows={({ from, to, count }) => `${from}-${to} of ${count}`}
        ActionsComponent={TablePaginationActions} 
      />
    </Card>
  );
}

export default QuestionTable;