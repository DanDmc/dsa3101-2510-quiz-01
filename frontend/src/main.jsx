import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
//import './index.css';

// --- ADD THESE IMPORTS ---
// Make sure these paths are correct for your project!
import Header from './components/Header';
import Footer from './components/Footer';
import Container from '@mui/material/Container'; // Import the Container

// --- Your Page Imports ---
import HomePage from './pages/HomePage.jsx';
import CreateQuestionPage from './pages/CreateQuestionPage.jsx';
import EditPage from './pages/EditPage.jsx';
import QuestionSearchPage from './pages/QuestionSearchPage.jsx';


// Mock data for the example (Kept the same)
// This is the constant array
const mockQuestions = [
  { id: 1, text: 'Convert 1110010101 from binary to text', type: 'Open ended' },
  { id: 2, text: 'If a route function returns the string "Hello world!", the HTTP status...', type: 'Open ended' },
  { id: 3, text: 'How many 8-digit numbers can be formed using 2, 3, 4, 4, 5, 5, 5, 5?', type: 'Open ended' },
  { id: 4, text: 'In a simple regression, the RMSE of the regression line is equal to 0.6...', type: 'MCQ' },
  { id: 5, text: 'In an SQL database, a record with ID = 1 already exists. Another record...', type: 'MCQ' },
  { id: 6, text: 'Which of the following statement(s) is/are correct about primary keys...', type: 'MRQ' },
  { id: 7, text: 'You are testing a Flask API endpoint that checks book orders. The...', type: 'MRQ' },
];

// Define page constants for clarity
const PAGES = {
  HOME: 'home',
  CREATE: 'create',
  EDIT: 'edit',
  SEARCH: 'search',
};

function App() {
  const [currentPage, setCurrentPage] = useState(PAGES.HOME);
  const [selectedQuestions, setSelectedQuestions] = useState([]);

  // --- THIS IS THE FIX ---
  // Initialize the state with the 'mockQuestions' constant defined above
  // (It was 'allMockQuestions' before, which was a bug)
  const [questions, setQuestions] = useState(mockQuestions);

  // Navigation handlers
  const goToHomePage = () => setCurrentPage(PAGES.HOME);
  const goToCreatePage = () => setCurrentPage(PAGES.CREATE);
  const goToSearchPage = () => setCurrentPage(PAGES.SEARCH);
  
  const goToEditPage = (questionsToEdit) => {
    if (questionsToEdit && questionsToEdit.length > 0) {
        // Save the ARRAY OF OBJECTS to state
        setSelectedQuestions(questionsToEdit);
        setCurrentPage(PAGES.EDIT);
    } else {
        console.warn("Please select at least one question to edit."); 
    }
  };

  const handleDeleteQuestions = (idsToDelete) => {
    // A simple confirmation dialog
    if (window.confirm(`Are you sure you want to delete ${idsToDelete.length} question(s)?`)) {
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
          <QuestionSearchPage 
            goToCreatePage={goToCreatePage}
            goToEditPage={goToEditPage}
            // We can also pass an initial query if we want
            // initialQuery="python" 
          />
        );
      
      case PAGES.HOME:
      default:
        return (
          <HomePage 
            // --- 5. PASS QUESTIONS DATA DOWN ---
            questions={questions} // Pass the state variable
            goToCreatePage={goToCreatePage}
            goToEditPage={goToEditPage} 
            goToSearchPage={goToSearchPage} 
            goToHomePage={goToHomePage}
            handleDeleteQuestions={handleDeleteQuestions}
          />
        );
    }
  };

  // --- THE FIX IS HERE ---
  // The return block is now the final, correct version.
  // It has the permanent Header, Footer, and the
  // full-width Container (`maxWidth={false}`).
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

