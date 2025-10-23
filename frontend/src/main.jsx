import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import HomePage from './pages/HomePage.jsx'
import CreateQuestionPage from './pages/CreateQuestionPage.jsx'
import EditPage from './pages/EditPage.jsx'; 

//since we dont have router set up, now we only can display 1 page at a time, uncomment/comment whichever
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <EditPage />
    {/*}
    <CreateQuestionPage />
    <HomePage />
    */}
  </StrictMode>,
) 
