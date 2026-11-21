# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: smoke.spec.mjs >> a second user's account does not read the first user's saved draft
- Location: tests\e2e\smoke.spec.mjs:97:1

# Error details

```
Test timeout of 45000ms exceeded.
```

# Page snapshot

```yaml
- generic [ref=f1e4]:
  - complementary [ref=f1e5]:
    - generic [ref=f1e6]:
      - generic [ref=f1e7]: DevArena AI
      - button "Close navigation" [ref=f1e14]
    - navigation [ref=f1e18]:
      - button "Dashboard" [ref=f1e19]
      - button "Assessments" [ref=f1e25]
      - button "Interview Practice" [ref=f1e30]
      - button "My Progress" [ref=f1e34]
      - button "My Profile" [ref=f1e37]
      - button "Settings" [ref=f1e41]
    - generic [ref=f1e45]:
      - paragraph [ref=f1e49]: Practice like a developer
      - paragraph [ref=f1e50]: Solve real engineering tasks, not just isolated questions.
  - main [ref=f1e51]:
    - generic [ref=f1e52]:
      - generic [ref=f1e53]:
        - button "Open navigation" [ref=f1e54]
        - heading "Dashboard" [level=1] [ref=f1e56]
      - button "Open account menu" [ref=f1e58]:
        - generic [ref=f1e59]: TD
    - generic [ref=f1e60]:
      - generic [ref=f1e61]:
        - paragraph [ref=f1e62]: ENGINEERING PRACTICE PLATFORM
        - heading "Learn to solve problems like a real software engineer." [level=2] [ref=f1e63]
        - paragraph [ref=f1e64]: Debug existing projects, improve code, get guided assistance and practice technical explanations.
        - button "Explore assessments" [ref=f1e65]
      - generic [ref=f1e68]:
        - generic [ref=f1e69]:
          - heading "Your Practice Overview" [level=3] [ref=f1e70]
          - paragraph [ref=f1e71]: Assessment statistics from Supabase
        - button "Refresh" [ref=f1e72]
      - generic [ref=f1e78]:
        - generic [ref=f1e79]:
          - paragraph [ref=f1e84]: "3"
          - paragraph [ref=f1e85]: Available Challenges
        - generic [ref=f1e86]:
          - paragraph [ref=f1e90]: "0"
          - paragraph [ref=f1e91]: Completed
        - generic [ref=f1e92]:
          - paragraph [ref=f1e96]: "0"
          - paragraph [ref=f1e97]: Attempts Recorded
      - generic [ref=f1e99]:
        - generic [ref=f1e105]:
          - heading "AI Assessment Generator" [level=2] [ref=f1e106]
          - paragraph [ref=f1e107]: Generate realistic debugging projects using Gemini AI.
        - generic [ref=f1e108]:
          - generic [ref=f1e109]:
            - generic [ref=f1e110]: Technology
            - combobox "Technology" [ref=f1e111]:
              - option "Java" [selected]
              - option "SQL"
              - option "React"
          - generic [ref=f1e112]:
            - generic [ref=f1e113]: Difficulty
            - combobox "Difficulty" [ref=f1e114]:
              - option "Beginner" [selected]
              - option "Intermediate"
              - option "Advanced"
        - button "Generate Assessment" [ref=f1e115]
        - paragraph [ref=f1e119]: AI-generated projects may contain mistakes. AI code review is available, but compilation and automated runtime tests are not yet supported.
      - generic [ref=f1e120]:
        - heading "Recommended assessments" [level=3] [ref=f1e121]
        - paragraph [ref=f1e122]: Start with a realistic development challenge.
      - generic [ref=f1e123]:
        - article [ref=f1e124]:
          - text: Beginner
          - paragraph [ref=f1e125]: Backend Development
          - heading "Debug a Java REST API" [level=4] [ref=f1e126]
          - paragraph [ref=f1e127]: Investigate a broken API, fix validation bugs and verify responses.
          - generic [ref=f1e128]: 45 min
          - button "View challenge" [ref=f1e132]
        - article [ref=f1e135]:
          - text: Intermediate
          - paragraph [ref=f1e136]: Database
          - heading "Fix a SQL Query" [level=4] [ref=f1e137]
          - paragraph [ref=f1e138]: Find incorrect joins and filtering logic in an employee database.
          - generic [ref=f1e139]: 30 min
          - button "View challenge" [ref=f1e143]
        - article [ref=f1e146]:
          - text: Intermediate
          - paragraph [ref=f1e147]: Frontend
          - heading "Frontend API Integration" [level=4] [ref=f1e148]
          - paragraph [ref=f1e149]: Repair an incomplete React application with API integration issues.
          - generic [ref=f1e150]: 60 min
          - button "View challenge" [ref=f1e154]
```