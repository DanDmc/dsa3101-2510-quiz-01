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


// Mock data for the example - FIXED HEADERS to match SQL/Table column names
const mockQuestions = [
    { id: 1, question_stem: 'Convert 1110010101 from binary to text', question_type: 'Open-ended', difficultyManual: 0.5, difficultyGenerated: null, file_id: 101, question_base_id: 1 },
    { id: 2, question_stem: 'If a route function returns the string "Hello world!", the HTTP status...', question_type: 'Open-ended', difficultyManual: 0.8, difficultyGenerated: null, file_id: 102, question_base_id: 2 },
    { id: 3, question_stem: 'How many 8-digit numbers can be formed using 2, 3, 4, 4, 5, 5, 5, 5?', question_type: 'Open-ended', difficultyManual: 0.2, difficultyGenerated: null, file_id: 103, question_base_id: 3 },
    { id: 4, question_stem: 'In a simple regression, the RMSE of the regression line is equal to 0.6...', question_type: 'MCQ', difficultyManual: 0.6, difficultyGenerated: null, file_id: 104, question_base_id: 4 },
    { id: 5, question_stem: 'In an SQL database, a record with ID = 1 already exists. Another record...', question_type: 'MCQ', difficultyManual: 0.9, difficultyGenerated: null, file_id: 105, question_base_id: 5 },
    { id: 6, question_stem: 'Which of the following statement(s) is/are correct about primary keys...', question_type: 'MRQ', difficultyManual: 0.3, difficultyGenerated: null, file_id: 106, question_base_id: 6 },
    { id: 7, question_stem: 'You are testing a Flask API endpoint that checks book orders. The...', question_type: 'MRQ', difficultyManual: 0.7, difficultyGenerated: null, file_id: 107, question_base_id: 7 },
    { id: 8, question_stem: 'Correctly order the following steps using the Karush-Kuhn-Tucker (KKT)...', question_type: 'Ordering', difficultyManual: 0.44, difficultyGenerated: null, file_id: 108, question_base_id: 8 },
    { id: 9, question_stem: 'Order the typical stages of finding the Maximum Likelihood Estimator...', question_type: 'Ordering', difficultyManual: 0.32, difficultyGenerated: null, file_id: 109, question_base_id: 9 },
    { id: 10, question_stem: 'Match the term in the Karush-Kuhn-Tucker (KKT) necessary conditions...', question_type: 'Matching', difficultyManual: 0.25, difficultyGenerated: null, file_id: 110, question_base_id: 10 },
    { id: 11, question_stem: 'Match the following matrix or vector components from the Multiple...', question_type: 'Matching', difficultyManual: 0.41, difficultyGenerated: null, file_id: 111, question_base_id: 11 },
    { id: 12, question_stem: 'Match the estimator criterion to the correct principle or context it represents', question_type: 'Matching', difficultyManual: 0.12, difficultyGenerated: null, file_id: 112, question_base_id: 12 },
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
    
    // selectedQuestions holds the questions passed to EditPage (from Home or Create)
    const [selectedQuestions, setSelectedQuestions] = useState([]); 

    // questions holds the questions fetched for HomePage
    const [questions, setQuestions] = useState([]); 

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
            // Ensure mock data also has question_base_id for consistency in EditPage
            setQuestions(mockQuestions); 
        }
    };
    
    // ✅ FIX: CONDITIONAL DATA FETCHING (NEW useEffect)
    useEffect(() => {
        if (currentPage === PAGES.HOME) {
            console.log("App mounted on Home page. Fetching initial questions...");
            fetchQuestions();
        }
    }, [currentPage]); 

    // Navigation handlers
    const goToHomePage = () => {
        // When navigating to home, reset the page and then fetch fresh data.
        setCurrentPage(PAGES.HOME);
        fetchQuestions();
    };
    
    const goToCreatePage = () => {
        setCurrentPage(PAGES.CREATE);
        // We no longer clear the questions state here, as the CreatePage manages its own state.
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
    
    // 💥 NEW HANDLER: For transferring questions from CreatePage to EditPage
    const goToEditPageFromCreate = (questionsToTransfer) => {
        // This function is passed to CreateQuestionPage's "Upload File" button
        
        if (questionsToTransfer && questionsToTransfer.length > 0) {
            // 1. Set the transferred questions as the selected questions for the EditPage
            setSelectedQuestions(questionsToTransfer);
            // 2. Navigate to the EditPage
            setCurrentPage(PAGES.EDIT);
        } else {
            console.warn("Cannot switch to Edit Page: No questions to transfer from Create Page.");
        }
    };


    // ✅ MODIFICATION: Simplified handler for unconditional HARD DELETE
    const handleDeleteQuestions = async (idsToDelete) => {
        if (!window.confirm(`WARNING: Are you sure you want to PERMANENTLY delete ${idsToDelete.length} question(s)? This cannot be undone.`)) {
            return;
        }
        
        // Loop through and send DELETE requests for each ID
        let successfulDeletes = 0;
        for (const id of idsToDelete) {
            try {
                // 🚨 FIX: Using the correct, simplified hard delete endpoint
                const response = await fetch(`${BASE_API_URL}/api/deletequestion/${id}`, { 
                    method: 'DELETE',
                    // NOTE: The backend endpoint /api/deletequestion no longer needs "?confirm=YES"
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
            // Refresh the question list after successful deletions
            fetchQuestions();
            // Manually clear selected questions for UX
            setSelectedQuestions([]); 
        }
    };

    const renderPage = () => {
        switch (currentPage) {
            case PAGES.CREATE:
                return (
                    <CreateQuestionPage 
                        goToHomePage={goToHomePage} 
                        headerHeight={HEADER_HEIGHT_PX} 
                        footerHeight={FOOTER_HEIGHT_PX} 
                        // 🔑 Key Prop: Pass the new handler to allow navigation and data transfer
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
                        questions={questions} 
                        goToCreatePage={goToCreatePage}
                        goToEditPage={goToEditPage} 
                        goToSearchPage={goToSearchPage} 
                        goToHomePage={goToHomePage}
                        handleDeleteQuestions={handleDeleteQuestions}
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

// This part stays the same
createRoot(document.getElementById('root')).render(<App />);