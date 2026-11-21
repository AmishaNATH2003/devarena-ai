
// Built-in DevArena AI debugging assignments.
//
// These fixtures contain deliberately broken code.
// The candidate must fix the required problems.
//
// NOTE:
// Source checks inspect code patterns only.
// They do not execute, compile, or test the project.

const withoutComments = (source = "") =>
  String(source)
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*(?:\/\/|--).*$/gm, "");

// Extract a submitted file without standalone comments.
const fileText = (files, name) =>
  withoutComments(files?.[name] || "");

export const challenges = {
  // ----------------------------------------
  // ASSESSMENT 1: JAVA REST API DEBUGGING
  // ----------------------------------------
  1: {
    language: "java",

    startingFile: "UserService.java",

    description:
      "Fix ID validation and missing-user behavior in this Spring Boot service.",

    instructions: [
      "Reject IDs that are zero or negative.",
      "Return HTTP 404 when the repository cannot find a user.",
      "Avoid returning null for a missing user.",
    ],

    files: {
      "UserController.java": `import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/users")
public class UserController {
    private final UserService service;

    public UserController(UserService service) {
        this.service = service;
    }

    @GetMapping("/{id}")
    public ResponseEntity<User> getUser(@PathVariable int id) {
        User user = service.findById(id);
        return ResponseEntity.ok(user);
    }
}`,

      "UserService.java": `import org.springframework.stereotype.Service;

@Service
public class UserService {
    private final UserRepository repository;

    public UserService(UserRepository repository) {
        this.repository = repository;
    }

    public User findById(int id) {
        if (id < 0) {
            throw new IllegalArgumentException("Invalid ID");
        }

        // BUG: Missing users should produce HTTP 404.
        return null;
    }
}`,

      "UserServiceTest.java": `// Acceptance criteria (illustrative; tests are not executed here):
// id = 0 or a negative value -> validation error
// Existing ID -> corresponding user
// Unknown positive ID -> HTTP 404 Not Found`,
    },

    checks: [
      {
        name: "Reject zero and negative IDs",

        hint:
          "Change the validation to id <= 0 in UserService.java.",

        check: (files) => {
          const src = fileText(
            files,
            "UserService.java"
          );

          return /\bid\s*<=\s*0\b/.test(src);
        },
      },

      {
        name: "Return HTTP 404 for missing users",

        hint:
          "Use ResponseStatusException with HttpStatus.NOT_FOUND.",

        check: (files) => {
          const src = fileText(
            files,
            "UserService.java"
          );

          return (
            /new\s+ResponseStatusException\s*\(/.test(
              src
            ) &&
            /HttpStatus\.NOT_FOUND/.test(src)
          );
        },
      },

      {
        name: "Look up users instead of returning null",

        hint:
          "Use repository.findById(id).orElseThrow(...) to retrieve the user or throw 404.",

        check: (files) => {
          const src = fileText(
            files,
            "UserService.java"
          );

          return (
            /repository\.findById\s*\(\s*id\s*\)/.test(
              src
            ) &&
            /\.orElseThrow\s*\(/.test(src) &&
            !/return\s+null\s*;/.test(src)
          );
        },
      },
    ],
  },

  // ----------------------------------------
  // ASSESSMENT 2: SQL QUERY DEBUGGING
  // ----------------------------------------
  2: {
    language: "sql",

    startingFile: "report.sql",

    description:
      "Repair the employee report query so it returns active employees and their departments in salary order.",

    instructions: [
      "Join employees.department_id to departments.id.",
      "Include only active employees (status = 'active').",
      "Sort by salary from highest to lowest.",
    ],

    files: {
      "schema.sql": `CREATE TABLE departments (
  id INTEGER PRIMARY KEY,
  name VARCHAR(100) NOT NULL
);

CREATE TABLE employees (
  id INTEGER PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  department_id INTEGER,
  status VARCHAR(20) NOT NULL,
  salary INTEGER NOT NULL
);`,

      "sample-data.sql": `INSERT INTO departments VALUES (1, 'Engineering'), (2, 'Support');

INSERT INTO employees VALUES
  (101, 'Asha', 1, 'active', 80000),
  (102, 'Ravi', 2, 'inactive', 50000),
  (103, 'Neha', 1, 'active', 95000);

-- Expected result: Neha (95000), Asha (80000).`,

      "report.sql": `SELECT e.name, d.name AS department, e.salary
FROM employees e
JOIN departments d ON e.id = d.id
WHERE e.status = 'inactive'
ORDER BY e.salary ASC;`,
    },

    checks: [
      {
        name: "Fix the department JOIN",

        hint:
          "The foreign key is e.department_id and the department primary key is d.id.",

        check: (files) => {
          const src = fileText(
            files,
            "report.sql"
          );

          return /\bJOIN\s+departments\s+(?:AS\s+)?d\s+ON\s+e\.department_id\s*=\s*d\.id\b/i.test(
            src
          );
        },
      },

      {
        name: "Filter to active employees",

        hint:
          "Use WHERE e.status = 'active'.",

        check: (files) => {
          const src = fileText(
            files,
            "report.sql"
          );

          return /\bWHERE\s+e\.status\s*=\s*'active'/i.test(
            src
          );
        },
      },

      {
        name: "Show the highest salaries first",

        hint:
          "Use ORDER BY e.salary DESC.",

        check: (files) => {
          const src = fileText(
            files,
            "report.sql"
          );

          return /\bORDER\s+BY\s+e\.salary\s+DESC\b/i.test(
            src
          );
        },
      },
    ],
  },

  // ----------------------------------------
  // ASSESSMENT 3: REACT API DEBUGGING
  // ----------------------------------------
  3: {
    language: "javascript",

    startingFile: "Users.jsx",

    description:
      "Fix the React user list's asynchronous request, HTTP error handling and loading state.",

    instructions: [
      "Await the fetch call so response is a real Response object.",
      "Check response.ok and throw an error for failed HTTP requests.",
      "Ensure loading is turned off in a finally block.",
    ],

    files: {
      "Users.jsx": `import { useEffect, useState } from "react";

export default function Users() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadUsers() {
      try {
        const response = fetch("/api/users"); // BUG: not awaited
        const data = await response.json();
        setUsers(data);
      } catch (err) {
        setError(err.message);
      }
      // BUG: loading remains true after success or failure.
    }

    loadUsers();
  }, []);

  if (loading) return <p>Loading users...</p>;
  if (error) return <p role="alert">{error}</p>;

  return (
    <ul>
      {users.map((user) => (
        <li key={user.id}>{user.name}</li>
      ))}
    </ul>
  );
}`,

      "README.md": `# Frontend API Integration

The API returns a JSON array of users with id and name fields.

An HTTP error may occur.

The UI should show either users, an error,
or a loading message.

Fix Users.jsx; this is a static source-check exercise.`,
    },

    checks: [
      {
        name: "Await the API request",

        hint:
          "Assign await fetch(...) to response.",

        check: (files) => {
          const src = fileText(
            files,
            "Users.jsx"
          );

          return /\b(?:const|let)\s+response\s*=\s*await\s+fetch\s*\(/.test(
            src
          );
        },
      },

      {
        name: "Handle unsuccessful HTTP responses",

        hint:
          "Check !response.ok and throw a new Error for HTTP failures.",

        check: (files) => {
          const src = fileText(
            files,
            "Users.jsx"
          );

          return (
            /if\s*\(\s*!\s*response\.ok\s*\)/.test(
              src
            ) &&
            /throw\s+new\s+Error\s*\(/.test(src)
          );
        },
      },

      {
        name: "Always clear the loading state",

        hint:
          "Place setLoading(false) inside a finally block.",

        check: (files) => {
          const src = fileText(
            files,
            "Users.jsx"
          );

          return /finally\s*\{[\s\S]*?setLoading\s*\(\s*false\s*\)/.test(
            src
          );
        },
      },
    ],
  },
};
