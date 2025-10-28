import React, { useState, useEffect, useRef } from 'react'; 
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
function EditPage({ selectedQuestions, goToHomePage, headerHeight, footerHeight }) {
    // --- Constants ---
    const SIDEBAR_WIDTH_MD = 300; 
    const ORANGE_COLOR = '#F57F17'; 
    const WHITE_COLOR = '#FFFFFF'; 
    const TOOLBAR_GRID_WIDTH = '1200px'; 
    
    // FIX 2: Increased width for EditQuestionForm to prevent cutoff
    const FORM_GRID_WIDTH = '1100px'; 
    
    // 🎯 NEW CONSTANT: Controllable space on the left/right of the EditQuestionForm content
    const FORM_HORIZONTAL_MARGIN = 6; // MUI spacing unit (6*8=48px)
    
    // 🎯 NEW CONSTANT: Fixed 5px padding for top/bottom/left when active
    const FORM_ACTIVE_PADDING_TB_L = '5px'; 
    
    // 🎯 NEW CONSTANT: Fixed 10px padding for right when active
    const FORM_ACTIVE_PADDING_R = '10px'; 
    // 🎯 NEW CONSTANT: Fixed 10px width increase for the active form box
    const ACTIVE_FORM_WIDTH_INCREASE = '10px';
    const DIVIDER_LEFT_PADDING = '48px';
    const DIVIDER_WIDTH_PERCENT = '100%';  
    const MAIN_CONTAINER_BOTTOM_MARGIN_PX = 32; 
    const SIDEBAR_HEIGHT_CALC = `calc(100vh - ${headerHeight}px - ${footerHeight}px - ${MAIN_CONTAINER_BOTTOM_MARGIN_PX}px)`;
    
    // --- Layout Adjustments for Scrolling ---
    const TOOLBAR_AREA_HEIGHT_PX = 200; 
    const SCROLLABLE_FORMS_HEIGHT = `calc(${SIDEBAR_HEIGHT_CALC} - ${TOOLBAR_AREA_HEIGHT_PX}px)`;
    
    // Negative margin fix (left as is from previous iteration)
    const HORIZONTAL_GAP_FIX = 24; 

    // --- State ---
    const [questions, setQuestions] = useState([]);
    const [activeQuestionId, setActiveQuestionId] = useState(null);
    const [activeFilters, setActiveFilters] = useState([]); 
    // --- Refs ---
    const questionRefs = useRef({}); 
    const formsScrollContainerRef = useRef(null);

    // --- Effects ---
    // Initialization from prop
    useEffect(() => {
        if (selectedQuestions && selectedQuestions.length > 0) {
            setQuestions(selectedQuestions);
            setActiveQuestionId(selectedQuestions[0].id);
        } else {
            setQuestions([]);
            setActiveQuestionId(null);
        }
    }, [selectedQuestions]);
    // Scroll to active question
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
    // --- Handlers & Logic (unchanged) ---
    const handleQuestionChange = (id, key, value) => {
        setQuestions(prev =>
            prev.map(q => q.id === id ? { ...q, [key]: value } : q)
        );
    };
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
        return questions.filter(question => activeFilters.includes(question.type));
    };
    const filteredQuestions = getFilteredQuestions();
    useEffect(() => {
        if (activeQuestionId && !filteredQuestions.some(q => q.id === activeQuestionId)) {
            setActiveQuestionId(filteredQuestions.length > 0 ? filteredQuestions[0].id : null);
        }
    }, [activeFilters, activeQuestionId, filteredQuestions]);
    const handleSaveAll = () => { alert('All changes saved'); };
    const handleDownload = () => { alert('Download triggered'); };
    const handleFileUpload = e => console.log("File:", e.target.files?.[0]?.name);
    return (
        <>
            <CssBaseline />
            <Container maxWidth={false} sx={{ p:0, m:0, position:'relative' }}>
                <Grid container>
                    {/* === Sidebar === */}
                    <Box sx={{ 
                        position:'absolute', top:-32, left:-24, zIndex:100,
                        width:SIDEBAR_WIDTH_MD, height:SIDEBAR_HEIGHT_CALC, 
                        bgcolor:'#F5F5F5', border:'1px solid #9E9E9E', 
                        overflowY:'auto', p:2, display:'flex', flexDirection:'column', gap:2 
                    }}>
                        <Box sx={{ flexGrow:1 }}>
                            <QuestionStepper 
                                questions={filteredQuestions}
                                activeQuestion={activeQuestionId}
                                setActiveQuestion={setActiveQuestionId}
                            />
                        </Box>
                        <Box sx={{ textAlign:'center' }}>
                            <Button variant="contained" component="label"
                                onClick={() => document.getElementById('file-upload-input').click()}
                                sx={{ backgroundColor:ORANGE_COLOR, color:WHITE_COLOR }}>
                                Upload File
                                <input id="file-upload-input" type="file" hidden onChange={handleFileUpload}/>
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
                            {/* 🎯 CHANGE 1: Reduced padding-top and padding-bottom for smaller vertical gap */}
                            <Grid item sx={{ 
                                pt:0.5, // Reduced from 1
                                maxWidth:FORM_GRID_WIDTH,
                                pb: 0.5, // Reduced from 1
                            }}>
                                <CreateToolbar onSave={handleSaveAll} onCancel={goToHomePage} onDownload={handleDownload}/>
                            </Grid>
                            {/* --- DIVIDER --- */}
                            <Grid item sx={{ maxWidth:FORM_GRID_WIDTH }}>
                                <Box sx={{ mt:0, mb:1, pl:DIVIDER_LEFT_PADDING }}>
                                    <Divider sx={{ width:DIVIDER_WIDTH_PERCENT, borderColor:'#B8B8B8' }}/>
                                </Box>
                            </Grid>
                            {/* --- ROW 2: FILTER TOOLBAR (CreateFilterToolbar) --- */}
                            {/* 🎯 CHANGE 2: Reduced margin-bottom (mb) for smaller vertical gap with forms */}
                            <Grid item sx={{ maxWidth:FORM_GRID_WIDTH, mb: 0.5 }}> {/* Reduced from mb: 2 */}
                                <CreateFilterToolbar 
                                    allQuestions={questions}
                                    activeFilters={activeFilters}
                                    onFilterToggle={handleFilterToggle}
                                />
                            </Grid>
                            {/* --- ROW 3: EDIT QUESTION FORMS CONTAINER (SCROLLABLE) --- */}
                            <Grid item sx={{ maxWidth:FORM_GRID_WIDTH }}>
                                <Box
                                    ref={formsScrollContainerRef}
                                    sx={{
                                        maxHeight: SCROLLABLE_FORMS_HEIGHT,
                                        overflowY: 'auto',
                                        pr: 10, // Space for the scrollbar inside the container
                                        ml: FORM_HORIZONTAL_MARGIN, // Controllable left gap
                                        mr: 0, // Controllable right gap
                                    }}
                                >
                                    {/* 🎯 CHANGE 3: Removed top padding from the forms container Box (pt: 1 removed) */}
                                    <Box sx={{ display:'flex', flexDirection:'column' }}> 
                                        {/* 🎯 Render ALL filtered questions inside the scrollable container */}
                                        {filteredQuestions.map(q => (
                                            <Box
                                                ref={el => { questionRefs.current[q.id] = el; }}
                                                key={q.id}
                                                sx={{ 
                                                    // 🎯 Width increase (10px wider for active)
                                                    maxWidth: q.id === activeQuestionId 
                                                        ? `calc(${FORM_GRID_WIDTH} + ${ACTIVE_FORM_WIDTH_INCREASE})` 
                                                        : FORM_GRID_WIDTH,
                                                    
                                                    border: q.id === activeQuestionId ? '2px solid #F57F17' : 'none',
                                                    borderRadius: '8px',
                                                    
                                                    // 🎯 Custom padding: 5px top/bottom/left, 10px right
                                                    p: q.id === activeQuestionId 
                                                        ? `${FORM_ACTIVE_PADDING_TB_L} ${FORM_ACTIVE_PADDING_R} ${FORM_ACTIVE_PADDING_TB_L} ${FORM_ACTIVE_PADDING_TB_L}`
                                                        : 0, // Use 0 padding when inactive
                                                        
                                                    mb: 3, 
                                                    boxShadow: q.id === activeQuestionId ? '0px 0px 5px rgba(0, 0, 0, 0.2)' : '0px 2px 4px rgba(0, 0, 0, 0.05)',
                                                    backgroundColor: q.id === activeQuestionId ? '#FFF3E0' : WHITE_COLOR, 
                                                }}
                                            >
                                                <EditQuestionForm
                                                    questionNumber={questions.findIndex(x => x.id === q.id) + 1}
                                                    question={q}
                                                    onQuestionChange={handleQuestionChange}
                                                />
                                            </Box>
                                        ))}
                                        {/* 🌟 Empty State Messages */}
                                        {questions.length > 0 && filteredQuestions.length === 0 && (
                                            <Typography variant="h6" color="text.secondary" sx={{ p: 2 }}>
                                                No questions match the current filter selection.
                                            </Typography>
                                        )}
                                        {questions.length === 0 && (
                                            <Typography variant="h6" color="text.secondary" sx={{ p: 2 }}>
                                                No questions have been selected for editing.
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
export default EditPage;
