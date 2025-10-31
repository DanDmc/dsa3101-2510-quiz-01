// src/main.jsx

import { StrictMode, useState, useEffect } from 'react'; 
import { createRoot } from 'react-dom/client';
//import './index.css';

// --- ADD THESE IMPORTS ---
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


// Mock data (unchanged)
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

// 💡 Define the base URL using the environment variable
const BASE_API_URL = import.meta.env.VITE_APP_API_URL || '/api'; 
console.log(`API Target: ${BASE_API_URL}`);


function App() {
    const [currentPage, setCurrentPage] = useState(PAGES.HOME);
    const [selectedQuestions, setSelectedQuestions] = useState([]); 
    const [questions, setQuestions] = useState([]); 
    
    // ⭐ NEW STATE 1: Stores the dynamically generated list of course groups
    const [courseGroups, setCourseGroups] = useState([]);
    
    // ⭐ NEW STATE 2: Tracks the currently selected filter/course in QuestionGroups
    // MODIFICATION: Must initialize as an array to hold multiple selections
    const [activeFilter, setActiveFilter] = useState([ALL_QUESTIONS_KEY]); 

    // ⭐ NEW STATE 3: Tracks if a long-running group operation is active (ADD/RENAME/DELETE)
    const [isProcessing, setIsProcessing] = useState(false); 


    // --- Core Handlers (Must be defined before usage) ---

    // --- MODIFIED: Function to fetch data from the backend API with fallback (needed by many handlers) ---
    const fetchQuestions = async () => {
        try {
            const response = await fetch(`${BASE_API_URL}/getquestion`); 
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            setQuestions(data.items || []); 

        } catch (error) {
            console.error("Could not fetch questions from the API. Falling back to mock data.", error);
            setQuestions(mockQuestions); 
        }
    };

    // Navigation handlers
    const goToHomePage = () => {
        setCurrentPage(PAGES.HOME);
        // Reset filter when navigating back to home
        setActiveFilter([ALL_QUESTIONS_KEY]); // MODIFICATION: Reset to array
        fetchQuestions();
    };
    
    const goToCreatePage = () => {
        setCurrentPage(PAGES.CREATE);
    };
    
    const goToSearchPage = () => setCurrentPage(PAGES.SEARCH);
    
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

    // 🐛 FIX: Moved to the top scope to be accessible by renderPage
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

    // --- Course Group Extraction Logic (unchanged) ---
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

    // --- NEW HANDLER 1: Group Filter Change ---
    // MODIFICATION: activeFilter is now an array of filter keys
    const handleFilterChange = (filterKeys) => {
        // filterKeys is expected to be an array, e.g., ['CS1231'], ['NO_GROUPS'], or ['ALL_QUESTIONS']
        setActiveFilter(filterKeys);
        setSelectedQuestions([]);
        console.log("Active Filter Set To:", filterKeys);
    };


    // --- NEW HANDLER 2: Add Group (API Implementation with Duplicate Check) ---
    const handleAddGroup = async () => { 
        // 1. Prompt and Validation 
        const newGroupName = prompt("Enter the name for the new Question Group/Course:");
        
        if (!newGroupName || newGroupName.trim() === '') {
            alert("Group name cannot be empty.");
            return;
        }
        const trimmedName = newGroupName.trim();

        // ⭐ DUPLICATE CHECK: Case-insensitive check
        const isDuplicate = courseGroups.some(group => group.toLowerCase() === trimmedName.toLowerCase());

        if (isDuplicate) {
            alert(`A group named "${trimmedName}" already exists. Please choose a unique name.`);
            return;
        }

        const minimalQuestionPayload = {
            course: trimmedName,
            question_stem: PLACEHOLDER_STEM, 
            question_type: 'others', // Safe default type (DO NOT CHANGE)
            difficultyManual: null,
            difficultyGenerated: null,
            assessment_type: 'others', // Safe default type (DO NOT CHANGE)
        };

        try {
            setIsProcessing(true); // ⭐ Start processing
            
            const response = await fetch(`${BASE_API_URL}/api/createquestion`, { 
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(minimalQuestionPayload),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: 'Unknown server error.' }));
                throw new Error(`Failed to create new group: ${response.status} - ${errorData.message}`);
            }

            console.log(`Successfully created placeholder question for new group: ${trimmedName}`);
            alert(`Group "${trimmedName}" created successfully!`); 
            
            // Success: Fetch all questions to update the courseGroups list automatically
            fetchQuestions();
            
        } catch (error) {
            console.error("Error adding new group via API:", error);
            alert(`Failed to add new group: ${error.message}`);
        } finally {
            setIsProcessing(false); // ⭐ Stop processing
        }
    };

    // --- MODIFIED HANDLER 3: Rename Group (API Implementation with Loading State and Duplicate Check) ---
    const handleRenameGroup = async (oldName, newName) => {
        const trimmedNewName = newName.trim();
        
        // 1. Client-side Validation 
        if (oldName === trimmedNewName) return;
        if (trimmedNewName === '') {
            alert("Group name cannot be empty.");
            return;
        }
        
        // ⭐ Check for duplicates during rename (case-insensitive, excluding original name)
        const isDuplicate = courseGroups.some(group => 
            group.toLowerCase() === trimmedNewName.toLowerCase() && group !== oldName
        );

        if (isDuplicate) {
            alert(`A group named "${trimmedNewName}" already exists.`);
            return;
        }
        
        if (!window.confirm(`Are you sure you want to rename the group "${oldName}" to "${trimmedNewName}"? This will affect all associated questions.`)) {
            return;
        }

        // 2. Identify all questions that need renaming
        const questionsToUpdate = questions.filter(q => q.course === oldName);
        const totalUpdates = questionsToUpdate.length;
        
        if (totalUpdates === 0) {
            alert(`Group "${oldName}" does not contain any questions to rename, but the group list state will be updated.`);
        }
        
        let successfulUpdates = 0;
        
        try {
            setIsProcessing(true); // ⭐ Start processing

            // 3. Loop through and update each question
            for (const q of questionsToUpdate) {
                const payload = { course: trimmedNewName };

                const response = await fetch(`${BASE_API_URL}/api/editquestions/${q.id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                });

                if (response.ok) {
                    successfulUpdates++;
                } else {
                    console.error(`Failed to rename QID ${q.id}: Status ${response.status}`);
                }
            }
            
            // 4. Final State Update and UI Feedback
            if (successfulUpdates > 0 || totalUpdates === 0) {
                // Update the local course list state for immediate UI update
                setCourseGroups(prevGroups => 
                    prevGroups.map(group => (group === oldName ? trimmedNewName : group)).sort()
                );

                // If the renamed group was the active filter, update the active filter state
                if (activeFilter.includes(oldName)) { // MODIFICATION: Check if array includes oldName
                    // Note: This logic is tricky with multi-select. If oldName was the only select, we set to newName. 
                    // If multiple were selected, we rely on the upcoming fetchQuestions to restore the full list.
                    // For simplicity, we just set the filter state to a new array containing the new name.
                    setActiveFilter([trimmedNewName]); 
                }

                // Refresh the question list to ensure UI consistency
                fetchQuestions();

                alert(`Successfully renamed ${successfulUpdates} of ${totalUpdates} questions to "${trimmedNewName}".`);
            } else {
                 alert("Renaming failed: No questions were updated successfully.");
            }
        } catch (error) {
            console.error("Critical error during rename operation:", error);
            alert("A critical network error occurred during renaming. Please check the console.");
        } finally {
            setIsProcessing(false); // ⭐ Stop processing
        }
    };

    // ⭐ MODIFICATION 4: DELETE GROUP IMPLEMENTATION
    const handleDeleteGroup = async (groupName) => {
        if (!window.confirm(`WARNING: Are you sure you want to delete the group "${groupName}"? This will UNASSIGN the course from all associated questions.`)) {
            return;
        }

        // 1. Identify questions
        const questionsToUnset = questions.filter(q => 
            q.course === groupName && q.question_stem !== PLACEHOLDER_STEM
        );
        const placeholderQuestion = questions.find(q => 
            q.course === groupName && q.question_stem === PLACEHOLDER_STEM
        );
        
        const totalUnset = questionsToUnset.length;
        let successfulUnset = 0;
        let placeholderDeleted = false;

        try {
            setIsProcessing(true); // ⭐ Start processing

            // --- STEP 1: Bulk Unset (Set course to NULL) for all regular questions ---
            for (const q of questionsToUnset) {
                const payload = { course: null }; // Set course to NULL
                
                const response = await fetch(`${BASE_API_URL}/api/editquestions/${q.id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                });

                if (response.ok) {
                    successfulUnset++;
                } else {
                    console.error(`Failed to unset course for QID ${q.id}: Status ${response.status}`);
                }
            }
            
            // --- STEP 2: Delete the placeholder question ---
            if (placeholderQuestion) {
                const response = await fetch(`${BASE_API_URL}/api/deletequestion/${placeholderQuestion.id}`, {
                    method: 'DELETE',
                });
                
                if (response.ok) {
                    placeholderDeleted = true;
                } else {
                    console.error(`Failed to delete placeholder QID ${placeholderQuestion.id}: Status ${response.status}`);
                }
            } else {
                console.warn(`No placeholder question found for group "${groupName}". Skipping delete step.`);
            }

            // --- Final State Update ---
            if (successfulUnset > 0 || placeholderDeleted) {
                // Remove the group from the local state immediately
                setCourseGroups(prevGroups => prevGroups.filter(group => group !== groupName));
                
                // Switch filter to "Show All Questions" since the current group is gone
                setActiveFilter([ALL_QUESTIONS_KEY]); // MODIFICATION: Set active filter to array
                
                // Full refresh to update the question table and confirm group list state
                fetchQuestions();

                alert(`Group "${groupName}" successfully deleted. ${successfulUnset} questions were unassigned.`);
            } else {
                alert(`Deletion failed for group "${groupName}". No records were updated or deleted.`);
            }

        } catch (error) {
            console.error("Critical error during delete operation:", error);
            alert("A critical network error occurred during deletion. Please check the console.");
        } finally {
            setIsProcessing(false); // ⭐ Stop processing
        }
    };


    // --- Question Data and Filtering (MODIFIED for OR logic) ---
    const filteredQuestions = questions.filter(question => {
        const course = question.course ? question.course.trim() : null; 
        
        // ⭐ Check 1: If ALL_QUESTIONS_KEY is present, show everything.
        if (activeFilter.includes(ALL_QUESTIONS_KEY)) {
            return true; 
        }
        
        // ⭐ Check 2: If ALL is not present, apply OR logic across active filters.
        return activeFilter.some(filterKey => {
            if (filterKey === NO_GROUPS_KEY) {
                // Show questions where course is NULL
                return course === null; 
            }
            
            // Show questions belonging to the specific course/group
            return course === filterKey;
        });
    });


    // ✅ FIX: CONDITIONAL DATA FETCHING (NEW useEffect) (unchanged)
    useEffect(() => {
        if (currentPage === PAGES.HOME) {
            console.log("App mounted on Home page. Fetching initial questions...");
            fetchQuestions();
        }
    }, [currentPage]); 
    
    
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
                        goToCreatePage={goToCreatePage}
                        goToEditPage={goToEditPage}
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
                        
                        courseGroups={courseGroups} 
                        onAddGroup={handleAddGroup}
                        onRenameGroup={handleRenameGroup}
                        onDeleteGroup={handleDeleteGroup}
                        onFilterChange={handleFilterChange} 
                        
                        // ⭐ NEW PROP: Pass the processing state down
                        isProcessing={isProcessing} 
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

// This part stays the same
createRoot(document.getElementById('root')).render(<App />);