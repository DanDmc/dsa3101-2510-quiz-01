# DSDS Quiz Bank Frontend (dsa3101-2510-quiz-01)

This is a full-stack, containerized web application designed to be the central hub for question management for the DSDS department. It allows academic staff to upload, search, filter, and curate a centralized bank of quiz and exam questions, streamlining the process of creating new assessments.



---

## 🛠️ Technology Stack

This project is a microservice-based architecture managed by Docker.

* **Containerization:** Docker & Docker Compose
* **Frontend:** React.js (Vite) with Material-UI (MUI)
* **Backend:** Python (Flask) API
* **Database:** MySQL
* **Database Management:** Adminer

---

## 🚀 Getting Started (Docker Compose)

This is the only setup method required. It will build and run the frontend, backend, and database in their own containers.

### Prerequisites

* [Docker Desktop](https://www.docker.com/products/docker-desktop/) (or Docker Engine + Docker Compose) must be installed and running.

### 1. Environment Variables (.env)

You must set up environment variables for the frontend and backend **before** running Docker.

These `.env` files contain secrets and configuration. They are ignored by Git for security and must be created manually by anyone setting up the project.

#### a) Backend Config

1.  Navigate to the `/backend` folder.
2.  Create a new file named `.env`
3.  Copy and paste the following into that file:

    ```.env
    # /backend/.env
    
    # This must match the service name in docker-compose.yml
    MYSQL_HOST=db
    MYSQL_USER=admin
    MYSQL_PASSWORD=secret
    MYSQL_DB=dsds_quiz_bank
    ```

#### b) Frontend Config

1.  Navigate to the `/frontend` folder.
2.  Create a new file named `.env`
3.  Copy and paste the following into that file. This URL points to the backend container as exposed on your local machine.

    ```.env
    # /frontend/.env
    
    # Note: The VITE_ prefix is required by Vite
    VITE_API_BASE_URL=http://localhost:5000/api
    ```

### 2. Build and Run

1.  Return to the **root** directory of the project (the folder that contains `docker-compose.yml`).
2.  Run the following command in your terminal:

    ```sh
    docker-compose up -d --build
    ```

* `--build`: Forces Docker to build your images for the first time.
* `-d`: Runs the containers in "detached" mode (in the background).

### 3. Access the Application

Once the containers are running, the full application is live:

* **Frontend App:** http://localhost:5173/
* **Backend API:** [http://localhost:5000/api](http://localhost:5000/api)
* **Database GUI (Adminer):** [http://localhost:8080](http://localhost:8080)

---
### Frontend Core Architectural Principle: Separation of Concerns

The entire frontend is built on a foundational principle called **Separation of Concerns (SoC)**. This professional standard dictates that our application is broken into distinct sections, each with one clear responsibility.

Our architecture is split into three main layers of concern:

1.  **Page Components (`src/pages/`)**
    * **Job:** Manages state and logic.
    * *Also known as: "Smart" or "Container" Components.*

2.  **UI Components (`src/components/`)**
    * **Job:** Manages looks and presentation.
    * *Also known as: "Dumb" or "Presentational" Components.*

3.  **API Layer (`src/api/`)**
    * **Job:** Manages all communication with the backend.

This separation makes the code highly **maintainable** (bugs are easier to find), **scalable** (new features are easier to add), and **testable** (we can test UI and logic separately).

---

### Detailed Component & Page Breakdown (Based on your images)

#### Page Layer (Stateful Containers)

* `src/pages/HomePage.jsx`
    * **Purpose:** This is the main "Question Bank" dashboard. It's for browsing, organizing, and managing questions into groups.
    * **Logic:** This "smart" page fetches question data and also the list of "Question Groups". It renders the `QuestionTable.jsx` to show the questions and the `QuestionGroups.jsx` component in the right-hand sidebar. It manages the logic for adding/removing questions from groups.
* `src/pages/QuestionSearchPage.jsx`
    * **Purpose:** A dedicated, "smart" page for **advanced filtering and searching**.
    * **Logic:** Its primary job is to manage the complex `filters` state from all the dropdowns in its `QuestionToolbar`. It passes those filters to the API, gets the results, and passes the resulting array to the `QuestionTable` component.
* `src/pages/CreateQuestionPage.jsx`
    * **Purpose:** A "smart" page for **creating new questions**.
    * **Logic:** Manages the state for a *new* batch of questions (`questionsToCreate`) and the `activeQuestionId`. It coordinates the `QuestionStepper` (left sidebar) with the `QuestionForm` (main content area).
* `src/pages/EditPage.jsx`
    * **Purpose:** A "smart" page for **modifying an existing question**.
    * **Logic:** It looks identical to the `CreateQuestionPage` but has different *startup* logic. When it loads, it fetches an *existing* question's data from the API (based on a URL ID). It then populates the `questionsToCreate` array with this data and passes it to the `EditQuestionForm.jsx`.

#### Component Layer (Presentational UI)

* **Layout & Navigation:**
    * `Header.jsx`: The "DSDS QUIZ BANK" header bar, visible on all pages.
    * `Footer.jsx`: The footer, visible on all pages.
    * `QuestionStepper.jsx`: The left-hand sidebar seen in the `Create` and `Edit` pages. It receives a list of questions and an `activeQuestionId` as props and allows the user to navigate between them.
* **Data Display:**
    * `QuestionTable.jsx`: The main data grid seen on the `HomePage` and `QuestionSearchPage`. It receives an array of `questions` as a prop and just renders the rows.
    * `QuestionGroups.jsx`: The right-hand sidebar on the `HomePage` used to organize questions. It receives a list of groups and calls functions (like `onGroupClick`) when a group is selected.
* **Toolbars (Actions):**
    * `QuestionToolbar.jsx`: A highly versatile component.
        * On `HomePage`, it's simple: "Create/Upload," "Delete," "Edit," and a basic search.
        * On `QuestionSearchPage`, it's complex: "Search keyword," "Question Type," "Course," "Academic Year," etc.
    * `CreateToolbar.jsx`: This is the toolbar *inside* the `Create` and `Edit` pages (e.g., "Download," "Preview," "Publish," "Update").
* **Forms & Interaction:**
    * `QuestionForm.jsx`: The "dumb" form used on the `CreateQuestionPage` for entering new question text and answers.
    * `EditQuestionForm.jsx`: A variant of `QuestionForm` used on the `EditPage` that comes pre-filled with existing data.
---

## 🛑 How to Stop

There are two ways to stop the application, depending on how you started it.

#### Scenario 1: If you ran `docker-compose up`

If you ran the command *without* the `-d` flag, the containers are attached to your terminal and streaming logs.

1.  Press **`Control+C`** in the terminal where Docker is running. This will send the "stop" signal to the containers.
2.  Once stopped, run the `down` command to fully remove the containers and network:
    ```sh
    docker-compose down
    ```

#### Scenario 2: If you ran `docker-compose up -d`

If you ran the command with the `-d` (detached) flag, the containers are running in the background.

1.  Simply run the `down` command from the root directory to stop and remove everything:
    ```sh
    docker-compose down
    ```

---

### Full Project Reset (Remove All Data)

The `docker-compose down` command **does not** remove named volumes by default. This is a safety feature to protect your database.

If you want to completely wipe the project, including all data in your MySQL database, and start from a clean slate:

```sh
# This stops, removes containers, AND deletes the database volume.
docker-compose down -v
