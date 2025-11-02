/**
 * @file EditQuestionForm component.
 * @module components/EditQuestionForm
 * Renders a complete form interface for editing a single question record.
 *
 * This component manages local state for creating new concept tags and handling 
 * a difficulty rating modal. It uses a complex memoization and synchronization 
 * process to map the API's question_options (list/JSON string) and question_answer 
 * (formatted string) fields into a single, editable array of options (normalizedOptions).
 * The answer section dynamically changes based on the question_type (MCQ, MRQ, Open-ended, etc.).
 *
 * @typedef {object} QuestionOption
 * @property {string} id - Unique local identifier (e.g., 'opt1').
 * @property {string} label - The letter label (e.g., 'A', 'B').
 * @property {string} text - The option text.
 * @property {boolean} isCorrect - Flag indicating if this option is part of the correct answer.
 *
 * @typedef {object} QuestionData
 * @property {number} id - The unique ID of the question record.
 * @property {string} [question_type] - The type of question (e.g., 'MCQ', 'OPEN-ENDED').
 * @property {string} [question_stem] - The main body/text of the question.
 * @property {string} [question_answer] - The API-persisted formatted answer string.
 * @property {Array<string>} [concept_tags] - List of concept tags applied to the question.
 * @property {number | null} [difficulty_rating_manual] - Manually set difficulty score (0.0 to 1.0).
 * @property {Array<QuestionOption>} [options] - Local state storage for dynamic options (MCQ/MRQ).
 *
 * @param {object} props The component props.
 * @param {number} props.questionNumber - The display number of this question within a larger list.
 * @param {QuestionData} props.question - The full question object currently being edited.
 * @param {function(number, string, any): void} props.onQuestionChange - Callback function to update the parent state when a field changes.
 * - Arguments: (questionId, fieldName, newValue).
 * @param {function(number): void} props.onDelete - Callback function to signal the parent to delete this question.
 * @param {number} [props.optionWidth=730] - The width of the text fields used for answer options.
 * @param {Array<string>} [props.conceptTags=[]] - (DEPRECATED: Originally intended for global tag list) Now primarily unused.
 * @returns {JSX.Element} A Material-UI Card containing the full question editing interface and a Difficulty Modal.
 */

// src/components/EditQuestionForm.jsx
import React, { useMemo, useState, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Grid,
  Select,
  MenuItem,
  FormControl,
  Typography,
  TextField,
  Switch,
  Button,
  IconButton,
  Radio,
  RadioGroup,
  FormControlLabel,
  Checkbox,
  Divider,
  InputBase,
  Chip,
  // Modal imports for the Difficulty Popup
  Modal,
  Backdrop,
  Fade,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
// --- ICON IMPORTS ---
import MoreVertIcon from '@mui/icons-material/MoreVert';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import ListIcon from '@mui/icons-material/List';
import HelpCenterIcon from '@mui/icons-material/HelpCenter';
// Icons for Question Types
import EditNoteIcon from '@mui/icons-material/EditNote';
import RadioButtonCheckedIcon from '@mui/icons-material/RadioButtonChecked';
import CheckBoxIcon from '@mui/icons-material/CheckBox';
import CodeIcon from '@mui/icons-material/Code';
import QuestionMarkIcon from '@mui/icons-material/QuestionMark';
import MinimizeIcon from '@mui/icons-material/Minimize';
// --- IMAGE IMPORT ---
import PlaceholderImage from '../../Placeholder_image.png';

// --- Shared Field Styling (New Helper Object for Points 3 & 4) ---
const INVISIBLE_TEXTFIELD_STYLE = {
  // 4. Background box color is grey (#F5F5F5) and remove the outline.
  backgroundColor: '#F5F5F5',
  borderRadius: '4px',

  // MUI TextField style overrides to remove outline and change placeholder color
  '& .MuiOutlinedInput-notchedOutline': {
    border: 'none', // Remove outline
  },
  '& .MuiInputBase-input::placeholder': {
    // 4. Default text color is grey (#3C3B3B)
    color: '#3C3B3B',
    opacity: 1, // Ensures custom color is visible
  },
  // Set text color to black (or default)
  '& .MuiInputBase-input': {
    color: '#3C3B3B',
  },
};

const MODAL_STYLE = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: 400,
  bgcolor: 'background.paper',
  boxShadow: 24,
  p: 4,
  borderRadius: 2,
};
/**
 * Renders a single question editing form with dynamic answer options.
 */
// conceptTags prop is now only used for initial pass-through, no longer to populate dropdown
function EditQuestionForm({
  questionNumber,
  question,
  onQuestionChange,
  onDelete,
  optionWidth = 730,
  conceptTags = [],
}) {
  // ADDED onDelete PROP
  // --- LOCAL STATE ---
  const [isAddingNewTag, setIsAddingNewTag] = useState(false);
  const [newTagInput, setNewTagInput] = useState('');
  // STATE: For Difficulty Modal
  const [isModalOpen, setIsModalOpen] = useState(false);

  // localConceptTags tracks tags created *within this specific form session*
  const [localConceptTags, setLocalConceptTags] = useState([]);

  // Helper to get the currently selected tag for the dropdown display
  const currentSelectedTag = useMemo(() => {
    if (
      Array.isArray(question.concept_tags) &&
      question.concept_tags.length > 0
    ) {
      return question.concept_tags[question.concept_tags.length - 1];
    }
    return 'Tagging';
  }, [question.concept_tags]);

  // The list of available tags only contains the current question's tags + local additions
  const availableTags = useMemo(() => {
    const allTags = new Set();

    // 1. Add the current question's existing tags
    if (Array.isArray(question.concept_tags)) {
      question.concept_tags.forEach((tag) => allTags.add(tag));
    }

    // 2. Add any newly created tags stored locally in this session
    (localConceptTags || []).forEach((tag) => allTags.add(tag));

    const sortedTags = Array.from(allTags)
      .filter((tag) => tag !== 'Tagging')
      .sort();

    return sortedTags;
  }, [localConceptTags, question.concept_tags]);

  // --- CONSTANTS ---
  const QUESTION_TYPES = {
    OPEN_ENDED: 'OPEN-ENDED',
    CODING: 'CODING',
    OTHERS: 'others',
    FILL_IN_THE_BLANKS: 'FILL-IN-THE-BLANKS', // Add new question type
    MULTIPLE_CHOICE: 'MCQ',
    MRQ: 'MRQ',
    DEFAULT: 'TYPE_DEFAULT',
  };
  const BLACK_ICON_COLOR = '#1F1F1F';
  const REQUIRED_TEXT_COLOR = '#3C3B3B';
  const RED_ASTERISK_COLOR = '#FF1744';
  const BLUE_ACCENT_COLOR = '#007bff';
  const RED_DELETE_ICON_COLOR = '#D50000';
  const defaultOptions = [
    { id: 'opt1', text: '', isCorrect: false, label: 'A' },
    { id: 'opt2', text: '', isCorrect: false, label: 'B' },
    { id: 'opt3', text: '', isCorrect: false, label: 'C' },
    { id: 'opt4', text: '', isCorrect: false, label: 'D' },
  ];
  const normalizedQuestionType = useMemo(() => {
    const type = question.question_type;
    if (!type) return QUESTION_TYPES.DEFAULT;
    if (type.toLowerCase() === 'others') return QUESTION_TYPES.OTHERS;
    return type.toUpperCase();
  }, [question.question_type]);

  // --- HELPER FUNCTION: Parse API answer string into an array of correct labels ---
  const parseApiAnswerLabels = (answerString) => {
    if (typeof answerString !== 'string' || !answerString) {
      return [];
    }
    const matches = answerString.match(/[A-Z]\./g);
    if (matches) {
      return matches.map((match) => match.replace('.', '').trim());
    }
    if (answerString.length === 1 && /[A-Z]/.test(answerString)) {
      return [answerString];
    }
    return [];
  };

  // --- HELPER FUNCTION: Generate Formatted Answer String for question_answer ---
  const generateFormattedAnswer = useCallback((options) => {
    const correctOptions = options.filter(
      (opt) => opt.isCorrect && opt.text.trim() !== ''
    );

    if (correctOptions.length === 0) {
      return '';
    }

    // Format: "A. Option Text, B. Another Text"
    const formattedAnswers = correctOptions.map(
      (opt) => `${opt.label}. ${opt.text.trim()}`
    );

    return formattedAnswers.join(', ');
  }, []);

  // 3. Normalize API data (question_options and answer) into a uniform options array
  const normalizedOptions = useMemo(() => {
    const type = normalizedQuestionType;
    const apiOptions = question.question_options || [];
    const apiAnswerLabels = parseApiAnswerLabels(question.question_answer);
    if (
      type !== QUESTION_TYPES.MULTIPLE_CHOICE &&
      type !== QUESTION_TYPES.MRQ
    ) {
      return [];
    }

    if (question.options && question.options.length > 0) {
      return question.options;
    }
    const mappedOptions = apiOptions.map((opt) => {
      const label = opt.label;
      const text = opt.text;
      let isCorrect = apiAnswerLabels.includes(label);
      const id = `opt${label.charCodeAt(0) - 'A'.charCodeAt(0) + 1}`;

      return {
        id,
        label,
        text,
        isCorrect,
      };
    });

    return mappedOptions.length > 0 ? mappedOptions : defaultOptions;
  }, [
    question.question_options,
    question.question_answer,
    normalizedQuestionType,
    question.options,
  ]);

  // Helper function to get the correct Icon for the question type
  const getQuestionTypeIcon = (type) => {
    const normalizedType =
      type === QUESTION_TYPES.OTHERS ? 'OTHERS' : type.toUpperCase();

    switch (normalizedType) {
      case QUESTION_TYPES.OPEN_ENDED:
        return (
          <EditNoteIcon
            sx={{ color: BLACK_ICON_COLOR, mr: 1, fontSize: '1.2rem' }}
          />
        );
      case 'CODING':
        return (
          <CodeIcon
            sx={{ color: BLACK_ICON_COLOR, mr: 1, fontSize: '1.2rem' }}
          />
        );
      case 'OTHERS':
        return (
          <QuestionMarkIcon
            sx={{ color: BLACK_ICON_COLOR, mr: 1, fontSize: '1.2rem' }}
          />
        );
      case QUESTION_TYPES.FILL_IN_THE_BLANKS:
        return (
          <MinimizeIcon
            sx={{ color: BLACK_ICON_COLOR, mr: 1, fontSize: '1.2rem' }}
          />
        );
      case QUESTION_TYPES.MULTIPLE_CHOICE:
        return (
          <RadioButtonCheckedIcon
            sx={{ color: BLACK_ICON_COLOR, mr: 1, fontSize: '1.2rem' }}
          />
        );
      case QUESTION_TYPES.MRQ:
        return (
          <CheckBoxIcon
            sx={{ color: BLACK_ICON_COLOR, mr: 1, fontSize: '1.2rem' }}
          />
        );
      default:
        return null;
    }
  };

  // --- Handlers (FIXED: Appending logic) ---
  const handleTagChange = (event) => {
    const newTag = event.target.value;
    if (newTag === 'NEW_TAG_INPUT_TRIGGER') {
      setIsAddingNewTag(true);
      setNewTagInput('');
    } else {
      setIsAddingNewTag(false);

      const currentTags = Array.isArray(question.concept_tags)
        ? [...question.concept_tags]
        : [];

      if (!currentTags.includes(newTag)) {
        const updatedTags = [...currentTags, newTag];
        onQuestionChange(question.id, 'concept_tags', updatedTags);
      }
    }
  };

  const handleNewTagSubmit = () => {
    const tagToCreate = newTagInput.trim();
    if (tagToCreate !== '') {
      // 1. Update the local list of available tags (for this session)
      if (!availableTags.includes(tagToCreate)) {
        setLocalConceptTags((prevTags) => {
          const newTagsList = [...prevTags, tagToCreate];
          newTagsList.sort();
          return newTagsList;
        });
      }

      // 2. Append the new tag to the current question's tag array
      const currentTags = Array.isArray(question.concept_tags)
        ? [...question.concept_tags]
        : [];

      if (!currentTags.includes(tagToCreate)) {
        const updatedTags = [...currentTags, tagToCreate];
        onQuestionChange(question.id, 'concept_tags', updatedTags);
      }
    }
    setIsAddingNewTag(false);
    setNewTagInput('');
  };

  const handleRemoveTag = (tagToRemove) => {
    const currentTags = Array.isArray(question.concept_tags)
      ? question.concept_tags
      : [];
    const updatedTags = currentTags.filter((tag) => tag !== tagToRemove);
    onQuestionChange(question.id, 'concept_tags', updatedTags);
  };

  // --- Other Handlers (Answer Formatting Updates) ---
  const handleTextChange = (event) => {
    onQuestionChange(question.id, 'question_stem', event.target.value);
  };

  const handleAnswerChange = (event) => {
    const newAnswerText = event.target.value;
    // Always write directly to question_answer for persistence
    if (
      normalizedQuestionType === QUESTION_TYPES.OPEN_ENDED ||
      normalizedQuestionType === QUESTION_TYPES.CODING ||
      normalizedQuestionType === QUESTION_TYPES.OTHERS ||
      normalizedQuestionType === QUESTION_TYPES.FILL_IN_THE_BLANKS
    ) {
      onQuestionChange(question.id, 'question_answer', newAnswerText);
    }
  };

  const handleTypeChange = (event) => {
    const newType = event.target.value;
    const normalizedNewType = newType.toUpperCase();

    if (
      normalizedNewType === QUESTION_TYPES.MULTIPLE_CHOICE ||
      normalizedNewType === QUESTION_TYPES.MRQ
    ) {
      if (
        !question.options ||
        question.options.length === 0 ||
        normalizedQuestionType !== normalizedNewType
      ) {
        const freshDefaultOptions = [
          { id: 'opt1', text: '', isCorrect: false, label: 'A' },
          { id: 'opt2', text: '', isCorrect: false, label: 'B' },
          { id: 'opt3', text: '', isCorrect: false, label: 'C' },
          { id: 'opt4', text: '', isCorrect: false, label: 'D' },
        ];
        onQuestionChange(question.id, 'options', freshDefaultOptions);
      }
    } else {
      if (question.options && question.options.length > 0) {
        onQuestionChange(question.id, 'options', []);
      }
      // When switching AWAY from MC/MRQ, we clear the question_answer field,
      // and now we rely solely on question_answer
      if (
        normalizedQuestionType === QUESTION_TYPES.MULTIPLE_CHOICE ||
        normalizedQuestionType === QUESTION_TYPES.MRQ
      ) {
        onQuestionChange(question.id, 'question_answer', '');
      }
    }
    if (newType !== QUESTION_TYPES.DEFAULT) {
      onQuestionChange(question.id, 'question_type', newType);
    }
  };

  const handleOptionTextChange = (optionId, event) => {
    const optionsToUpdate = normalizedOptions;
    const newOptions = optionsToUpdate.map((opt) =>
      opt.id === optionId ? { ...opt, text: event.target.value } : opt
    );
    onQuestionChange(question.id, 'options', newOptions);

    // Re-run the formatted answer update if it's an MC/MRQ, since the text changed
    if (
      normalizedQuestionType === QUESTION_TYPES.MULTIPLE_CHOICE ||
      normalizedQuestionType === QUESTION_TYPES.MRQ
    ) {
      const formattedAnswerString = generateFormattedAnswer(newOptions);
      onQuestionChange(question.id, 'question_answer', formattedAnswerString);
    }
  };

  const handleOptionCorrectnessToggle = (optionId) => {
    const isMC = normalizedQuestionType === QUESTION_TYPES.MULTIPLE_CHOICE;
    const optionsToUpdate = normalizedOptions;

    let newOptions;
    let newAnswerLabels;

    if (isMC) {
      newOptions = optionsToUpdate.map((opt) => ({
        ...opt,
        isCorrect: opt.id === optionId,
      }));
      newAnswerLabels = newOptions
        .filter((opt) => opt.isCorrect)
        .map((opt) => opt.label);
    } else {
      newOptions = optionsToUpdate.map((opt) =>
        opt.id === optionId ? { ...opt, isCorrect: !opt.isCorrect } : opt
      );
      newAnswerLabels = newOptions
        .filter((opt) => opt.isCorrect)
        .map((opt) => opt.label);
    }

    // 1. Update the 'options' array state
    onQuestionChange(question.id, 'options', newOptions);

    // 3. Generate and update the formatted 'question_answer' string
    const formattedAnswerString = generateFormattedAnswer(newOptions);
    onQuestionChange(question.id, 'question_answer', formattedAnswerString);
  };

  const handleNoOp = () => {};

  const handleDeleteQuestion = () => {
    console.log(`Deleting question ${question.id}`);
    // MODIFIED: Replaced handleNoOp() with the call to the onDelete prop
    if (onDelete) {
      onDelete(question.id);
    }
  };

  // Remaining handlers

  const handleAddNewOption = () => {
    const optionsToUpdate = normalizedOptions;
    const optionsCount = optionsToUpdate.length;
    const nextLabelCode = 'A'.charCodeAt(0) + optionsCount;
    const nextLabel = String.fromCharCode(nextLabelCode);
    const newOptionId = `opt${optionsCount + 1}-${Date.now()}`;
    const newOption = {
      id: newOptionId,
      label: nextLabel,
      text: '',
      isCorrect: false,
    };
    const updatedOptions = [...optionsToUpdate, newOption];
    onQuestionChange(question.id, 'options', updatedOptions);

    // Update question_answer if it is MC/MRQ and had a selection before adding the option
    if (
      (normalizedQuestionType === QUESTION_TYPES.MULTIPLE_CHOICE ||
        normalizedQuestionType === QUESTION_TYPES.MRQ) &&
      normalizedOptions.some((opt) => opt.isCorrect)
    ) {
      const formattedAnswerString = generateFormattedAnswer(updatedOptions);
      onQuestionChange(question.id, 'question_answer', formattedAnswerString);
    }
  };
  const handleDeleteOption = (optionId) => {
    const optionsToUpdate = normalizedOptions;

    if (optionsToUpdate.length > 1) {
      let newOptions = optionsToUpdate.filter((opt) => opt.id !== optionId);

      newOptions = newOptions.map((opt, index) => {
        const newLabel = String.fromCharCode('A'.charCodeAt(0) + index);
        return { ...opt, label: newLabel };
      });

      const newAnswerLabels = newOptions
        .filter((opt) => opt.isCorrect)
        .map((opt) => opt.label);

      onQuestionChange(question.id, 'options', newOptions);

      // Update the formatted question_answer
      const formattedAnswerString = generateFormattedAnswer(newOptions);
      onQuestionChange(question.id, 'question_answer', formattedAnswerString);
    } else {
      console.log('Cannot delete option: Must have at least one option remaining.');
    }
  };

  const handleClearOpenEndedAnswer = () => {
    // Clear question_answer for open-ended types
    onQuestionChange(question.id, 'question_answer', '');
  };

  // HANDLER: Handles the change event for the difficulty input
  const handleDifficultyChange = (event) => {
    let value = event.target.value.trim();

    if (value === '') {
      // Allow clearing the field (set to null in the state)
      onQuestionChange(question.id, 'difficulty_rating_manual', null);
    } else {
      // Validate input: must be a number between 0 and 1
      const numValue = parseFloat(value);
      if (!isNaN(numValue) && numValue >= 0 && numValue <= 1) {
        // Round to 4 decimal places for clean storage
        onQuestionChange(
          question.id,
          'difficulty_rating_manual',
          Math.round(numValue * 10000) / 10000
        );
      }
      // Ignore invalid input (or optionally provide feedback)
    }
  };

  // --- Render answer sections ---
  const renderOpenEndedAnswer = () => (
    <Box mt={3}>
      <Typography
        variant="body1"
        fontWeight="bold"
        sx={{ color: REQUIRED_TEXT_COLOR, mb: 1 }}
      >
        Answer
        <Box component="span" sx={{ color: RED_ASTERISK_COLOR }}>
          *
        </Box>
      </Typography>
      <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 1 }}>
        <TextField
          fullWidth
          multiline
          rows={2}
          variant="outlined"
          size="small"
          placeholder="Enter correct answer here (or expected answer format)."
          value={question.question_answer || ''} // FIX: BIND DIRECTLY TO PERSISTED FIELD
          onChange={handleAnswerChange}
          sx={{ mr: 1, ...INVISIBLE_TEXTFIELD_STYLE }}
        />
        <IconButton
          size="small"
          aria-label="clear answer"
          onClick={handleClearOpenEndedAnswer}
          sx={{ mt: '4px' }}
        >
          <DeleteIcon color="error" />
        </IconButton>
      </Box>
    </Box>
  );

  const renderCodingAnswer = renderOpenEndedAnswer;
  const renderOthersAnswer = renderOpenEndedAnswer;
  const renderMultipleChoiceAnswers = () => {
    const optionsToRender = normalizedOptions;
    const correctOptionId = optionsToRender.find((opt) => opt.isCorrect)?.id;
    return (
      <Box mt={3}>
        <Typography variant="body1" fontWeight="bold" gutterBottom>
          Choices
          <Box component="span" sx={{ color: RED_ASTERISK_COLOR }}>
            *
          </Box>{' '}
          (Select ONE correct answer)
        </Typography>
        <RadioGroup
          value={correctOptionId || ''}
          name={`mc-options-${question.id}`}
          onChange={(e) => handleOptionCorrectnessToggle(e.target.value)}
        >
          {optionsToRender.map((option) => (
            <Box
              key={option.id}
              sx={{ display: 'flex', alignItems: 'center', mb: 1 }}
            >
              <FormControlLabel
                value={option.id}
                control={<Radio size="small" />}
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Typography
                      variant="body1"
                      sx={{ mr: 1, fontWeight: 'bold' }}
                    >
                      {option.label}.
                    </Typography>
                    <TextField
                      variant="outlined"
                      size="small"
                      value={option.text}
                      placeholder={`Option ${option.label} (Click to Edit)`}
                      onChange={(e) => handleOptionTextChange(option.id, e)}
                      sx={{ width: optionWidth, ...INVISIBLE_TEXTFIELD_STYLE }}
                    />
                  </Box>
                }
              />
              <IconButton
                size="small"
                aria-label="delete option"
                sx={{ ml: 1 }}
                onClick={() => handleDeleteOption(option.id)}
                disabled={optionsToRender.length <= 1}
              >
                <DeleteIcon
                  sx={{
                    color:
                      optionsToRender.length <= 1
                        ? '#B8B8B8'
                        : RED_DELETE_ICON_COLOR,
                  }}
                />
              </IconButton>
            </Box>
          ))}
        </RadioGroup>
        <Button
          variant="text"
          startIcon={<AddIcon />}
          onClick={handleAddNewOption}
          sx={{
            mt: 1,
            textTransform: 'none',
            color: BLUE_ACCENT_COLOR,
            border: `1px dotted ${BLUE_ACCENT_COLOR}`,
            borderRadius: '4px',
            '&:hover': { backgroundColor: 'rgba(0, 123, 255, 0.04)' },
          }}
        >
          Add Option
        </Button>
      </Box>
    );
  };
  const renderMRQAnswers = () => {
    const optionsToRender = normalizedOptions;
    return (
      <Box mt={3}>
        <Typography variant="body1" fontWeight="bold" gutterBottom>
          Choices
          <Box component="span" sx={{ color: RED_ASTERISK_COLOR }}>
            *
          </Box>{' '}
          (Select ALL correct answers)
        </Typography>
        {optionsToRender.map((option) => (
          <Box
            key={option.id}
            sx={{ display: 'flex', alignItems: 'center', mb: 1 }}
          >
            <FormControlLabel
              control={
                <Checkbox
                  size="small"
                  checked={!!option.isCorrect}
                  onChange={() => handleOptionCorrectnessToggle(option.id)}
                />
              }
              label={
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Typography
                    variant="body1"
                    sx={{ mr: 1, fontWeight: 'bold' }}
                  >
                    {option.label}.
                  </Typography>
                  <TextField
                    variant="outlined"
                    size="small"
                    value={option.text}
                    placeholder={`Option ${option.label} (Click to Edit)`}
                    onChange={(e) => handleOptionTextChange(option.id, e)}
                    sx={{ width: optionWidth, ...INVISIBLE_TEXTFIELD_STYLE }}
                  />
                </Box>
              }
            />
            <IconButton
              size="small"
              aria-label="delete option"
              sx={{ ml: 1 }}
              onClick={() => handleDeleteOption(option.id)}
              disabled={optionsToRender.length <= 1}
            >
              <DeleteIcon
                sx={{
                  color:
                    optionsToRender.length <= 1
                      ? '#B8B8B8'
                      : RED_DELETE_ICON_COLOR,
                }}
              />
            </IconButton>
          </Box>
        ))}
        <Button
          variant="text"
          startIcon={<AddIcon />}
          onClick={handleAddNewOption}
          sx={{
            mt: 1,
            textTransform: 'none',
            color: BLUE_ACCENT_COLOR,
            border: `1px dotted ${BLUE_ACCENT_COLOR}`,
            borderRadius: '4px',
            '&:hover': { backgroundColor: 'rgba(0, 123, 255, 0.04)' },
          }}
        >
          Add Option
        </Button>
      </Box>
    );
  };
  // --- Conditional Rendering ---
  const renderAnswerSection = () => {
    switch (normalizedQuestionType) {
      case QUESTION_TYPES.MULTIPLE_CHOICE:
        return renderMultipleChoiceAnswers();
      case QUESTION_TYPES.MRQ:
        return renderMRQAnswers();
      case QUESTION_TYPES.CODING:
        return renderCodingAnswer();
      case QUESTION_TYPES.OTHERS:
        return renderOthersAnswer();
      case QUESTION_TYPES.FILL_IN_THE_BLANKS:
        return renderOpenEndedAnswer();
      case QUESTION_TYPES.OPEN_ENDED:
      default:
        return renderOpenEndedAnswer();
    }
  };

  // --- Tag Display Logic ---
  const currentTags = Array.isArray(question.concept_tags)
    ? question.concept_tags
    : [];
  const firstTag = currentTags.length > 0 ? currentTags[0] : null;
  const additionalTagCount = currentTags.length > 1 ? currentTags.length - 1 : 0;

  return (
    <>
      {/* MODAL FOR MANUAL DIFFICULTY RATING */}
      <Dialog
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        aria-labelledby="difficulty-title"
      >
        <DialogTitle id="difficulty-title">
          Difficulty Rating (Manual)
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" gutterBottom sx={{ mb: 2 }}>
            Set a manual difficulty score (0.0 to 1.0) for this question. This
            will override the model's prediction. Leave blank to use the model
            prediction or clear the value.
          </Typography>
          <TextField
            label="Difficulty Score"
            variant="outlined"
            fullWidth
            value={
              question.difficulty_rating_manual === null
                ? ''
                : String(question.difficulty_rating_manual)
            }
            onChange={handleDifficultyChange}
            placeholder="Score / 1.0 (e.g., 0.65)"
            inputProps={{
              type: 'number',
              step: '0.01',
              min: 0,
              max: 1,
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsModalOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* --- MAIN CARD CONTENT --- */}
      <Card
        sx={{
          ml: 6,
          boxShadow: 'none',
          border: '1px solid #B8B8B8',
          borderRadius: 2,
        }}
      >
        <CardContent>
          {/* Dropdowns and Required Toggle */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 2,
              width: '800px',
              mb: 1,
            }}
          >
            {/* --- Question Type Dropdown (Unchanged) --- */}
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <Select
                input={<InputBase />}
                value={normalizedQuestionType}
                onChange={handleTypeChange}
                sx={{
                  backgroundColor: '#F5F5F5',
                  borderRadius: '4px',
                  border: 'none',
                  '& .MuiOutlinedInput-notchedOutline': { border: 'none' },
                  '& .MuiSelect-select': {
                    p: '8px 12px',
                    display: 'flex',
                    alignItems: 'center',
                  },
                }}
              >
                <MenuItem
                  value={QUESTION_TYPES.DEFAULT}
                  disabled={normalizedQuestionType !== QUESTION_TYPES.DEFAULT}
                  sx={{
                    display:
                      normalizedQuestionType !== QUESTION_TYPES.DEFAULT
                        ? 'none'
                        : 'flex',
                  }}
                >
                  <Typography sx={{ color: '#9E9E9E', ml: '24px' }}>
                    Type
                  </Typography>
                </MenuItem>
                <MenuItem
                  value={QUESTION_TYPES.OPEN_ENDED}
                  sx={{ color: BLACK_ICON_COLOR }}
                >
                  {getQuestionTypeIcon(QUESTION_TYPES.OPEN_ENDED)} Open-ended
                </MenuItem>
                <MenuItem
                  value={QUESTION_TYPES.CODING}
                  sx={{ color: BLACK_ICON_COLOR }}
                >
                  {getQuestionTypeIcon(QUESTION_TYPES.CODING)} CODING
                </MenuItem>
                <MenuItem
                  value={QUESTION_TYPES.OTHERS}
                  sx={{ color: BLACK_ICON_COLOR }}
                >
                  {getQuestionTypeIcon(QUESTION_TYPES.OTHERS)} OTHERS
                </MenuItem>
                <MenuItem
                  value={QUESTION_TYPES.FILL_IN_THE_BLANKS}
                  sx={{ color: BLACK_ICON_COLOR }}
                >
                  {getQuestionTypeIcon(QUESTION_TYPES.FILL_IN_THE_BLANKS)}{' '}
                  FILL-IN-THE-BLANKS
                </MenuItem>
                <MenuItem
                  value={QUESTION_TYPES.MULTIPLE_CHOICE}
                  sx={{ color: BLACK_ICON_COLOR }}
                >
                  {getQuestionTypeIcon(QUESTION_TYPES.MULTIPLE_CHOICE)} Multiple
                  choice
                </MenuItem>
                <MenuItem
                  value={QUESTION_TYPES.MRQ}
                  sx={{ color: BLACK_ICON_COLOR }}
                >
                  {getQuestionTypeIcon(QUESTION_TYPES.MRQ)} MRQ (Multiple
                  Response)
                </MenuItem>
              </Select>
            </FormControl>
            {/* --- Tagging Dropdown (Dropdown value remains single, handler appends) --- */}
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <Select
                input={<InputBase />}
                value={currentSelectedTag}
                onChange={handleTagChange}
                sx={{
                  backgroundColor: '#F5F5F5',
                  borderRadius: '4px',
                  border: 'none',
                  '& .MuiOutlinedInput-notchedOutline': { border: 'none' },
                  '& .MuiSelect-select': {
                    p: '8px 12px',
                    display: 'flex',
                    alignItems: 'center',
                  },
                }}
              >
                {/* Display the default 'Tagging' label if no tag is selected */}
                {currentSelectedTag === 'Tagging' && (
                  <MenuItem value="Tagging" sx={{ color: '#9E9E9E' }}>
                    <ListIcon
                      sx={{
                        color: BLACK_ICON_COLOR,
                        mr: 1,
                        fontSize: '1.2rem',
                      }}
                    />{' '}
                    Tagging
                  </MenuItem>
                )}

                {/* Map all available concept tags to menu items */}
                {availableTags.map((tag) => (
                  <MenuItem key={tag} value={tag}>
                    {tag}
                  </MenuItem>
                ))}
                {/* Add Iconbutton at the very bottom */}
                <Divider sx={{ my: 0.5 }} />
                <MenuItem
                  value="NEW_TAG_INPUT_TRIGGER"
                  onClick={(e) => {
                    e.preventDefault();
                    handleTagChange({
                      target: { value: 'NEW_TAG_INPUT_TRIGGER' },
                    });
                  }}
                >
                  <AddIcon fontSize="small" sx={{ mr: 1 }} />
                  Add New Tag
                </MenuItem>
              </Select>
            </FormControl>

            {/* LIMITED VISUAL TAG DISPLAY */}
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                minHeight: 40,
                gap: 0.2,
                maxWidth: '120px',
              }}
            >
              {firstTag && (
                <Chip
                  key={0}
                  label={firstTag}
                  size="small"
                  onDelete={() => handleRemoveTag(firstTag)}
                  sx={{ height: 24, bgcolor: '#E0F2F1', color: '#004D40' }}
                />
              )}
              {additionalTagCount > 0 && (
                <Typography
                  variant="caption"
                  sx={{ color: '#004D40', ml: 0.5 }}
                >
                  + {additionalTagCount} more
                </Typography>
              )}
            </Box>
            {/* End Limited Visual Tag Display */}

            <Box sx={{ flexGrow: 1 }} />
            {/* Required Toggle, MoreVert, Delete Buttons */}
            <Typography
              variant="body2"
              sx={{ color: REQUIRED_TEXT_COLOR, fontWeight: 'normal' }}
            >
              Required
            </Typography>
            <Switch defaultChecked color="success" />

            <Box
              sx={{
                border: '1px solid #B8B8B8',
                borderRadius: '4px',
                width: 40,
                height: 40,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <IconButton
                size="small"
                aria-label="more options"
                sx={{ p: 0 }}
                onClick={() => setIsModalOpen(true)}
              >
                {/* Opens Modal */}
                <MoreVertIcon sx={{ color: BLACK_ICON_COLOR }} />
              </IconButton>
            </Box>
            <Box
              sx={{
                border: '1px solid #B8B8B8',
                borderRadius: '4px',
                width: 40,
                height: 40,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <IconButton
                size="small"
                aria-label="delete question"
                sx={{ p: 0 }}
                onClick={handleDeleteQuestion}
              >
                <DeleteIcon sx={{ color: RED_DELETE_ICON_COLOR }} />
              </IconButton>
            </Box>
          </Box>
          {/* --- New Tag Input Field (Conditional Render) --- */}
          {isAddingNewTag && (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                mb: 2,
                ml: 1,
              }}
            >
              <TextField
                size="small"
                placeholder="Enter new concept tag name"
                value={newTagInput}
                onChange={(e) => setNewTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleNewTagSubmit();
                  }
                }}
                sx={{ width: 250, ...INVISIBLE_TEXTFIELD_STYLE }}
              />
              <Button
                variant="contained"
                size="small"
                onClick={handleNewTagSubmit}
                disabled={newTagInput.trim() === ''}
              >
                Create & Select
              </Button>
              <Button
                variant="outlined"
                size="small"
                onClick={() => setIsAddingNewTag(false)}
              >
                Cancel
              </Button>
            </Box>
          )}

          {/* --- Horizontal Divider for Aesthetics --- */}
          <Divider sx={{ height: '1px', borderColor: '#B8B8B8', mt: 0, mb: 2 }} />
          {/* --- Question Title Input and Image --- */}

          {/* 1. Question Number/Title on its own line (full width) */}
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <HelpCenterIcon
                  sx={{ color: '#000000', fontSize: '1.5rem', mr: 1 }}
                />
                <Typography variant="body1" sx={{ color: REQUIRED_TEXT_COLOR }}>
                  Question {questionNumber}
                  <Box component="span" sx={{ color: RED_ASTERISK_COLOR }}>
                    *
                  </Box>
                </Typography>
              </Box>
            </Grid>
          </Grid>
          {/* 2. Grid container for TextField and Image on the line below */}
          <Grid container spacing={2} sx={{ mt: 0 }}>
            {/* --- Grid for Question TextField (Left Side) --- */}
            <Grid item xs={9}>
              <TextField
                multiline
                rows={5}
                placeholder="Enter your question here."
                variant="outlined"
                value={question.question_stem || ''}
                onChange={handleTextChange}
                sx={{ width: '550px', ...INVISIBLE_TEXTFIELD_STYLE }}
              />
            </Grid>

            {/* --- Grid for Static Image (Right Side) --- */}
            <Grid item xs={3}>
              <Box
                sx={{
                  height: '100%',
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'flex-start',
                }}
              >
                <img
                  src={PlaceholderImage}
                  alt="Placeholder Image"
                  style={{
                    height: '150px',
                    width: '250px',
                    objectFit: 'cover',
                    border: '1px solid #ccc',
                  }}
                />
              </Box>
            </Grid>
          </Grid>
          {/* DYNAMIC ANSWER SECTION */}
          {renderAnswerSection()}
        </CardContent>
      </Card>
    </>
  );
}
export default EditQuestionForm;