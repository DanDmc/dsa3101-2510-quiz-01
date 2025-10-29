// src/components/QuestionTable.jsx

import React, { useState } from 'react';
import { 
  Box, Card, Table, TableBody, TableCell, TableContainer, 
  TableHead, TableRow, Checkbox, IconButton, Chip, 
  TablePagination, Typography, useTheme, Dialog, DialogTitle, DialogContent, DialogActions, Button 
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

const API_BASE = import.meta.env.VITE_APP_API_URL; // ensure correct url for download

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
function QuestionTable({ questions, selected, setSelected, onSelectAllClick }) {
  const [page, setPage] = useState(0);
  const totalQuestions = questions.length;

  // State for Concept Tags Dialog
  const [openConcepts, setOpenConcepts] = useState(false);
  const [currentConcepts, setCurrentConcepts] = useState([]);

  const handleChangePage = (event, newPage) => setPage(newPage);

  const visibleQuestions = questions.slice(
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

  const renderDifficulty = (value) => (value == null ? '-' : Number(value).toFixed(1));

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

  // --- Download Selected Questions ---
  const handleDownloadSelected = () => {
  if (selected.length === 0) return;

  // from selected -> get their file_ids
  const fileIds = selected
    .map((qid) => {
      const q = questions.find((x) => x.id === qid);
      return q ? q.file_id : null;
    })
    .filter((fid) => fid != null);

  if (fileIds.length === 0) {
    alert('No downloadable files found for selected questions.');
    return;
  }

  const uniqueFileIds = Array.from(new Set(fileIds));

  const missingCount = selected.length - fileIds.length;
  if (missingCount > 0) {
    console.warn(`${missingCount} selected question(s) had no associated file and will be skipped.`);
  }

  uniqueFileIds.forEach((fileId) => {
    const url = `${API_BASE}/files/${fileId}/download`;
    const a = document.createElement('a');
    a.href = url;
    a.target = '_blank';
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  });
};

  //Functions to handle Concept Tags Dialog
  const openConceptDialog = (concepts) => {
    setCurrentConcepts(concepts || []);
    setOpenConcepts(true);
  };

  const closeConceptDialog = () => {
    setOpenConcepts(false);
    setCurrentConcepts([]);
  };

  return (
    <Card sx={{ width: TABLE_MAX_WIDTH, maxWidth: TABLE_MAX_WIDTH, border: BORDER_STYLE, boxShadow: 'none', borderRadius: 0, overflowX: 'auto' }}>
      <TableContainer>
        <Table>
          <TableHead sx={{ backgroundColor: '#FFFFFF' }}> 
            <TableRow>
              <TableCell sx={checkboxCellStyle}>
                <Checkbox
                  color="primary"
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
                  onClick={(event) => handleClick(event, row.id)}
                  role="checkbox"
                  aria-checked={isItemSelected}
                  tabIndex={-1}
                  selected={isItemSelected}
                  sx={{ '&:not(.Mui-selected)': { backgroundColor: rowBackgroundColor } }}
                >
                  <TableCell sx={checkboxCellStyle}><Checkbox color="primary" checked={isItemSelected} /></TableCell>
                  <TableCell component="th" scope="row" sx={{ ...borderedCellStyle, ...questionColumnStyle, display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingY: TIGHT_PADDING_Y, paddingX: '16px' }}>
                    <Typography variant="body2" sx={{ flexGrow: 1, marginRight: TEXT_ICON_GAP, color: QUESTION_TEXT_COLOR, maxWidth: MAX_QUESTION_TEXT_WIDTH, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {row.question_stem}
                    </Typography>
                    <IconButton
                      size="small"
                      sx={{ color: ICON_COLOR, flexShrink: 0, alignSelf: 'center' }}
                      onClick={(e) => {
                        e.stopPropagation();
                        const downloadUrl = `${API_BASE}/files/${row.file_id}/download`;
                        window.open(downloadUrl, '_blank'); 
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
                    {/*  Open Concept Tags Dialog */}
                    <IconButton 
                      size="small" 
                      sx={{ color: ICON_COLOR }}
                      onClick={(e) => { 
                        e.stopPropagation(); 
                        openConceptDialog(row.concept_tags);
                      }}
                    >
                      <SettingsIcon />
                    </IconButton>
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
        rowsPerPageOptions={[]} 
        component="div"
        count={totalQuestions} 
        rowsPerPage={ROWS_PER_PAGE} 
        page={page} 
        onPageChange={handleChangePage}
        labelDisplayedRows={({ from, to, count }) => `${from}-${to} of ${count}`}
        ActionsComponent={TablePaginationActions} 
      />

      {/*  Concept Tags Dialog */}
      <Dialog open={openConcepts} onClose={closeConceptDialog}>
        <DialogTitle>Concept Tags</DialogTitle>
        <DialogContent>
          {currentConcepts.length > 0 ? (
            <ul>
              {currentConcepts.map((tag, idx) => <li key={idx}>{tag}</li>)}
            </ul>
          ) : (
            <Typography>No concept tags available.</Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={closeConceptDialog}>Close</Button>
        </DialogActions>
      </Dialog>

    </Card>
  );
}

export default QuestionTable;