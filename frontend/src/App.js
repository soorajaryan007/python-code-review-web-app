import React, { useState, useEffect } from "react";
import "./App.css";

// Code syntax highlighting
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";

// Markdown → React renderer
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

// Highlighting for AI-generated code blocks
import { Prism as SyntaxAI } from "react-syntax-highlighter";
import { vscDarkPlus as aiTheme } from "react-syntax-highlighter/dist/esm/styles/prism";

// GitHub file content base64 decoding
import atob from "atob";

// --------------------------------------------------
// MAIN USER DASHBOARD
// --------------------------------------------------

function UserDashboard({ token }) {
  const [userData, setUserData] = useState(null);
  const [repos, setRepos] = useState([]);
  const [repoFiles, setRepoFiles] = useState([]);
  const [selectedRepo, setSelectedRepo] = useState(null);

  const [selectedFile, setSelectedFile] = useState(null);
  const [fileContent, setFileContent] = useState("");

  const [analysisResult, setAnalysisResult] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const [currentPath, setCurrentPath] = useState("");

  // ---------------------------
  // FETCH USER + REPOS
  // ---------------------------
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

  // ---------------------------
  // SETUP WEBSOCKET
  // ---------------------------
  useEffect(() => {
    const ws = new WebSocket("ws://localhost:8000/ws/analysis/");

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === "analysis_result") {
        setAnalysisResult(data.message);
        setIsAnalyzing(false);
      }
    };

    return () => ws.close();
  }, []);

  // --------------------------------------------------
  // GITHUB FILE + FOLDER NAVIGATION
  // --------------------------------------------------

  const onRepoClick = async (repoName) => {
    setSelectedRepo(repoName);
    setCurrentPath("");

    const res = await fetch(
      `https://api.github.com/repos/${userData.login}/${repoName}/contents/`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const json = await res.json();
    setRepoFiles(json);
  };

  const onFileClick = async (file) => {
    if (file.type === "dir") {
      const newPath = currentPath ? `${currentPath}/${file.name}` : file.name;
      setCurrentPath(newPath);

      const res = await fetch(
        `https://api.github.com/repos/${userData.login}/${selectedRepo}/contents/${newPath}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const json = await res.json();
      setRepoFiles(json);
      return;
    }

    // Load file content
    setSelectedFile(file);
    const res = await fetch(file.url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const json = await res.json();
    setFileContent(atob(json.content));
  };

  // --------------------------------------------------
  // AI ANALYSIS (HTTP + WebSocket result)
  // --------------------------------------------------

  const handleAnalyzeClick = async () => {
    setAnalysisResult("");
    setIsAnalyzing(true);

    const res = await fetch("http://127.0.0.1:8000/api/analyze/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: fileContent }),
    });

    const data = await res.json();

    if (res.status !== 202) {
      alert(data.error);
      setIsAnalyzing(false);
    }
  };

  // --------------------------------------------------
  // PARSE AI MARKDOWN → extract code blocks
  // --------------------------------------------------

  function extractCodeBlocks(markdown) {
    const regex = /```(\w+)?\n([\s\S]*?)```/g;
    let match;
    const result = [];

    while ((match = regex.exec(markdown)) !== null) {
      result.push({
        language: match[1] || "text",
        code: match[2],
      });
    }
    return result;
  }

  // --------------------------------------------------
  // UI SECTIONS
  // --------------------------------------------------

  if (!userData) return <p>Loading...</p>;

  // ---------------------------
  // FILE VIEW + ANALYSIS PANEL
  // ---------------------------
  if (selectedFile) {
    const showPanel = isAnalyzing || analysisResult;
    const codeBlocks = extractCodeBlocks(analysisResult);
    const explanation = analysisResult.replace(/```[\s\S]*?```/g, "").trim();

    return (
      <div style={{ width: "95%", textAlign: "left" }}>
        <button onClick={() => setSelectedFile(null)}>&larr; Back</button>
        <h3>{selectedFile.name}</h3>

        <button
          onClick={handleAnalyzeClick}
          disabled={isAnalyzing}
          style={{ margin: "10px 0" }}
        >
          {isAnalyzing ? "Analyzing..." : "Analyze File"}
        </button>

        {/* GRID */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "20px",
            marginTop: "20px",
          }}
        >
          {/* LEFT — CODE */}
          <div
            style={{
              background: "#1e1e1e",
              padding: 10,
              borderRadius: 8,
              maxHeight: "80vh",
              overflow: "auto",
            }}
          >
            <h4>Code</h4>
            <SyntaxHighlighter
              language="python"
              style={vscDarkPlus}
              showLineNumbers
            >
              {fileContent}
            </SyntaxHighlighter>
          </div>

          {/* RIGHT — AI RESULT */}
          <div
            style={{
              background: "#0f5132",
              padding: 10,
              borderRadius: 8,
              maxHeight: "80vh",
              overflow: "auto",
              display: showPanel ? "block" : "none",
              color: "white",
            }}
          >
            <h4>AI Result</h4>

            {isAnalyzing && <p>Waiting for analysis…</p>}

            {analysisResult && (
              <div>
                {/* Explanation */}
                <h4>Explanation</h4>
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {explanation}
                </ReactMarkdown>

                <button
                  onClick={() => navigator.clipboard.writeText(explanation)}
                  style={{ marginBottom: 20 }}
                >
                  Copy Explanation
                </button>

                <hr />

                {/* Code Blocks */}
                {codeBlocks.map((block, i) => (
                  <div key={i} style={{ marginBottom: 20 }}>
                    <SyntaxAI style={aiTheme} language={block.language}>
                      {block.code}
                    </SyntaxAI>

                    <button
                      onClick={() => navigator.clipboard.writeText(block.code)}
                      style={{ marginTop: 5 }}
                    >
                      Copy Code
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ---------------------------
  // FILE LIST VIEW
  // ---------------------------
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

  // ---------------------------
  // REPO LIST VIEW
  // ---------------------------
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
// LOGIN COMPONENT
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
// MAIN APP WRAPPER
// --------------------------------------------------

function App() {
  const [token, setToken] = useState(null);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const t = urlParams.get("token");

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
