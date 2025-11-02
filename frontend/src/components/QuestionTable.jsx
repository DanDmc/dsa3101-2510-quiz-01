/**
 * @file QuestionTable component.
 * @module components/QuestionTable
 * Renders a paginated, multi-selectable table view of question records.
 *
 * This component filters out placeholder questions used for group management,
 * handles question selection, and provides options for bulk download and quick 
 * access to the edit page (via double-click). It also includes specialized 
 * logic for downloading individual question images via an API call.
 *
 * @typedef {object} QuestionRow
 * @property {number} id - The unique ID of the question.
 * @property {string} question_stem - The main text of the question.
 * @property {string} [question_type] - The type of question (e.g., 'MCQ', 'Open ended').
 * @property {number | null} [difficulty_rating_manual] - Manually set difficulty score.
 * @property {number | null} [difficulty_model] - Model-generated difficulty score.
 *
 * @param {object} props The component props.
 * @param {Array<QuestionRow>} props.questions - The full, unfiltered list of question objects from the API.
 * @param {Array<number>} props.selected - An array of IDs for the currently selected questions.
 * @param {function(Array<number>): void} props.setSelected - State setter to update the list of selected question IDs.
 * @param {function(): void} props.onSelectAllClick - Handler to select or deselect all visible questions.
 * @param {function(Array<QuestionRow>): void} props.goToEditPage - Handler to navigate to the edit page, typically triggered by double-clicking a row.
 * @returns {JSX.Element} A Material-UI Card containing the question table and pagination controls.
 * @fires fetch - Triggers API calls for bulk PDF download and individual image download.
 */

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

// Defines the stem text to be excluded
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

// Pagination Actions Component
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
function QuestionTable({ questions, selected, setSelected, onSelectAllClick, goToEditPage }) { // Added goToEditPage prop
  const [page, setPage] = useState(0);

  // Filter out placeholder questions immediately
  const actualQuestions = questions.filter(q => q.question_stem !== PLACEHOLDER_STEM);

  const totalQuestions = actualQuestions.length; // Use the filtered count

  const handleChangePage = (event, newPage) => setPage(newPage);

  // Base pagination on the filtered list
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

  // Download Selected Handler (Updated to Port 5001, was port 5000 during development before we switched to docker for the actual final product) ---
  const handleDownloadSelected = async () => {
    if (selected.length === 0) return;
    try {
      const res = await fetch('http://localhost:5001/download_questions', { // Port 5001
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
      alert('Failed to download questions. (Note: This route may not exist on the server yet)'); // Alert
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
                  // Use totalQuestions for all/indeterminate check
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
                  onDoubleClick={() => goToEditPage([row])}
                  onClick={(event) => handleClick(event, row.id)}
                  role="checkbox"
                  aria-checked={isItemSelected}
                  tabIndex={-1}
                  selected={isItemSelected}
                  sx={{ '&:not(.Mui-selected)': { backgroundColor: rowBackgroundColor } }}
                >
                  <TableCell sx={checkboxCellStyle}><Checkbox color="primary" checked={isItemSelected} /></TableCell>
                  <TableCell component="th" scope="row" sx={{ ...borderedCellStyle, ...questionColumnStyle, display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingY: TIGHT_PADDING_Y, paddingX: '16px' }}>
                    {/* Feature: Tooltip */}
                    <Tooltip title={row.question_stem} placement="bottom-start" arrow>
                      <Typography variant="body2" sx={{ flexGrow: 1, marginRight: TEXT_ICON_GAP, color: QUESTION_TEXT_COLOR, maxWidth: MAX_QUESTION_TEXT_WIDTH, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {row.question_stem}
                      </Typography>
                    </Tooltip>
                    {/* Feature: Advanced Image Download Logic (Port 5001) */}
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
                  <TableCell sx={{ ...borderedCellStyle, ...centeredText, ...reducedVerticalPaddingStyle }}>{renderDifficulty(row.difficulty_rating_manual)}</TableCell>
                  <TableCell sx={{ ...borderedCellStyle, ...centeredText, ...reducedVerticalPaddingStyle }}>{renderDifficulty(row.difficulty_model)}</TableCell>
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
        // Use totalQuestions for count
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