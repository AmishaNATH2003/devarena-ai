# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: smoke.spec.mjs >> generated challenge works with mocked Gemini response
- Location: tests\e2e\smoke.spec.mjs:79:1

# Error details

```
Test timeout of 45000ms exceeded.
```

# Page snapshot

```yaml
- generic [ref=e4]:
  - complementary [ref=e5]:
    - generic [ref=e6]:
      - generic [ref=e7]: DevArena AI
      - button "Close navigation" [ref=e14]
    - navigation [ref=e18]:
      - button "Dashboard" [ref=e19]
      - button "Assessments" [ref=e25]
      - button "Interview Practice" [ref=e30]
      - button "My Progress" [ref=e34]
      - button "My Profile" [ref=e37]
      - button "Settings" [ref=e41]
    - generic [ref=e45]:
      - paragraph [ref=e49]: Practice like a developer
      - paragraph [ref=e50]: Solve real engineering tasks, not just isolated questions.
  - main [ref=e51]:
    - generic [ref=e52]:
      - generic [ref=e53]:
        - button "Open navigation" [ref=e54]
        - heading "Dashboard" [level=1] [ref=e56]
      - button "Open account menu" [ref=e58]:
        - generic [ref=e59]: TD
    - generic [ref=e60]:
      - generic [ref=e61]:
        - paragraph [ref=e62]: ENGINEERING PRACTICE PLATFORM
        - heading "Learn to solve problems like a real software engineer." [level=2] [ref=e63]
        - paragraph [ref=e64]: Debug existing projects, improve code, get guided assistance and practice technical explanations.
        - button "Explore assessments" [ref=e65]
      - generic [ref=e68]:
        - generic [ref=e69]:
          - heading "Your Practice Overview" [level=3] [ref=e70]
          - paragraph [ref=e71]: Assessment statistics from Supabase
        - button "Refresh" [ref=e72]
      - generic [ref=e78]:
        - generic [ref=e79]:
          - paragraph [ref=e84]: "3"
          - paragraph [ref=e85]: Available Challenges
        - generic [ref=e86]:
          - paragraph [ref=e90]: "0"
          - paragraph [ref=e91]: Completed
        - generic [ref=e92]:
          - paragraph [ref=e96]: "0"
          - paragraph [ref=e97]: Attempts Recorded
      - generic [ref=e99]:
        - generic [ref=e105]:
          - heading "AI Assessment Generator" [level=2] [ref=e106]
          - paragraph [ref=e107]: Generate realistic debugging projects using Gemini AI.
        - generic [ref=e108]:
          - generic [ref=e109]:
            - generic [ref=e110]: Technology
            - combobox "Technology" [ref=e111]:
              - option "Java" [selected]
              - option "SQL"
              - option "React"
          - generic [ref=e112]:
            - generic [ref=e113]: Difficulty
            - combobox "Difficulty" [ref=e114]:
              - option "Beginner" [selected]
              - option "Intermediate"
              - option "Advanced"
        - button "Generate Assessment" [ref=e115]
        - paragraph [ref=e119]: AI-generated projects may contain mistakes. AI code review is available, but compilation and automated runtime tests are not yet supported.
      - generic [ref=e120]:
        - heading "Recommended assessments" [level=3] [ref=e121]
        - paragraph [ref=e122]: Start with a realistic development challenge.
      - generic [ref=e123]:
        - article [ref=e124]:
          - text: Beginner
          - paragraph [ref=e125]: Backend Development
          - heading "Debug a Java REST API" [level=4] [ref=e126]
          - paragraph [ref=e127]: Investigate a broken API, fix validation bugs and verify responses.
          - generic [ref=e128]: 45 min
          - button "View challenge" [ref=e132]
        - article [ref=e135]:
          - text: Intermediate
          - paragraph [ref=e136]: Database
          - heading "Fix a SQL Query" [level=4] [ref=e137]
          - paragraph [ref=e138]: Find incorrect joins and filtering logic in an employee database.
          - generic [ref=e139]: 30 min
          - button "View challenge" [ref=e143]
        - article [ref=e146]:
          - text: Intermediate
          - paragraph [ref=e147]: Frontend
          - heading "Frontend API Integration" [level=4] [ref=e148]
          - paragraph [ref=e149]: Repair an incomplete React application with API integration issues.
          - generic [ref=e150]: 60 min
          - button "View challenge" [ref=e154]
```