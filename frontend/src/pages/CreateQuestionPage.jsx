// src/pages/CreateQuestionPage.jsx
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

const BASE_API_URL = import.meta.env.VITE_APP_API_URL || '/api';

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

const cleanValue = (value) => (value === '' || value === undefined ? null : value);

// 🔑 MODIFICATION 1: Accept the new navigation/data transfer prop
function CreateQuestionPage({ goToHomePage, headerHeight = 0, footerHeight = 0, onNavigateToEdit }) {
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
    const TOOLBAR_AREA_HEIGHT_PX = 250;
    const SCROLLABLE_FORMS_HEIGHT = `calc(${SIDEBAR_HEIGHT_CALC} - ${TOOLBAR_AREA_HEIGHT_PX}px)`;
    const HORIZONTAL_GAP_FIX = 24;

    const [questions, setQuestions] = useState([]);
    const [activeQuestionId, setActiveQuestionId] = useState(null);
    const [activeFilters, setActiveFilters] = useState([]);
    const [isGroupedAssessment, setIsGroupedAssessment] = useState(false);
    const [assessmentMetadata, setAssessmentMetadata] = useState({
        assessment_type: '',
        year: '',
        semester: '',
        course: '',
    });

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

    const isModified = useMemo(() =>
        questions.some(q => q.question_stem && q.question_stem.trim() !== '')
    , [questions]);

    useEffect(() => {
        if (questions.length === 0) {
            const initialQuestion = createNewQuestion(1);
            setQuestions([initialQuestion]);
            setActiveQuestionId(initialQuestion.id);
        }
    }, [questions.length]);

    useEffect(() => {
        setQuestions(prevQuestions => prevQuestions.map(q => ({
            ...q,
            assessment_type: assessmentMetadata.assessment_type,
            year: assessmentMetadata.year,
            semester: assessmentMetadata.semester,
            course: assessmentMetadata.course,
        })));
    }, [assessmentMetadata, questions.length]);

    useEffect(() => {
        if (activeQuestionId && questionRefs.current[activeQuestionId]) {
            questionRefs.current[activeQuestionId].scrollIntoView({
                behavior: 'smooth',
                block: 'start',
                inline: 'nearest'
            });
        }
    }, [activeQuestionId]);

    const handleToggleGroupedAssessment = useCallback((isGrouped) => {
        setIsGroupedAssessment(isGrouped);
    }, []);

    const handleAssessmentMetadataChange = useCallback((key, value) => {
        setAssessmentMetadata(prev => ({
            ...prev,
            [key]: value
        }));
    }, []);

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

    const handleQuestionChange = (id, key, value) => {
        setQuestions(prev =>
            prev.map(q => q.id === id ? { ...q, [key]: value } : q)
        );
    };

    // ✅ MODIFIED: Removed the unnecessary window.confirm for unsaved local data
    const handleDeleteQuestion = useCallback((idToDelete) => {
        // No confirmation needed for unsaved questions in a Create workflow
        
        setQuestions(prevQuestions => {
            // 1. Filter out the deleted question
            const remainingQuestions = prevQuestions.filter(q => q.id !== idToDelete);

            // 2. Update active question ID if the deleted one was active
            setActiveQuestionId(prevActive => {
                if (prevActive === idToDelete) {
                    // Set active to the next question, or the first one, or null if empty
                    const deletedIndex = prevQuestions.findIndex(q => q.id === idToDelete);
                    if (remainingQuestions.length === 0) return null;
                    
                    // Try to set the new active ID to the question immediately following the deleted one, 
                    // or the last remaining one if the deleted one was the last.
                    const nextActiveIndex = Math.min(deletedIndex, remainingQuestions.length - 1);
                    return remainingQuestions[nextActiveIndex].id;
                }
                return prevActive;
            });
            
            return remainingQuestions;
        });
    }, [questions]); // Dependency on 'questions' is required for finding the deleted index and next active ID
    
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
        if (activeFilters.length === 0) return questions;
        return questions.filter(question => activeFilters.includes(question.question_type || ''));
    };
    const filteredQuestions = getFilteredQuestions();
    
    useEffect(() => {
        if (activeQuestionId && !filteredQuestions.some(q => q.id === activeQuestionId)) {
            setActiveQuestionId(filteredQuestions.length > 0 ? filteredQuestions[0].id : null);
        }
    }, [activeFilters, activeQuestionId, filteredQuestions]);
    
    const handlePublishAndSave = async () => { 
        if (!isModified) {
             alert('No questions have been modified or created.');
             return;
        }

        const questionsToProcess = questions; 
        const latestMetadata = filterToolbarRef.current?.getModifiedFilters() || {};
        
        for (const q of questionsToProcess) {
            if (!cleanValue(q.question_stem)) {
                 alert(`Error: Question ${q.id} is missing its question stem. Please fill it out.`);
                 return;
            }
        }
        
        const publishStartTime = Date.now();
        const publishResults = [];
        let successCount = 0;
        
        for (const q of questionsToProcess) {
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
                const response = await fetch(`${BASE_API_URL}/api/createquestion`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                });
                
                const data = await response.json();
                
                if (response.ok && data.status === 'created') {
                    successCount++;
                    publishResults.push({ id: q.id, status: 'success', new_id: data.question_id });
                } else {
                    publishResults.push({ 
                        id: q.id, 
                        status: 'failed', 
                        error: data.error || data.message || `HTTP Status ${response.status}`,
                        details: data
                    });
                }
                
            } catch (error) {
                publishResults.push({ id: q.id, status: 'network_failed', error: error.message });
            }
        }
        
        const failedCount = questionsToProcess.length - successCount;
        const totalTime = (Date.now() - publishStartTime) / 1000;

        alert(`Publish complete! ${successCount} successful, ${failedCount} failed. Total time: ${totalTime.toFixed(1)}s.`);
        goToHomePage();
    };
    
    const handleDownload = () => { alert('Download triggered'); };
    
    // 💥 MODIFICATION 2: This handler performs the navigation and data transfer
    const handleFileUpload = () => {
        // 1. Log the required message (from the previous request)
        
        // 2. Transfer the current questions array (questions state) and navigate
        if (typeof onNavigateToEdit === 'function') {
            onNavigateToEdit(questions);
        } else {
            console.error("Navigation handler 'onNavigateToEdit' is missing or not a function.");
        }
        // Note: We deliberately don't return anything or use a file event 'e'
    };

    return (
        <>
            <CssBaseline /> 
            <Container maxWidth={false} disableGutters sx={{ p:0, m:0, position:'relative' }}>
                <Grid container>
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
                                questions={questions} 
                                activeQuestion={activeQuestionId}
                                setActiveQuestion={setActiveQuestionId}
                                onAddQuestion={handleAddQuestion}
                            />
                        </Box>
                        <Box sx={{ textAlign:'center' }}>
                            {/* 💥 MODIFICATION 3: Button now directly calls the modified handler 
                                and the file input logic has been removed. */}
                            <Button variant="contained" component="label"
                                onClick={handleFileUpload} // Calls the new transfer/navigate function
                                sx={{ backgroundColor:ORANGE_COLOR, color:WHITE_COLOR }}>
                                Upload File
                                {/* REMOVED: <input id="file-upload-input" type="file" hidden onChange={handleFileUpload}/> */}
                            </Button>
                        </Box>
                    </Box>
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
                            <Grid item sx={{ pt:0.5, maxWidth:FORM_GRID_WIDTH, pb:0.5 }}>
                                <CreateToolbar 
                                    onSave={handlePublishAndSave} 
                                    onCancel={goToHomePage} 
                                    onDownload={handleDownload} 
                                    saveText="Publish"
                                    saveDisabled={!isModified}
                                    isEditMode={false}
                                />
                            </Grid>
                            <Grid item sx={{ maxWidth:FORM_GRID_WIDTH }}>
                                <Box sx={{ mt:0, mb:1, pl:DIVIDER_LEFT_PADDING }}>
                                    <Divider sx={{ width:DIVIDER_WIDTH_PERCENT, borderColor:'#B8B8B8' }}/>
                                </Box>
                            </Grid>
                            <Grid item sx={{ maxWidth:FORM_GRID_WIDTH, mb: 0.5 }}> 
                                <CreateFilterToolbar 
                                    ref={filterToolbarRef} 
                                    allQuestions={questions}
                                    activeFilters={activeFilters}
                                    onFilterToggle={handleFilterToggle}
                                    isGroupedAssessment={isGroupedAssessment}
                                    assessmentMetadata={assessmentMetadata}
                                    onToggleGroupedAssessment={handleToggleGroupedAssessment}
                                    onAssessmentMetadataChange={handleAssessmentMetadataChange}
                                />
                            </Grid>
                            <Grid item sx={{ maxWidth:FORM_GRID_WIDTH, flexGrow: 1 }}>
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
                                                    maxWidth: q.id === activeQuestionId 
                                                        ? `calc(${FORM_GRID_WIDTH} + ${ACTIVE_FORM_WIDTH_INCREASE})` 
                                                        : FORM_GRID_WIDTH,
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
                                                    onDelete={handleDeleteQuestion}  
                                                    conceptTags={allConceptTags}
                                                    isGroupedAssessment={isGroupedAssessment} 
                                                />
                                            </Box>
                                        ))}
                                        {questions.length > 0 && filteredQuestions.length === 0 && (
                                            <Typography variant="h6" color="text.secondary" sx={{ p: 2 }}>
                                                No questions match the current filter selection.
                                            </Typography>
                                        )}
                                        {questions.length === 0 && (
                                            <Typography variant="h6" color="text.secondary" sx={{ p: 2 }}>
                                                Please use the "Add New Question" button to start creating.
                                            </Typography>
                                        )}
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

export default CreateQuestionPage;