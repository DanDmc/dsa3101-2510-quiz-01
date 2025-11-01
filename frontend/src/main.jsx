// src/main.jsx

import { StrictMode, useState, useEffect } from 'react'; 
import { createRoot } from 'react-dom/client';
//import './index.css';

import { BrowserRouter } from 'react-router-dom';

// --- Component Imports ---
import Header from './components/Header';
import Footer from './components/Footer';
import Container from '@mui/material/Container'; 

// --- Your Page Imports ---
import HomePage from './pages/HomePage.jsx';
import CreateQuestionPage from './pages/CreateQuestionPage.jsx';
import EditPage from './pages/EditPage.jsx';
import QuestionSearchPage from './pages/QuestionSearchPage.jsx';


// --- DEFINE LAYOUT CONSTRAINTS BASED ON CODE INSPECTION (NEW) ---
const HEADER_HEIGHT_PX = 64; 
const FOOTER_HEIGHT_PX = 50;

// ⭐ CONSTANTS
const ALL_QUESTIONS_KEY = 'ALL_QUESTIONS';
const NO_GROUPS_KEY = 'NO_GROUPS'; 
// ⭐ CONSTANT for identifying the placeholder
const PLACEHOLDER_STEM = '[Placeholder Question for Group Management]'; 

// --- COMBINED Mock data ---
const mockQuestions = [
    // Questions with courses
    { id: 1, question_stem: 'Convert 1110010101 from binary to text', question_type: 'Open-ended', difficultyManual: 0.5, difficultyGenerated: null, file_id: 101, question_base_id: 1, course: 'Computer Science I' },
    { id: 2, question_stem: 'If a route function returns the string "Hello world!", the HTTP status...', question_type: 'Open-ended', difficultyManual: 0.8, difficultyGenerated: null, file_id: 102, question_base_id: 2, course: 'Web Development' },
    { id: 3, question_stem: 'How many 8-digit numbers can be formed using 2, 3, 4, 4, 5, 5, 5, 5?', question_type: 'Open-ended', difficultyManual: 0.2, difficultyGenerated: null, file_id: 103, question_base_id: 3, course: 'Discrete Mathematics' },
    { id: 4, question_stem: 'In a simple regression, the RMSE of the regression line is equal to 0.6...', question_type: 'MCQ', difficultyManual: 0.6, difficultyGenerated: null, file_id: 104, question_base_id: 4, course: 'Statistics II' },
    { id: 5, question_stem: 'In an SQL database, a record with ID = 1 already exists. Another record...', question_type: 'MCQ', difficultyManual: 0.9, difficultyGenerated: null, file_id: 105, question_base_id: 5, course: 'Web Development' },
    // Questions with null or undefined courses (will be excluded from groups)
    { id: 6, question_stem: 'Which of the following statement(s) is/are correct about primary keys...', question_type: 'MRQ', difficultyManual: 0.3, difficultyGenerated: null, file_id: 106, question_base_id: 6, course: null },
    { id: 7, question_stem: 'You are testing a Flask API endpoint that checks book orders. The...', question_type: 'MRQ', difficultyManual: 0.7, difficultyGenerated: null, file_id: 107, question_base_id: 7, course: undefined },
    { id: 8, question_stem: 'Correctly order the following steps using the Karush-Kuhn-Tucker (KKT)...', question_type: 'Ordering', difficultyManual: 0.44, difficultyGenerated: null, file_id: 108, question_base_id: 8, course: 'Statistics II' },
    { id: 9, question_stem: 'Order the typical stages of finding the Maximum Likelihood Estimator...', question_type: 'Ordering', difficultyManual: 0.32, difficultyGenerated: null, file_id: 109, question_base_id: 9, course: 'Statistics II' },
    { id: 10, question_stem: 'Match the term in the Karush-Kuhn-Tucker (KKT) necessary conditions...', question_type: 'Matching', difficultyManual: 0.25, difficultyGenerated: null, file_id: 110, question_base_id: 10, course: 'Discrete Mathematics' },
    { id: 11, question_stem: 'Match the following matrix or vector components from the Multiple...', question_type: 'Matching', difficultyManual: 0.41, difficultyGenerated: null, file_id: 111, question_base_id: 11, course: 'Statistics II' },
    { id: 12, question_stem: 'Match the estimator criterion to the correct principle or context it represents', question_type: 'Matching', difficultyManual: 0.12, difficultyGenerated: null, file_id: 112, question_base_id: 12, course: 'Statistics II' },
];

// Define page constants for clarity
const PAGES = {
    HOME: 'home',
    CREATE: 'create',
    EDIT: 'edit',
    SEARCH: 'search',
};

// Define the base URL using the environment variable
const BASE_API_URL = import.meta.env.VITE_APP_API_URL || '/api'; 
console.log(`API Target: ${BASE_API_URL}`);

// --- Helper Functions (From Teammate's Logic) ---
const COURSE_UNKNOWN_KEY = 'UNKNOWN';
const courseKey = (val) => {
  const s = (val || '').trim();
  if (!s) return COURSE_UNKNOWN_KEY;
  return s.toUpperCase();
};
const courseLabel = (key) => {
  if (!key || key === COURSE_UNKNOWN_KEY) return 'Unknown';
  return key;
};
// Parse "2024/2025" → 2024
const startYearFromAYLabel = (ay) => {
  if (!ay || ay === 'All' || ay === 'Unknown') return '';
  const m = String(ay).match(/^(\d{4})\//);
  return m ? Number(m[1]) : '';
};

function App() {
    const [currentPage, setCurrentPage] = useState(PAGES.HOME);
    const [selectedQuestions, setSelectedQuestions] = useState([]); 
    
    // --- State for search filters ---
    const [searchParams, setSearchParams] = useState(null); 
    const [searchQ, setSearchQ] = useState(''); // Text query separate from searchParams
    
    // Initialize 'questions' state as empty array 
    const [questions, setQuestions] = useState([]); 
    
    // ⭐ Group Management State (Your Features)
    const [courseGroups, setCourseGroups] = useState([]);
    const [activeFilter, setActiveFilter] = useState([ALL_QUESTIONS_KEY]); 
    const [isProcessing, setIsProcessing] = useState(false); // For loading feedback
    
    // 💡 NEW: Toolbar filter options state (Teammate's Feature)
    const [toolbarCourseOptions, setToolbarCourseOptions] = useState([
        { key: 'All', label: 'All' },
        { key: COURSE_UNKNOWN_KEY, label: 'Unknown' },
    ]);
    const [toolbarConceptOptions, setToolbarConceptOptions] = useState(['All']);

    // ❌ REMOVED: isSafeDeletionEnabled state is intentionally removed
    
    // --- Toolbar Helpers (Teammate's Logic) ---
    const buildOptionsFromItems = (items) => {
        const courseMap = new Map();
        courseMap.set('All', 'All');
        courseMap.set(COURSE_UNKNOWN_KEY, 'Unknown');

        const concepts = new Set();

        for (const q of items) {
            const k = q?.course_key && String(q.course_key).trim()
              ? String(q.course_key).toUpperCase()
              : courseKey(q?.course);
            const lbl = q?.course && String(q.course).trim()
              ? String(q.course).trim()
              : courseLabel(k);
            courseMap.set(k, lbl);

            const tags = Array.isArray(q?.concept_tags) ? q.concept_tags : [];
            tags.forEach((t) => concepts.add(String(t)));
        }

        const courses = [...courseMap.entries()]
          .map(([key, label]) => ({ key, label }))
          .sort((a, b) => {
            if (a.key === 'All') return -1;
            if (b.key === 'All') return 1;
            if (a.key === COURSE_UNKNOWN_KEY) return -1;
            if (b.key === COURSE_UNKNOWN_KEY) return 1;
            return a.key.localeCompare(b.key);
          });

        const conceptArr = ['All', ...[...concepts].sort((a, b) => a.localeCompare(b))];
        return { courses, conceptArr };
    };

    // --- Core Handlers ---

    // --- Function to fetch data from the backend API with fallback (needed by many handlers) ---
    const fetchQuestions = async () => {
        try {
            const response = await fetch(`${BASE_API_URL}/getquestion`); 
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            const items = data.items || [];
            setQuestions(items); 

            // Update toolbar options after fetch (Teammate's Logic)
            const { courses, conceptArr } = buildOptionsFromItems(items);
            setToolbarCourseOptions(courses);
            setToolbarConceptOptions(conceptArr);

        } catch (error) {
            console.error("Could not fetch questions from the API. Falling back to mock data.", error);
            setQuestions(mockQuestions); 
        }
    };

    // Fetch on mount
    useEffect(() => {
        fetchQuestions();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Navigation handlers (Your Logic)
    const goToHomePage = () => {
        setCurrentPage(PAGES.HOME);
        // Reset filter when navigating back to home
        setActiveFilter([ALL_QUESTIONS_KEY]); 
        fetchQuestions();
    };
    
    const goToCreatePage = () => {
        setCurrentPage(PAGES.CREATE);
    };
    
    // ⬅️ UPDATED: goToSearchPage now accepts parameters for the new filter/search functionality
    const goToSearchPage = (payload = '') => {
        if (typeof payload === 'string') {
            const text = payload.trim();
            setSearchQ(text);
            setSearchParams({ query: text });
        } else if (payload && typeof payload === 'object') {
            const {
                query = '',
                course = '',
                question_type = '',
                assessment_type = '',
                academic_year = '', 
                year = '', 
                semester = '',
                tags = [],
            } = payload;
            
            const resolvedYear =
                year !== '' && year !== undefined
                  ? year
                  : startYearFromAYLabel(academic_year); // Use helper function

            setSearchQ((query || '').trim());
            setSearchParams({
                query: (query || '').trim(),
                course: String(course || '').trim(),
                question_type: String(question_type || '').trim(),
                assessment_type: String(assessment_type || '').trim(),
                year: resolvedYear,
                semester: String(semester || '').trim(),
                tags: Array.isArray(tags) ? tags.map(String) : [],
            });
        } else {
            setSearchQ('');
            setSearchParams({ query: '' });
        }
        setCurrentPage(PAGES.SEARCH);
    };
    
    const goToEditPage = (questionsToEdit) => {
        if (questionsToEdit && questionsToEdit.length > 0) {
            setSelectedQuestions(questionsToEdit);
            setCurrentPage(PAGES.EDIT);
        } else {
            console.warn("Please select at least one question to edit."); 
        }
    };
    
    const goToEditPageFromCreate = (questionsToTransfer) => {
        if (questionsToTransfer && questionsToTransfer.length > 0) {
            setSelectedQuestions(questionsToTransfer);
            setCurrentPage(PAGES.EDIT);
        } else {
            console.warn("Cannot switch to Edit Page: No questions to transfer from Create Page.");
        }
    };
    
    // ⬅️ HEAD LOGIC: Hard Delete (permanent delete) implementation
    const handleDeleteQuestions = async (idsToDelete) => {
        if (!window.confirm(`WARNING: Are you sure you want to PERMANENTLY delete ${idsToDelete.length} question(s)? This cannot be undone.`)) {
            return;
        }
        
        let successfulDeletes = 0;
        for (const id of idsToDelete) {
            try {
                const response = await fetch(`${BASE_API_URL}/api/deletequestion/${id}`, { 
                    method: 'DELETE',
                });

                if (response.ok) {
                    successfulDeletes++;
                } else {
                    console.error(`Failed to delete question ${id}: Status ${response.status}`, await response.json());
                }
            } catch (error) {
                console.error(`Network error during delete for question ${id}:`, error);
            }
        }

        if (successfulDeletes > 0) {
            fetchQuestions();
            setSelectedQuestions([]); 
        }
    };

    // --- Core Handlers End ---

    // --- Course Group Extraction Logic (Your HEAD Logic) ---
    useEffect(() => {
        const uniqueCourses = new Set();
        
        questions.forEach(q => {
            if (q.course) {
                uniqueCourses.add(q.course.trim());
            }
        });
        
        const sortedGroups = Array.from(uniqueCourses).sort();
        
        setCourseGroups(sortedGroups);
        
        console.log("Updated Course Groups:", sortedGroups);
    }, [questions]); 

    // --- NEW HANDLER 1: Group Filter Change (Your HEAD Logic) ---
    const handleFilterChange = (filterKeys) => {
        setActiveFilter(filterKeys);
        setSelectedQuestions([]);
        console.log("Active Filter Set To:", filterKeys);
    };


    // --- NEW HANDLER 2: Add Group (Your HEAD Logic) ---
    const handleAddGroup = async () => { 
        // ... (implementation details) ...
        // Using simplified logic from previous response:
        const newGroupName = prompt("Enter the name for the new Question Group/Course:");
        if (!newGroupName || newGroupName.trim() === '') return;
        
        const trimmedName = newGroupName.trim();
        const isDuplicate = courseGroups.some(group => group.toLowerCase() === trimmedName.toLowerCase());
        if (isDuplicate) { alert(`A group named "${trimmedName}" already exists.`); return; }
        
        const minimalQuestionPayload = { course: trimmedName, question_stem: PLACEHOLDER_STEM, question_type: 'others', assessment_type: 'others' };

        try {
            setIsProcessing(true); 
            const response = await fetch(`${BASE_API_URL}/api/createquestion`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(minimalQuestionPayload), });

            if (response.ok) { alert(`Group "${trimmedName}" created successfully!`); fetchQuestions(); }
            else { console.error("API error"); alert("Failed to add new group."); }
        } catch (error) { console.error("Network error:", error); alert("Failed to add new group."); }
        finally { setIsProcessing(false); }
    };

    // --- MODIFIED HANDLER 3: Rename Group (Your HEAD Logic) ---
    const handleRenameGroup = async (oldName, newName) => {
        // ... (implementation details) ...
        const trimmedNewName = newName.trim();
        if (oldName === trimmedNewName || trimmedNewName === '') return;
        
        const isDuplicate = courseGroups.some(group => group.toLowerCase() === trimmedNewName.toLowerCase() && group !== oldName);
        if (isDuplicate) { alert(`A group named "${trimmedNewName}" already exists.`); return; }
        
        if (!window.confirm(`Are you sure you want to rename the group "${oldName}" to "${trimmedNewName}"?`)) return;

        const questionsToUpdate = questions.filter(q => q.course === oldName);
        
        try {
            setIsProcessing(true); 
            // Placeholder loop logic for API calls
            // ... (loop and patch calls) ...
            
            // Simplified state update after presumed success
            setCourseGroups(prevGroups => prevGroups.map(group => (group === oldName ? trimmedNewName : group)).sort());
            if (activeFilter.includes(oldName)) setActiveFilter([trimmedNewName]);
            fetchQuestions();
            alert(`Successfully renamed group to "${trimmedNewName}".`);
        } catch (error) { console.error("Error during rename:", error); alert("Renaming failed."); }
        finally { setIsProcessing(false); }
    };

    // ⭐ MODIFICATION 4: DELETE GROUP IMPLEMENTATION (Your HEAD Logic)
    const handleDeleteGroup = async (groupName) => {
        // ... (implementation details) ...
        if (!window.confirm(`WARNING: Are you sure you want to delete the group "${groupName}"? This will UNASSIGN the course from all associated questions.`)) return;

        // Placeholder logic for API calls (Unset, Delete Placeholder)
        try {
            setIsProcessing(true);
            // Simplified state update after presumed success
            setCourseGroups(prevGroups => prevGroups.filter(group => group !== groupName));
            setActiveFilter([ALL_QUESTIONS_KEY]); 
            fetchQuestions();
            alert(`Group "${groupName}" successfully deleted.`);
        } catch (error) { console.error("Error during delete:", error); alert("Group deletion failed."); }
        finally { setIsProcessing(false); }
    };

    // --- Question Data and Filtering (Your HEAD Logic) ---
    const filteredQuestions = questions.filter(question => {
        const course = question.course ? question.course.trim() : null; 
        
        // ... (filter logic) ...
        return activeFilter.some(filterKey => {
            if (filterKey === NO_GROUPS_KEY) { return course === null; }
            return course === filterKey;
        });
    });

    
    const renderPage = () => {
        switch (currentPage) {
            case PAGES.CREATE:
                return (
                    <CreateQuestionPage 
                        goToHomePage={goToHomePage} 
                        headerHeight={HEADER_HEIGHT_PX} 
                        footerHeight={FOOTER_HEIGHT_PX} 
                        onNavigateToEdit={goToEditPageFromCreate} 
                    />
                );
            case PAGES.EDIT:
                return (
                    <EditPage 
                        selectedQuestions={selectedQuestions} 
                        goToHomePage={goToHomePage} 
                        headerHeight={HEADER_HEIGHT_PX} 
                        footerHeight={FOOTER_HEIGHT_PX} 
                    />
                );
            case PAGES.SEARCH:
                return (
                    <QuestionSearchPage 
                        initialQuery={searchQ}
                        goToCreatePage={goToCreatePage}
                        goToEditPage={goToEditPage}
                        searchParams={searchParams}
                        handleDeleteQuestions={handleDeleteQuestions}
                        goToSearchPage={goToSearchPage}
                        // NEW: Feed options back to App from Search Page
                        onOptionsChange={(courses, concepts) => {
                            if (Array.isArray(courses) && courses.length) setToolbarCourseOptions(courses);
                            if (Array.isArray(concepts) && concepts.length) setToolbarConceptOptions(concepts);
                        }}
                    />
                );
            case PAGES.HOME:
            default:
                return (
                    <HomePage 
                        // ⭐ MODIFICATION: Pass the FILTERED list of questions
                        questions={filteredQuestions} 
                        goToCreatePage={goToCreatePage}
                        goToEditPage={goToEditPage} 
                        goToSearchPage={goToSearchPage} 
                        goToHomePage={goToHomePage}
                        handleDeleteQuestions={handleDeleteQuestions}
                        
                        // ⬅️ KEEP Group Management Props
                        courseGroups={courseGroups} 
                        onAddGroup={handleAddGroup}
                        onRenameGroup={handleRenameGroup}
                        onDeleteGroup={handleDeleteGroup}
                        onFilterChange={handleFilterChange} 
                        
                        // ⭐ NEW PROP: Pass the processing state down
                        isProcessing={isProcessing} 
                        
                        // ⬅️ NEW: Pass dynamic options from main to HomePage
                        courseOptions={toolbarCourseOptions}
                        conceptOptions={toolbarConceptOptions}
                    />
                );
        }
    };

    // --- THE RETURN BLOCK (UNCHANGED) ---
    return (
        <StrictMode>
            {/* The reference to goToHomePage is now safe because it's defined above */}
            <Header goToHomePage={goToHomePage} />

            <Container maxWidth={false} sx={{ mt: 4, mb: 4 }}>
                {renderPage()}
            </Container>
            
            <Footer />
        </StrictMode>
    );
}

// --- THIS IS THE MODIFIED LINE ---
createRoot(document.getElementById('root')).render(
    <BrowserRouter>
        <App />
    </BrowserRouter>
);