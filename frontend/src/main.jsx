import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import HomePage from './pages/HomePage.jsx';
import CreateQuestionPage from './pages/CreateQuestionPage.jsx';
import EditPage from './pages/EditPage.jsx'; 

// Define page constants for clarity
const PAGES = {
  HOME: 'home',
  CREATE: 'create',
  EDIT: 'edit',
};

function App() {
  // 1. All your state and handlers from your first function
  const [currentPage, setCurrentPage] = useState(PAGES.HOME);
  const [selectedQuestions, setSelectedQuestions] = useState([]);

  // Navigation handlers
  const goToHomePage = () => setCurrentPage(PAGES.HOME);
  const goToCreatePage = () => setCurrentPage(PAGES.CREATE);
  
  const goToEditPage = (selectedIds) => {
    if (selectedIds && selectedIds.length > 0) {
        setSelectedQuestions(selectedIds);
        setCurrentPage(PAGES.EDIT);
    } else {
        alert("Please select at least one question to edit."); 
    }
  };

  // 2. Your renderPage logic to decide *which page* to show
  const renderPage = () => {
    switch (currentPage) {
      case PAGES.CREATE:
        // Pass functions the page needs (if any)
        return <CreateQuestionPage goToHomePage={goToHomePage} />;
      
      case PAGES.EDIT:
        // Pass props the page needs
        return <EditPage selectedQuestionIds={selectedQuestions} goToHomePage={goToHomePage} />;
      
      case PAGES.HOME:
      default:
        // Pass navigation functions for the buttons on the home page
        return (
          <HomePage 
            goToCreatePage={goToCreatePage}
            goToEditPage={goToEditPage} 
            goToHomePage={goToHomePage}
          />
        );
    }
  };

  // 3. Your return statement with the layout from your second function
  return (
    <StrictMode>
      {/* The Header is now permanent. 
        We pass it the goToHomePage function so (for example)
        clicking the logo can take you home.
      */}
      <Header goToHomePage={goToHomePage} />

      <Container maxWidth="lg" sx={{ mt: 2, mb: 2 }}>
        {/* This is the key part:
          We call renderPage() here to put the correct page
          (Home, Create, or Edit) inside the container.
        */}
        {renderPage()}
      </Container>

      {/* The Footer is also permanent */}
      <Footer />
    </StrictMode>
  );
}

createRoot(document.getElementById('root')).render(<App />);


export default App;