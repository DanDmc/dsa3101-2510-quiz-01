/**
 * @file QuestionStepper component.
 * @module components/QuestionStepper
 * Renders a scrollable list (stepper) of questions on the sidebar.
 * 
 * It visually highlights the currently active question and provides a button to 
 * add a new question. It contains complex internal logic to map question type strings 
 * (e.g., 'MCQ', 'CODING', 'FILL-IN-THE-BLANKS') to corresponding Material-UI icons 
 * for visual feedback.
 *
 * @typedef {object} QuestionItem
 * @property {number} id - The unique ID of the question.
 * @property {string} [question_stem] - The main text of the question (used for truncation).
 * @property {string} [question_type] - The type of question (e.g., 'MCQ', 'OPEN-ENDED', 'MRQ').
 * @property {string} [text] - An alias for the question text (used in fallback logic).
 *
 * @param {object} props The component props.
 * @param {Array<QuestionItem>} props.questions - A list of all question objects to be displayed in the stepper.
 * @param {number | null} props.activeQuestion - The ID of the currently selected question, used for visual highlighting.
 * @param {function(number): void} props.setActiveQuestion - Callback function to set the active question when a list item is clicked.
 * @param {function(): void} props.onAddQuestion - Callback function executed when the 'Add Question' button is clicked.
 * @returns {JSX.Element} A Material-UI Card containing the question count, the 'Add Question' button, and the scrollable list of questions.
 */

// src/components/QuestionStepper.jsx

import React from 'react';
import {
  Box,
  Card,
  Typography,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  IconButton,
} from '@mui/material';
import EditNoteIcon from '@mui/icons-material/EditNote'; // Open Ended
import CodeIcon from '@mui/icons-material/Code'; // For CODING
import TollIcon from '@mui/icons-material/Toll'; // For MCQ
import AddIcon from '@mui/icons-material/Add';
import MinimizeIcon from '@mui/icons-material/Minimize';
// ====================================================================
// Icons for MRQ and OTHERS added to the import list
import CheckBoxOutlineBlankIcon from '@mui/icons-material/CheckBoxOutlineBlank'; // Used for OTHERS/Default
import CheckBoxIcon from '@mui/icons-material/CheckBox'; // Added Icon for MRQ
import RadioButtonCheckedIcon from '@mui/icons-material/RadioButtonChecked';
import QuestionMarkIcon from '@mui/icons-material/QuestionMark'; // Added Icon for OTHERS
// ====================================================================

const MAX_LENGTH = 23;
const ICON_COLOR = '#525151';

// Define sizes for consistent styling
const BUTTON_DIAMETER = '24px'; // Diameter of the overall button area/background circle
const ADD_ICON_SIZE = '20px'; // Diameter of the inner AddIcon (24px - 4px = 20px)

// Define the max height for the list to fit 6 items (approx 6 * ~65px height per item)
const MAX_LIST_HEIGHT = '400px';

/**
 * Renders the sidebar with the list of questions (the stepper).
 */
// Added onAddQuestion to props
function QuestionStepper({
  questions,
  activeQuestion,
  setActiveQuestion,
  onAddQuestion,
}) {
  // Helper to get the correct icon component based on question type
  const getQuestionTypeIcon = (type) => {
    const normalizedType = (type || '').toUpperCase();

    // CODING Icon logic
    if (normalizedType.includes('CODING')) {
      return <CodeIcon sx={{ color: ICON_COLOR }} fontSize="small" />;
    }

    // MCQ Icon logic
    if (
      normalizedType.includes('MCQ') ||
      normalizedType.includes('MULTIPLE CHOICE')
    ) {
      return <TollIcon sx={{ color: ICON_COLOR }} fontSize="small" />;
    }

    // OPEN-ENDED Icon logic
    if (
      normalizedType.includes('OPEN ENDED') ||
      normalizedType.includes('OPEN-ENDED')
    ) {
      return <EditNoteIcon sx={{ color: ICON_COLOR }} fontSize="small" />;
    }

    // FILL-IN-THE-BLANKS Icon logic
    if (normalizedType.includes('FILL-IN-THE-BLANKS')) {
      return <MinimizeIcon sx={{ color: ICON_COLOR }} fontSize="small" />;
    }

    // Explicitly handle MRQ (Multiple Response Question)
    if (
      normalizedType.includes('MRQ') ||
      normalizedType.includes('MULTIPLE RESPONSE')
    ) {
      return <CheckBoxIcon sx={{ color: ICON_COLOR }} fontSize="small" />;
    }

    // Explicitly handle OTHERS and use a clear default icon
    if (normalizedType.includes('OTHERS') || !normalizedType) {
      return <QuestionMarkIcon sx={{ color: ICON_COLOR }} fontSize="small" />;
    }

    // Default fallback icon (Should now only catch truly unexpected strings)
    return (
      <CheckBoxOutlineBlankIcon sx={{ color: ICON_COLOR }} fontSize="small" />
    );
  };

  // Helper to truncate the question text (UNCHANGED)
  const truncateText = (text, maxLength) => {
    if (!text) return `Question (No Text)`;
    const content = text || `Question (ID: ${activeQuestion})`;
    if (!content) return `Question (No Text)`;
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength) + '...';
  };

  // Placeholder for the add question action
  // We now use the `onAddQuestion` prop directly.

  return (
    <Card sx={{ p: 0, height: 'auto', width: '100%' }}>
      <Box
        sx={{
          p: 2,
          backgroundColor: '#f0f0f0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Typography variant="subtitle1" fontWeight="bold">
          QUESTION ({questions.length})
        </Typography>

        <IconButton
          // Use the prop here
          onClick={onAddQuestion}
          size="small"
          sx={{ p: 0 }}
        >
          <Box
            sx={{
              width: BUTTON_DIAMETER,
              height: BUTTON_DIAMETER,
              borderRadius: '50%', // Makes it a circle
              backgroundColor: '#FFFFFF', // White fill
              border: '1px solid #BDBDBD', // Grey stroke
              display: 'flex',
              justifyContent: 'center', // Horizontal Center
              alignItems: 'center', // Vertical Center
            }}
          >
            <AddIcon
              sx={{
                fontSize: ADD_ICON_SIZE, // 4px smaller than container (24px)
                color: '#000000', // Black fill color for the plus sign
              }}
            />
          </Box>
        </IconButton>
      </Box>
      <Divider />

      {/* Added max-height and overflow properties for scrolling */}
      <List
        dense
        disablePadding
        sx={{
          maxHeight: MAX_LIST_HEIGHT, // Max height to show approximately 6 items
          overflowY: 'auto', // Enables vertical scrolling when content exceeds maxHeight
        }}
      >
        {questions.map((q, index) => (
          <ListItem
            key={q.id}
            button
            onClick={() => setActiveQuestion(q.id)}
            sx={{
              backgroundColor:
                activeQuestion === q.id ? '#EDEDED' : 'transparent',
              borderLeft:
                activeQuestion === q.id ? '4px solid #F57F17' : 'none',
              py: 1.5,
              px: 2,
              alignItems: 'flex-start',
            }}
          >
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                width: '24px',
                height: '24px',
                borderRadius: '8px',
                backgroundColor: '#E4E2E2',
                mr: 2,
                mt: 0.2,
                flexShrink: 0,
              }}
            >
              <Typography
                variant="caption"
                component="span"
                fontWeight="bold"
                sx={{ color: '#9E9E9E' }}
              >
                {index + 1}
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
              {/* Question Stem (Primary Text) */}
              <ListItemText
                primary={truncateText(q.question_stem || q.text, MAX_LENGTH)}
                sx={{ m: 0, mb: 1 }}
                primaryTypographyProps={{
                  noWrap: false,
                  fontWeight: 'bold',
                  color: '#525151',
                }}
              />

              {/* Question Type Box */}
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  p: 0.5,
                  width: 'fit-content',
                  borderRadius: '4px',
                  backgroundColor: '#E4E2E2',
                }}
              >
                {/* Dynamic Icon */}
                {getQuestionTypeIcon(q.question_type)}

                {/* Question Type Text */}
                <Typography
                  variant="caption"
                  fontWeight="bold"
                  sx={{
                    ml: 0.5,
                    color: '#525151',
                    lineHeight: 1,
                  }}
                >
                  {q.question_type
                    ? q.question_type.toUpperCase().replace(' ', '')
                    : 'N/A'}
                </Typography>
              </Box>
            </Box>
          </ListItem>
        ))}
      </List>
      <Divider />
    </Card>
  );
}

export default QuestionStepper;