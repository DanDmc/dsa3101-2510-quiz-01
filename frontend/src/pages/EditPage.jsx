/**
 * @file EditPage component.
 * @module pages/EditPage
 * Renders the main interface for bulk editing questions loaded from the database or uploaded via file.
 *
 * This component initializes its state with `selectedQuestions` from the parent route, manages all 
 * question-specific and global assessment metadata state, and coordinates the saving (PATCH/POST) 
 * and deletion (DELETE) operations with the API. It includes file upload functionality to dynamically 
 * append new questions to the current editing session.
 *
 * @typedef {object} QuestionData
 * @property {number} id - Local unique ID.
 * @property {number} question_base_id - ID of the original question record in the database (0 if local/new).
 * @property {string} [question_stem] - The question text.
 * @property {Array<string>} [concept_tags] - List of concept tags.
 * @property {string | null} [course] - Course metadata.
 *
 * @param {object} props The component props.
 * @param {Array<QuestionData>} props.selectedQuestions - The array of question objects passed from the previous route 
 * (e.g., the search page) to be loaded and edited.
 * @param {function(): void} props.goToHomePage - Navigation handler to return to the application's home page (used by CreateToolbar's Cancel and after successful saving/deletion).
 * @param {number} [props.headerHeight=0] - Height of the header component for CSS viewport calculations.
 * @param {number} [props.footerHeight=0] - Height of the footer component for CSS viewport calculations.
 * @returns {JSX.Element} A layout containing the question sidebar, global metadata toolbar, and scrollable form area.
 * @fires fetch - Triggers API calls for:
 * - POST to '/api/createquestion' (for new questions added during the session).
 * - PATCH to '/api/editquestions/:id' (for updates to existing questions).
 * - DELETE to '/api/deletequestion/:id' (for permanently removing saved questions).
 * - POST to '/api/upload_file' (to import questions from a local file).
 */

// src/pages/EditPage.jsx

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
    Box,
    Container,
    CssBaseline,
    Grid,
    Button,
    Divider,
    Typography
} from '@mui/material';
import QuestionStepper from '../components/QuestionStepper';
import CreateToolbar from '../components/CreateToolbar';
import CreateFilterToolbar from '../components/CreateFilterToolbar';
import EditQuestionForm from '../components/EditQuestionForm';
import DownloadIcon from '@mui/icons-material/Download';

const BASE_API_URL = import.meta.env.VITE_APP_API_URL || ''; // Base URL for API calls

const cleanValue = (value) => (value === '' || value === undefined ? null : value);

const createNewQuestion = (id) => ({
    id: id,
    question_base_id: 0,
    question_type: 'OPEN-ENDED',
    question_stem: '',
    question_answer: '',
    options: null,
    concept_tags: [],
    assessment_type: null,
    year: null,
    semester: null,
    course: null,
    difficulty_rating_manual: null,
});

function EditPage({ selectedQuestions, goToHomePage, headerHeight = 0, footerHeight = 0 }) {
    // --- Constants ---
    const SIDEBAR_WIDTH_MD = 300;
    const ORANGE_COLOR = '#F57F17';
    const WHITE_COLOR = '#FFFFFF';
    const TOOLBAR_GRID_WIDTH = '1200px';
    const FORM_GRID_WIDTH = '1100px';
    const FORM_HORIZONTAL_MARGIN = 6;
    const ACTIVE_FORM_WIDTH_INCREASE = '10px';
    const DIVIDER_LEFT_PADDING = '48px';
    const DIVIDER_WIDTH_PERCENT = '100%';
    const MAIN_CONTAINER_BOTTOM_MARGIN_PX = 0;
    const SIDEBAR_BOTTOM_OFFSET_PX = -64;
    const SIDEBAR_HEIGHT_CALC = `calc(100vh - ${headerHeight}px - ${footerHeight}px - ${MAIN_CONTAINER_BOTTOM_MARGIN_PX}px)`;
    const TOOLBAR_AREA_HEIGHT_PX = 200;
    const SCROLLABLE_FORMS_HEIGHT = `calc(${SIDEBAR_HEIGHT_CALC} - ${TOOLBAR_AREA_HEIGHT_PX}px)`;
    const HORIZONTAL_GAP_FIX = 24;

    // --- State ---
    const [questions, setQuestions] = useState([]);
    const [activeQuestionId, setActiveQuestionId] = useState(null);
    const [activeFilters, setActiveFilters] = useState([]);
    const [isUploading, setIsUploading] = useState(false); // New state to manage loading

    const [isGroupedAssessment, setIsGroupedAssessment] = useState(false);
    const [assessmentMetadata, setAssessmentMetadata] = useState({
        assessment_type: '',
        year: '',
        semester: '',
        course: '',
    });

    // NOTE: initialSavedIds state is no longer strictly necessary for local deletion but kept for save logic context.
    const [initialSavedIds, setInitialSavedIds] = useState(new Set());

    // --- Refs and Memos ---
    const questionRefs = useRef({});
    const formsScrollContainerRef = useRef(null);
    const filterToolbarRef = useRef(null);

    const allConceptTags = useMemo(() => {
        const tags = new Set();
        questions.forEach(q => {
            if (Array.isArray(q.concept_tags)) {
                q.concept_tags.forEach(tag => tags.add(tag));
            } else if (q.concept_tag && q.concept_tag !== 'Tagging') {
                tags.add(q.concept_tag);
            }
        });
        return Array.from(tags).sort();
    }, [questions]);

    const isModified = useMemo(() => questions.length > 0, [questions]);


    // --- Effects ---
    // 1. Initialization from prop (Runs ONLY on initial load of selected questions)
    useEffect(() => {
        if (selectedQuestions && selectedQuestions.length > 0) {
            const updatedQuestions = selectedQuestions.map(q => ({
                ...q,
                difficulty_rating_manual: q.difficulty_rating_manual !== undefined ? q.difficulty_rating_manual : null,
            }));

            setQuestions(updatedQuestions);
            setActiveQuestionId(selectedQuestions[0].id);

            const savedIds = new Set(selectedQuestions.map(q => q.id));
            setInitialSavedIds(savedIds);

        } else {
            setQuestions([]);
            setActiveQuestionId(null);
            setInitialSavedIds(new Set());
        }
    }, [selectedQuestions]);

    // 2. Uniformity Check and Metadata Pre-filling
    useEffect(() => {
        if (!questions || questions.length === 0) return;

        const isUniformAndNotEmpty = (qArray) => {
            const firstQ = qArray[0];
            const firstA = firstQ.assessment_type || null;
            const firstY = firstQ.year || null;
            const firstS = firstQ.semester || null;
            const firstC = firstQ.course || null;

            if (firstA === null && firstY === null && firstS === null && firstC === null) return false;

            return qArray.every(q =>
                (q.assessment_type || null) === firstA &&
                (q.year || null) === firstY &&
                (q.semester || null) === firstS &&
                (q.course || null) === firstC
            );
        };

        if (isUniformAndNotEmpty(questions)) {
            const firstQ = questions[0];

            setIsGroupedAssessment(true);

            setAssessmentMetadata({
                assessment_type: firstQ.assessment_type || '',
                year: firstQ.year || '',
                semester: firstQ.semester || '',
                course: firstQ.course || '',
            });

        } else {
            setIsGroupedAssessment(false);
            setAssessmentMetadata({
                assessment_type: '',
                year: '',
                semester: '',
                course: '',
            });
        }
    }, [questions.length, selectedQuestions]);

    // 3. Scroll to active question
    useEffect(() => {
        if (activeQuestionId && questionRefs.current[activeQuestionId]) {
            const el = questionRefs.current[activeQuestionId];

            el.scrollIntoView({
                behavior: 'smooth',
                block: 'start',
                inline: 'nearest'
            });
        }
    }, [activeQuestionId]);

    // HANDLER: Add a new question
    const handleAddQuestion = useCallback(() => {
        setQuestions(prevQuestions => {
            const maxExistingId = Math.max(0, ...prevQuestions.map(q => q.id));
            const nextId = maxExistingId + 1;

            const newQuestion = {
                ...createNewQuestion(nextId),
                assessment_type: assessmentMetadata.assessment_type,
                year: assessmentMetadata.year,
                semester: assessmentMetadata.semester,
                course: assessmentMetadata.course,
            };

            const newQuestionsArray = [...prevQuestions, newQuestion];
            setActiveQuestionId(nextId);

            return newQuestionsArray;
        });
    }, [assessmentMetadata]);

    // --- Data Change Handlers ---
    const handleQuestionChange = (id, key, value) => {
        setQuestions(prev =>
            prev.map(q => q.id === id ? { ...q, [key]: value } : q)
        );
    };

    // Metadata updates from the FilterToolbar
    const handleAssessmentMetadataChange = useCallback((key, value) => {
        setAssessmentMetadata(prev => ({
            ...prev,
            [key]: value
        }));
    }, []);

    // Deletion Handler for EditPage (Requires API call)
    const handleDeleteQuestion = useCallback(async (questionToDelete) => {
        const idToDelete = questionToDelete.id;
        const questionBaseId = questionToDelete.question_base_id;

        // 1. Confirm deletion for saved questions
        if (questionBaseId !== 0) {
            const isConfirmed = window.confirm(
                "Are you sure you want to permanently delete this question from the database? This action cannot be undone."
            );
            if (!isConfirmed) {
                return;
            }
        }

        try {
            // 2. Perform API Deletion if it's an existing question
            if (questionBaseId !== 0) {
                console.log(`Attempting API deletion for question_base_id: ${questionBaseId}`);
                const response = await fetch(`${BASE_API_URL}/api/deletequestion/${questionBaseId}`, {
                    method: 'DELETE',
                    headers: { 'Content-Type': 'application/json' },
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.message || `Failed to delete from API: HTTP Status ${response.status}`);
                }
                alert(`Question ID ${idToDelete} successfully deleted from the database.`);
            } else {
                   console.log(`Question ID ${idToDelete} was not yet saved. Performing local removal only.`);
            }

            // 3. Update Local State (Same core logic as CreatePage after success)
            setQuestions(prevQuestions => {
                const remainingQuestions = prevQuestions.filter(q => q.id !== idToDelete);

                setActiveQuestionId(prevActive => {
                    if (prevActive === idToDelete) {
                        const deletedIndex = prevQuestions.findIndex(q => q.id === idToDelete);
                        if (remainingQuestions.length === 0) {
                            goToHomePage(); // Go home if the last question is deleted
                            return null;
                        }
                        const nextActiveIndex = Math.min(deletedIndex, remainingQuestions.length - 1);
                        return remainingQuestions[nextActiveIndex].id;
                    }
                    return remainingQuestions.length > 0 ? prevActive : null;
                });

                return remainingQuestions;
            });

        } catch (error) {
            console.error("Deletion failed:", error);
            alert(`Failed to delete question ${idToDelete}: ${error.message}`);
        }
    }, [questions, goToHomePage]); // Added goToHomePage as dependency for call inside setActiveQuestionId

    // ... Filter logic ...
    const handleFilterToggle = (filterValue) => {
        setActiveFilters(prevFilters => {
            if (prevFilters.includes(filterValue)) {
                return prevFilters.filter(filter => filter !== filterValue);
            } else {
                return [...prevFilters, filterValue];
            }
        });
    };
    const getFilteredQuestions = () => {
        if (activeFilters.length === 0) {
            return questions;
        }
        return questions.filter(question => activeFilters.includes(question.question_type || ''));
    };
    const filteredQuestions = getFilteredQuestions();


    // HANDLER: Implements the branching save/update
    const handleSaveAll = async () => {
        const publishStartTime = Date.now();

        if (questions.length === 0) return;

        const questionsToProcess = questions;
        const latestMetadata = filterToolbarRef.current?.getModifiedFilters() || {};

        const publishResults = [];
        let successCount = 0;

        for (const q of questionsToProcess) {
            if (!cleanValue(q.question_stem)) {
                 alert(`Error: Question ${q.id} is missing its question stem. Please fill it out.`);
                 return;
            }
        }

        for (const q of questionsToProcess) {

            // Check if it was loaded from the DB
            // NOTE: We check question_base_id here because a new question added in EditPage will have q.id, but question_base_id=0
            const isExistingQuestion = q.question_base_id !== 0;

            const apiUrl = isExistingQuestion
                ? `${BASE_API_URL}/api/editquestions/${q.question_base_id}`
                : `${BASE_API_URL}/api/createquestion`;
            const method = isExistingQuestion ? 'PATCH' : 'POST';

            const finalAssessmentType = cleanValue(latestMetadata.assessment_type) || 'others';

            const payload = {
                course: cleanValue(latestMetadata.course),
                year: cleanValue(latestMetadata.year),
                semester: cleanValue(latestMetadata.semester),
                assessment_type: finalAssessmentType,
                question_type: q.question_type ? q.question_type.toLowerCase() : null,
                question_stem: cleanValue(q.question_stem),
                question_options: q.options || [],
                question_answer: cleanValue(q.question_answer),
                concept_tags: q.concept_tags || [],
                difficulty_rating_manual: cleanValue(q.difficulty_rating_manual),
            };

            try {
                const response = await fetch(apiUrl, {
                    method: method,
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                });

                const data = await response.json();

                if (response.ok || response.status === 200) {
                    successCount++;
                    publishResults.push({ id: q.id, status: 'success', new_id: data.question_id || q.id });
                } else {
                    publishResults.push({
                        id: q.id,
                        status: 'failed',
                        error: data.error || data.message || `HTTP Status ${response.status}`,
                        details: data
                    });
                    console.error(`Failed to ${method} Q ID ${q.id}:`, data);
                }

            } catch (error) {
                publishResults.push({ id: q.id, status: 'network_failed', error: error.message });
                console.error(`Network error during ${method} Q ID ${q.id}:`, error);
            }
        }

        const failedCount = questionsToProcess.length - successCount;
        const totalTime = (Date.now() - publishStartTime) / 1000;

        console.log('--- PUBLISHING SUMMARY (EDIT) ---');
        console.log(`Total questions processed: ${questionsToProcess.length}`);
        console.log(`Successful operations: ${successCount}`);
        console.log(`Failed operations: ${failedCount}`);
        console.log(`Total time: ${totalTime.toFixed(2)}s`);
        console.log('Results per question:', publishResults);

        alert(`Update complete! ${successCount} successful, ${failedCount} failed. Total time: ${totalTime.toFixed(1)}s.`);

        goToHomePage();
    };

    const handleDownload = () => { alert('Download triggered'); };
    
    // ASYNC HANDLER: Uploads the file and handles the response
    const handleFileChange = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // 1. Prepare Form Data (must be FormData for file uploads)
        const formData = new FormData();
        formData.append('file', file);
        
        // NOTE: If you wanted to send the assessment metadata, you would add it here:
        // formData.append('course', assessmentMetadata.course);
        // formData.append('year', assessmentMetadata.year);
        // etc.

        setIsUploading(true);
        console.log(`Attempting to upload file: ${file.name}`);

        try {
            const response = await fetch(`${BASE_API_URL}/api/upload_file`, {
                method: 'POST',
                // IMPORTANT: Do NOT set 'Content-Type': 'multipart/form-data'. 
                // The browser sets the boundary automatically.
                body: formData,
            });

            const data = await response.json();
            // 🔹 DEBUG: Log the full response from the API
            console.log("Upload API response:", data);

            if (response.ok && data.saved) {
                const fileId = data.file?.file_id || data.file_id || 'N/A';
                console.log(`File pipeline successful. File ID: ${fileId}`);

                // 2. Accept the created questions and pre-fill the form
                const newQuestions = data.newly_inserted_questions;

                if (newQuestions && newQuestions.length > 0) {
                    // Update state with the new questions from the pipeline
                    setQuestions(prevQuestions => [...prevQuestions, ...newQuestions]);
                    
                    // Set the first new question as active
                    setActiveQuestionId(newQuestions[0].id);

                    alert(`Successfully imported ${newQuestions.length} questions from ${file.name}.`);
                } else {
                    alert(`Upload successful, but no questions were extracted from ${file.name}.`);
                }

            } else {
                console.error("File upload API error:", data);
                alert(`Upload Failed. Error: ${data.error || data.message || 'Unknown API error'}`);
            }
        } catch (error) {
            console.error("Network or Fetch Error:", error);
            alert(`A network error occurred during upload: ${error.message}`);
        } finally {
            setIsUploading(false);
            // Clear the file input value to allow the user to select the same file again
            e.target.value = null;
        }
    };

    // HANDLER: This function only executes the log and opens the file explorer.
    const handleUploadButtonClick = () => {
        // 1. Print the required console message (prints only once now)
        console.log("you are on the EditPage");
        
        // 2. Programmatically click the hidden file input to open the explorer window once.
        document.getElementById('edit-page-file-upload-input').click();
    };


    return (
        <>
            <CssBaseline />
            <Container maxWidth={false} disableGutters sx={{ p:0, m:0, position:'relative' }}>
                <Grid container>
                    {/* === Sidebar === */}
                    <Box sx={{
                        position:'absolute',
                        top:-31,
                        left:-24,
                        zIndex:100,
                        width:SIDEBAR_WIDTH_MD,
                        height:`calc(100% - ${SIDEBAR_BOTTOM_OFFSET_PX}px)`,
                        bgcolor:'#F5F5F5', border:'1px solid #9E9E9E',
                        overflowY:'auto', p:2, display:'flex', flexDirection:'column', gap:2
                    }}>
                        <Box sx={{ flexGrow:1 }}>
                            <QuestionStepper
                                questions={filteredQuestions}
                                activeQuestion={activeQuestionId}
                                setActiveQuestion={setActiveQuestionId}
                                onAddQuestion={handleAddQuestion}
                            />
                        </Box>
                        <Box sx={{ textAlign:'center' }}>
                            <Button 
                                variant="contained" 
                                onClick={handleUploadButtonClick} // Triggers log and file explorer
                                disabled={isUploading}
                                sx={{ backgroundColor:ORANGE_COLOR, color:WHITE_COLOR }}>
                                {isUploading ? 'Processing File...' : 'Upload File'}
                                {/* Hidden File Input Element: Wired to the async handleFileChange */}
                                <input
                                    id="edit-page-file-upload-input" 
                                    type="file" 
                                    hidden 
                                    onChange={handleFileChange} // API call and state update happens here
                                />
                            </Button>
                        </Box>
                    </Box>
                    {/* === Main content (right side) === */}
                    <Grid
                        item
                        xs={12}
                        sx={{
                            ml:`calc(${SIDEBAR_WIDTH_MD}px - ${HORIZONTAL_GAP_FIX}px)`,
                            px:3,
                            maxHeight: SIDEBAR_HEIGHT_CALC,
                        }}
                    >
                        <Grid container direction="column" rowSpacing={0}>
                            {/* --- ROW 1: TOOLBAR (CreateToolbar) --- */}
                            <Grid item sx={{
                                pt:0.5,
                                maxWidth:FORM_GRID_WIDTH,
                                pb: 0.5,
                            }}>
                                <CreateToolbar
                                    onSave={handleSaveAll}
                                    onCancel={goToHomePage}
                                    onDownload={handleDownload}
                                    saveText={"Save Changes"}
                                    saveDisabled={!isModified}
                                    isEditMode={true}
                                />
                            </Grid>
                            <Grid item sx={{ maxWidth:FORM_GRID_WIDTH }}>
                                <Box sx={{ mt:0, mb:1, pl:DIVIDER_LEFT_PADDING }}>
                                    <Divider sx={{ width:DIVIDER_WIDTH_PERCENT, borderColor:'#B8B8B8' }}/>
                                </Box>
                            </Grid>
                            {/* --- ROW 2: FILTER TOOLBAR (CreateFilterToolbar) --- */}
                            <Grid item sx={{ maxWidth:FORM_GRID_WIDTH, mb: 0.5 }}>
                                <CreateFilterToolbar
                                    ref={filterToolbarRef} // Added ref here
                                    selectedQuestions={questions} // Pass the state being edited
                                    isEditMode={true}
                                    isGroupedAssessment={isGroupedAssessment}
                                    assessmentMetadata={assessmentMetadata}
                                    onToggleGroupedAssessment={setIsGroupedAssessment}
                                    onAssessmentMetadataChange={handleAssessmentMetadataChange}
                                />
                            </Grid>

                            {/* --- ROW 3: EDIT QUESTION FORMS CONTAINER (SCROLLABLE) --- */}
                            <Grid item sx={{ maxWidth:FORM_GRID_WIDTH }}>
                                <Box
                                    ref={formsScrollContainerRef}
                                    sx={{
                                        maxHeight: SCROLLABLE_FORMS_HEIGHT,
                                        overflowY: 'auto',
                                        pr: 10,
                                        ml: FORM_HORIZONTAL_MARGIN,
                                        mr: 0,
                                    }}
                                >
                                    <Box sx={{ display:'flex', flexDirection:'column' }}>
                                        {filteredQuestions.map((q) => (
                                            <Box
                                                key={q.id}
                                                ref={el => { questionRefs.current[q.id] = el; }}
                                                sx={{
                                                    // Dynamic styling
                                                    maxWidth: q.id === activeQuestionId ? `calc(${FORM_GRID_WIDTH} + ${ACTIVE_FORM_WIDTH_INCREASE})` : FORM_GRID_WIDTH,
                                                    border: q.id === activeQuestionId ? '2px solid #F57F17' : 'none',
                                                    borderRadius: '8px',
                                                    p: q.id === activeQuestionId ? '5px 10px 5px 5px' : 0,
                                                    mb: 3,
                                                    boxShadow: q.id === activeQuestionId ? '0px 0px 5px rgba(0, 0, 0, 0.2)' : '0px 2px 4px rgba(0, 0, 0, 0.05)',
                                                    backgroundColor: q.id === activeQuestionId ? '#FFF3E0' : WHITE_COLOR,
                                                }}
                                            >
                                                <EditQuestionForm
                                                    questionNumber={questions.findIndex(x => x.id === q.id) + 1}
                                                    question={q}
                                                    onQuestionChange={handleQuestionChange}
                                                    onDelete={() => handleDeleteQuestion(q)}
                                                    conceptTags={allConceptTags}
                                                />
                                            </Box>
                                        ))}
                                        {/* ... (Empty state messages) ... */}
                                    </Box>
                                </Box>
                            </Grid>
                        </Grid>
                    </Grid>
                </Grid>
            </Container>
        </>
    );
}
export default EditPage;
