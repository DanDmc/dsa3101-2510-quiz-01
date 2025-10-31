import { StrictMode, useState, useEffect } from 'react'; 
import { createRoot } from 'react-dom/client';
//import './index.css';

// --- ADD THIS IMPORT ---
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


// Mock data for the example - FIXED HEADERS to match SQL/Table column names
const mockQuestions = [
    { id: 1, question_stem: 'Convert 1110010101 from binary to text', question_type: 'Open ended', difficultyManual: 0.5, difficultyGenerated: null, file_id: 101 },
    { id: 2, question_stem: 'If a route function returns the string "Hello world!", the HTTP status...', question_type: 'Open ended', difficultyManual: 0.8, difficultyGenerated: null, file_id: 102 },
    { id: 3, question_stem: 'How many 8-digit numbers can be formed using 2, 3, 4, 4, 5, 5, 5, 5?', question_type: 'Open ended', difficultyManual: 0.2, difficultyGenerated: null, file_id: 103 },
    { id: 4, question_stem: 'In a simple regression, the RMSE of the regression line is equal to 0.6...', question_type: 'MCQ', difficultyManual: 0.6, difficultyGenerated: null, file_id: 104 },
    { id: 5, question_stem: 'In an SQL database, a record with ID = 1 already exists. Another record...', question_type: 'MCQ', difficultyManual: 0.9, difficultyGenerated: null, file_id: 105 },
    { id: 6, question_stem: 'Which of the following statement(s) is/are correct about primary keys...', question_type: 'MRQ', difficultyManual: 0.3, difficultyGenerated: null, file_id: 106 },
    { id: 7, question_stem: 'You are testing a Flask API endpoint that checks book orders. The...', question_type: 'MRQ', difficultyManual: 0.7, difficultyGenerated: null, file_id: 107 },
    { id: 8, question_stem: 'Correctly order the following steps using the Karush-Kuhn-Tucker (KKT)...', question_type: 'Ordering', difficultyManual: 0.44, difficultyGenerated: null, file_id: 108 },
    { id: 9, question_stem: 'Order the typical stages of finding the Maximum Likelihood Estimator...', question_type: 'Ordering', difficultyManual: 0.32, difficultyGenerated: null, file_id: 109 },
    { id: 10, question_stem: 'Match the term in the Karush-Kuhn-Tucker (KKT) necessary conditions...', question_type: 'Matching', difficultyManual: 0.25, difficultyGenerated: null, file_id: 110 },
    { id: 11, question_stem: 'Match the following matrix or vector components from the Multiple...', question_type: 'Matching', difficultyManual: 0.41, difficultyGenerated: null, file_id: 111 },
    { id: 12, question_stem: 'Match the estimator criterion to the correct principle or context it represents', question_type: 'Matching', difficultyManual: 0.12, difficultyGenerated: null, file_id: 112 },
];



// Define page constants for clarity
const PAGES = {
    HOME: 'home',
    CREATE: 'create',
    EDIT: 'edit',
    SEARCH: 'search',
};

// 庁 FIX 1: Define the base URL using the environment variable
const BASE_API_URL = import.meta.env.VITE_APP_API_URL || '/api'; 
console.log(`API Target: ${BASE_API_URL}`);


function App() {
    const [currentPage, setCurrentPage] = useState(PAGES.HOME);
    const [selectedQuestions, setSelectedQuestions] = useState([]);
    
    // --- State for search filters (from previous step) ---
    const [searchParams, setSearchParams] = useState(null);

    // Initialize 'questions' state as empty array 
    const [questions, setQuestions] = useState([]); 

    // 検 ISSUE 1 FIX: State for the safe deletion toggle. Default to true (safe).
    const [isSafeDeletionEnabled, setIsSafeDeletionEnabled] = useState(true);

    // --- MODIFIED: Function to fetch data from the backend API with fallback ---
    const fetchQuestions = async () => {
        try {
            // Use the dynamic base URL
            const response = await fetch(`${BASE_API_URL}/getquestion`); 
            
            if (!response.ok) {
                // If the HTTP request is successful but the server returns an error code (e.g., 404, 500)
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            setQuestions(data.items || []); 

        } catch (error) {
            console.error("Could not fetch questions from the API. Falling back to mock data.", error);
            // 庁 FIX 2: Fallback to mock data on ANY API failure (connection, timeout, server error)
            setQuestions(mockQuestions); // Uses the now-corrected mockQuestions
        }
    };
    
    // Use useEffect to fetch data when the component mounts
    useEffect(() => {
        fetchQuestions();
    }, []); 

    // Navigation handlers
    const goToHomePage = () => {
        setCurrentPage(PAGES.HOME);
        // Re-fetch questions when navigating back to home page
        fetchQuestions(); 
    };
    
    const goToCreatePage = () => setCurrentPage(PAGES.CREATE);
    
    // --- UPDATED: This function accepts the 'params' object (from previous step) ---
    const goToSearchPage = (params) => {
        console.log("Search params received in main.jsx:", params);
        setSearchParams(params); // Store the search/filter data
        setCurrentPage(PAGES.SEARCH); // Change to the search page
    };
    
    const goToEditPage = (questionsToEdit) => {
        if (questionsToEdit && questionsToEdit.length > 0) {
            setSelectedQuestions(questionsToEdit);
            setCurrentPage(PAGES.EDIT);
        } else {
            console.warn("Please select at least one question to edit."); 
        }
    };

    // 検 ISSUE 1 FIX: Modified handler to check the safe deletion toggle state
    const handleDeleteQuestions = (idsToDelete) => {
        if (window.confirm(`Are you sure you want to delete ${idsToDelete.length} question(s)?`)) {
            
            if (isSafeDeletionEnabled) {
                // Log/call safe deletion API endpoint
                console.log(`[Safe Deletion Mode]: Initiating soft/transactional delete for IDs: ${idsToDelete.join(', ')}`);
                // Placeholder for API call: await fetch(`${BASE_API_URL}/softdeletequestion`, { method: 'POST', body: JSON.stringify({ ids: idsToDelete }) });
            } else {
                // Log/call permanent deletion API endpoint
                console.warn(`[PERMANENT DELETION MODE]: Permanently deleting IDs: ${idsToDelete.join(', ')}. No undo!`);
                // Placeholder for API call: await fetch(`${BASE_API_URL}/permanentdeletequestion`, { method: 'POST', body: JSON.stringify({ ids: idsToDelete }) });
            }

            // Update UI state regardless of the deletion mode for demonstration
            setQuestions(prevQuestions => 
                prevQuestions.filter(q => !idsToDelete.includes(q.id))
            );
        }
    };

    const renderPage = () => {
        switch (currentPage) {
            case PAGES.CREATE:
                return <CreateQuestionPage goToHomePage={goToHomePage} />;
            case PAGES.EDIT:
                return <EditPage selectedQuestions={selectedQuestions} goToHomePage={goToHomePage} />;

            case PAGES.SEARCH:
                return (
                    // --- UPDATED: Pass all necessary props ---
                    <QuestionSearchPage 
                        goToCreatePage={goToCreatePage}
                        goToEditPage={goToEditPage}
                        searchParams={searchParams}
                        // --- REMOVED: No longer passing the master list ---
                        // questions={questions} 
                        handleDeleteQuestions={handleDeleteQuestions}
                        goToSearchPage={goToSearchPage}
                        isSafeDeletionEnabled={isSafeDeletionEnabled}
                        setIsSafeDeletionEnabled={setIsSafeDeletionEnabled}
                    />
                );
            
            case PAGES.HOME:
            default:
                return (
                    <HomePage 
                        questions={questions} 
                        goToCreatePage={goToCreatePage}
                        goToEditPage={goToEditPage} 
                        goToSearchPage={goToSearchPage} 
                        goToHomePage={goToHomePage}
                        handleDeleteQuestions={handleDeleteQuestions}
                        // 検 ISSUE 1 FIX: Pass the state and setter to HomePage
                        isSafeDeletionEnabled={isSafeDeletionEnabled}
                        setIsSafeDeletionEnabled={setIsSafeDeletionEnabled}
                    />
                );
        }
    };

    // --- THE RETURN BLOCK (UNCHANGED) ---
    return (
        <StrictMode>
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



