import React, { useState, useEffect } from "react";
import "./App.css";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

// Monaco Editor
import Editor from "@monaco-editor/react";

// Diff library
import { diffLines } from "diff";

// Base64 decoder
import atob from "atob";

// --------------------------------------------------
// CUSTOM DIFF VIEWER (SIDE BY SIDE)
// --------------------------------------------------

function renderDiff(original, fixed) {
  const diffs = diffLines(original, fixed);

  return (
    <div className="diff-container">
      {/* LEFT PANEL — ORIGINAL */}
      <div className="diff-panel">
        {diffs.map((part, i) => (
          <pre
            key={i}
            className={
              part.removed
                ? "diff-line-removed"
                : "diff-line-normal"
            }
          >
            {part.removed ? part.value : !part.added ? part.value : ""}
          </pre>
        ))}
      </div>

      {/* RIGHT PANEL — FIXED */}
      <div className="diff-panel">
        {diffs.map((part, i) => (
          <pre
            key={i}
            className={
              part.added
                ? "diff-line-added"
                : "diff-line-normal"
            }
          >
            {part.added ? part.value : !part.removed ? part.value : ""}
          </pre>
        ))}
      </div>
    </div>
  );
}

// --------------------------------------------------
// MAIN DASHBOARD
// --------------------------------------------------

function UserDashboard({ token }) {
  const [userData, setUserData] = useState(null);
  const [repos, setRepos] = useState([]);
  const [repoFiles, setRepoFiles] = useState([]);
  const [selectedRepo, setSelectedRepo] = useState(null);

  const [selectedFile, setSelectedFile] = useState(null);
  const [fileContent, setFileContent] = useState("");

  const [analysisResult, setAnalysisResult] = useState("");
  const [fixedCode, setFixedCode] = useState("");

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [currentPath, setCurrentPath] = useState("");

  const [leftWidth, setLeftWidth] = useState(50);
  const [isDragging, setIsDragging] = useState(false);

  const [editor, setEditor] = useState(null);
  const [monacoInstance, setMonacoInstance] = useState(null);

  const startDrag = () => setIsDragging(true);
  const stopDrag = () => setIsDragging(false);

  const handleDrag = (e) => {
    if (!isDragging) return;
    const container = document.getElementById("resize-container");
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const x = e.clientX - rect.left;
    let newWidth = (x / rect.width) * 100;

    if (newWidth < 15) newWidth = 15;
    if (newWidth > 85) newWidth = 85;

    setLeftWidth(newWidth);
  };

  // --------------------------------------------------
  // FETCH USER + REPOS
  // --------------------------------------------------

  useEffect(() => {
    async function fetchData() {
      try {
        const userResponse = await fetch("https://api.github.com/user", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const userJson = await userResponse.json();
        setUserData(userJson);

        const repoResponse = await fetch("https://api.github.com/user/repos", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const repoJson = await repoResponse.json();
        setRepos(repoJson);
      } catch (err) {
        console.error("GitHub fetch error:", err);
      }
    }
    fetchData();
  }, [token]);

  // --------------------------------------------------
  // WEBSOCKET
  // --------------------------------------------------

  useEffect(() => {
    const ws = new WebSocket("ws://localhost:8000/ws/analysis/");

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.type === "analysis_result") {
        setAnalysisResult(data.message);
        setIsAnalyzing(false);
      }

      if (data.type === "fix_result") {
        setFixedCode(data.message);
        setIsAnalyzing(false);
      }
    };

    return () => ws.close();
  }, []);

  // --------------------------------------------------
  // NAVIGATION
  // --------------------------------------------------

  const onRepoClick = async (repoName) => {
    setSelectedRepo(repoName);
    setCurrentPath("");

    const res = await fetch(
      `https://api.github.com/repos/${userData.login}/${repoName}/contents/`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    setRepoFiles(await res.json());
  };

  const onFileClick = async (file) => {
    if (file.type === "dir") {
      const newPath = currentPath ? `${currentPath}/${file.name}` : file.name;
      setCurrentPath(newPath);

      const res = await fetch(
        `https://api.github.com/repos/${userData.login}/${selectedRepo}/contents/${newPath}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setRepoFiles(await res.json());
      return;
    }

    setSelectedFile(file);
    const res = await fetch(file.url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const json = await res.json();
    setFileContent(atob(json.content));
  };

  // --------------------------------------------------
  // ANALYZE FILE
  // --------------------------------------------------

  const handleAnalyzeClick = async () => {
    setAnalysisResult("");
    setFixedCode("");
    setIsAnalyzing(true);

    await fetch("http://127.0.0.1:8000/api/analyze/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: fileContent }),
    });
  };

  // --------------------------------------------------
  // AUTO FIX FILE
  // --------------------------------------------------

  const handleFixClick = async () => {
    setFixedCode("");
    setIsAnalyzing(true);

    await fetch("http://127.0.0.1:8000/api/fix-file/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: fileContent }),
    });
  };

  // --------------------------------------------------
  // INLINE ISSUE PARSER
  // --------------------------------------------------

  function extractInlineIssues(text) {
    const regex = /Line\s+(\d+):\s+(.*)/g;
    let match;
    const issues = [];

    while ((match = regex.exec(text)) !== null) {
      issues.push({
        line: parseInt(match[1]),
        message: match[2],
      });
    }
    return issues;
  }

  // --------------------------------------------------
  // APPLY MONACO DECORATIONS
  // --------------------------------------------------

  useEffect(() => {
    if (!analysisResult || !editor || !monacoInstance) return;

    const issues = extractInlineIssues(analysisResult);

    const decorations = issues.map((issue) => ({
      range: new monacoInstance.Range(issue.line, 1, issue.line, 1),
      options: {
        isWholeLine: true,
        className: "line-error-decoration",
        hoverMessage: { value: issue.message },
      },
    }));

    editor.deltaDecorations([], decorations);
  }, [analysisResult, editor, monacoInstance]);

  const handleEditorMount = (editorObj, monaco) => {
    setEditor(editorObj);
    setMonacoInstance(monaco);
  };

  // --------------------------------------------------
  // RENDER FILE VIEW
  // --------------------------------------------------

  if (!userData) return <p>Loading...</p>;

  if (selectedFile) {
    const explanation = analysisResult.replace(/```[\s\S]*?```/g, "").trim();
    const showPanel = isAnalyzing || analysisResult || fixedCode;

    return (
      <div style={{ width: "95%", textAlign: "left" }}>
        <button onClick={() => setSelectedFile(null)}>&larr; Back</button>
        <h3>{selectedFile.name}</h3>

        <button
          onClick={handleAnalyzeClick}
          disabled={isAnalyzing}
          style={{ marginRight: 10 }}
        >
          {isAnalyzing ? "Analyzing…" : "Analyze File"}
        </button>

        <button
          onClick={handleFixClick}
          disabled={isAnalyzing}
          style={{ background: "#0d6efd", color: "white" }}
        >
          ✨ Auto-Fix File
        </button>

        <div
          id="resize-container"
          onMouseMove={handleDrag}
          onMouseUp={stopDrag}
          style={{
            display: "flex",
            height: "80vh",
            border: "1px solid #333",
            marginTop: 20,
            userSelect: isDragging ? "none" : "auto",
          }}
        >
          {/* LEFT PANEL */}
          <div
            style={{
              width: `${leftWidth}%`,
              background: "#1e1e1e",
              overflow: "hidden",
              borderRight: "3px solid #666",
            }}
          >
            {fixedCode
              ? renderDiff(fileContent, fixedCode)
              : (
                <Editor
                  height="100%"
                  defaultLanguage="python"
                  value={fileContent}
                  theme="vs-dark"
                  onMount={handleEditorMount}
                />
              )}
          </div>

          {/* DRAG BAR */}
          <div
            onMouseDown={startDrag}
            style={{
              width: 6,
              cursor: "col-resize",
              background: "#888",
            }}
          />

          {/* RIGHT PANEL */}
          <div
            style={{
              flex: 1,
              background: "#0f5132",
              padding: 10,
              overflow: "auto",
              display: showPanel ? "block" : "none",
              color: "white",
            }}
          >
            <h4>AI Result</h4>

            {isAnalyzing && <p>Working...</p>}

            {analysisResult && (
              <>
                <h4>Explanation</h4>
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {explanation}
                </ReactMarkdown>
                <hr />
              </>
            )}

            {fixedCode && (
              <>
                <h4>Auto-Fix Applied 🎉</h4>
                <p>See the changes in the left panel.</p>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  // --------------------------------------------------
  // FILE LIST VIEW
  // --------------------------------------------------

  if (selectedRepo) {
    return (
      <div style={{ width: "80%", textAlign: "left" }}>
        <button onClick={() => setSelectedRepo(null)}>&larr; Back</button>
        <h3>{selectedRepo}</h3>

        <ul style={{ listStyle: "none", padding: 0 }}>
          {repoFiles.map((f) => (
            <li
              key={f.sha}
              onClick={() => onFileClick(f)}
              style={{
                cursor: "pointer",
                background: "#333",
                padding: 10,
                borderRadius: 5,
                margin: 5,
              }}
            >
              {f.type === "dir" ? "📁" : "📄"} {f.name}
            </li>
          ))}
        </ul>
      </div>
    );
  }

  // --------------------------------------------------
  // REPO LIST VIEW
  // --------------------------------------------------

  return (
    <div style={{ width: "80%", textAlign: "left" }}>
      <h2>Welcome, {userData.login}</h2>
      <h3>Your Repositories</h3>

      <ul style={{ listStyle: "none", padding: 0 }}>
        {repos.map((repo) => (
          <li
            key={repo.id}
            onClick={() => onRepoClick(repo.name)}
            style={{
              cursor: "pointer",
              background: "#333",
              padding: 10,
              borderRadius: 5,
              margin: 5,
            }}
          >
            {repo.name}
          </li>
        ))}
      </ul>
    </div>
  );
}

// --------------------------------------------------
// LOGIN
// --------------------------------------------------

function Login() {
  const [clientId, setClientId] = useState("");

  useEffect(() => {
    fetch("http://127.0.0.1:8000/api/auth/github/login/")
      .then((res) => res.json())
      .then((data) => setClientId(data.client_id));
  }, []);

  const url = `https://github.com/login/oauth/authorize?client_id=${clientId}&scope=read:user%20repo`;

  return (
    <div>
      <h1>CodeSentry</h1>
      {clientId ? (
        <a className="github-login-button" href={url}>
          Login with GitHub
        </a>
      ) : (
        <p>Loading…</p>
      )}
    </div>
  );
}

// --------------------------------------------------
// MAIN APP
// --------------------------------------------------

function App() {
  const [token, setToken] = useState(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const t = params.get("token");

    if (t) {
      setToken(t);
      localStorage.setItem("githubToken", t);
      window.history.replaceState({}, document.title, window.location.pathname);
    } else {
      const saved = localStorage.getItem("githubToken");
      if (saved) setToken(saved);
    }
  }, []);

  return (
    <div className="App">
      <header className="App-header">
        {token ? <UserDashboard token={token} /> : <Login />}
      </header>
    </div>
  );
}

export default App;
