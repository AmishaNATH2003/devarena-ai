
# DevArena AI

**Practice real software engineering tasks, not just coding questions.**

DevArena AI is an AI-assisted software engineering assessment and interview preparation platform. It gives developers realistic debugging assignments, source-code editing tools, guided feedback, and technical interview practice.

## The Problem

Traditional coding platforms primarily test isolated algorithmic problems. Real software engineering also requires debugging existing projects, understanding requirements, fixing code, and explaining technical decisions.

DevArena AI is designed to help developers practice those skills.

## Features

### Real-World Debugging Assessments
- Java REST API debugging
- SQL query debugging
- React API integration debugging
- Multiple source files per assessment
- Interactive Monaco code editor

### AI-Generated Assignments
- Generate Java, SQL, and React challenges
- Choose beginner, intermediate, or advanced difficulty
- Practice on realistic broken projects

### AI Debugging Coach
- Explain source files
- Help identify potential bugs
- Provide debugging hints
- Offer feedback on candidate progress

### AI Code Evaluation
- Static evaluation with Gemini
- Correctness, code quality, and requirements scores
- Actionable feedback
- Source-pattern checks for predefined assessments

**Limitation:** AI evaluation does not currently compile or execute candidate code. Source-pattern checks are not executable unit tests.

### AI Interview Practice
- Practice technical explanations
- Answer interview questions
- Use supported browser speech transcription
- Receive AI-generated interview feedback

### Authentication and Progress
- Supabase authentication
- User profiles
- Account-specific browser drafts
- Cloud-stored assessment results
- Cloud-stored interview attempts
- Practice dashboard and progress history

## Technology Stack

| Area | Technology |
|------|------------|
| Frontend | React, Vite |
| Styling | Tailwind CSS |
| Editor | Monaco Editor |
| AI | Google Gemini |
| Authentication | Supabase Auth |
| Database | Supabase PostgreSQL |
| Backend APIs | Vercel Serverless Functions |
| Deployment | Vercel |
| Icons | Lucide React |

## Project Structure

```text
devarena-ai/
├── api/
│   ├── coach.js
│   ├── evaluate.js
│   ├── generate-assessment.js
│   └── interview.js
├── src/
│   ├── components/
│   │   ├── AccountSettings.jsx
│   │   ├── AssessmentWorkspace.jsx
│   │   ├── AuthGate.jsx
│   │   ├── DebuggingCoach.jsx
│   │   ├── DeveloperProfile.jsx
│   │   ├── GenerateAssessment.jsx
│   │   ├── InterviewPractice.jsx
│   │   ├── ProfileHeader.jsx
│   │   └── ProgressDashboard.jsx
│   ├── data/
│   │   └── challenges.js
│   ├── lib/
│   │   ├── cloudProgress.js
│   │   └── supabase.js
│   ├── utils/
│   │   └── assessmentValidation.js
│   ├── App.jsx
│   └── main.jsx
├── test-evaluation.cjs
├── package.json
└── README.md
```

## Local Setup

### Requirements

- Node.js compatible with the installed Vite version
- npm
- Supabase project
- Gemini API key
- Vercel CLI for local serverless API development

### Install

```bash
git clone https://github.com/AmishaNATH2003/devarena-ai.git
cd devarena-ai
npm install
```

### Environment Variables

Create a `.env.local` file for local development:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_publishable_key
GEMINI_API_KEY=your_gemini_api_key
```

The Gemini API key must remain on the server and must not be exposed as a `VITE_` environment variable.

Never commit `.env.local` or secret API keys to GitHub.

### Run the Application

For frontend development:

```bash
npm run dev
```

For development with Vercel API functions:

```bash
vercel dev
```

The application's local address is displayed in the terminal.

### Validate the Project

```bash
npm run lint
npm run build
```

### Test the Evaluation API

Start the API server, then run:

```bash
node test-evaluation.cjs
```

By default, this targets:

```text
http://localhost:3001
```

To use another port, set `TEST_BASE_URL`.

## Evaluation Limitations

The current version performs static AI code review.

Predefined challenges also use source-pattern checks to evaluate required changes. These checks may miss valid alternative solutions or incorrectly accept some code patterns.

The platform does not yet provide sandboxed compilation, runtime execution, or automated unit testing of arbitrary candidate submissions.

AI-generated assignments are validated for structure and size, but their correctness and grading remain subject to AI limitations.

## Development Roadmap

- Reliable executable test environments
- Stronger generated-assessment validation
- Better requirement-based grading
- Expanded challenge library
- Improved dashboard analytics
- Mobile usability and accessibility
- Performance and bundle-size optimization

## Author

Developed by Amisha Nath.

GitHub: https://github.com/AmishaNATH2003

## Status

DevArena AI is an actively developed prototype.
```
