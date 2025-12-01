import React, { useState, useEffect } from 'react';
import './App.css';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import atob from 'atob';

// --- UserDashboard Component ---
// This is the main view after login
function UserDashboard({ token }) {
  const [userData, setUserData] = useState(null);
  const [repos, setRepos] = useState([]);
  const [loading, setLoading] = useState(true);

  const [selectedRepo, setSelectedRepo] = useState(null);
  const [repoFiles, setRepoFiles] = useState([]);
  const [loadingFiles, setLoadingFiles] = useState(false);

  const [selectedFile, setSelectedFile] = useState(null);
  const [fileContent, setFileContent] = useState('');
  const [loadingFileContent, setLoadingFileContent] = useState(false);

  const [analysisResult, setAnalysisResult] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Effect to fetch user and repo data
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const userResponse = await fetch('https://api.github.com/user', {
          headers: { Authorization: `Bearer ${token}` }
        });
        const userData = await userResponse.json();
        setUserData(userData);
        const repoResponse = await fetch('https://api.github.com/user/repos', {
          headers: { Authorization: `Bearer ${token}` }
        });
        const repoData = await repoResponse.json();
        setRepos(repoData);
      } catch (error) { console.error('Error fetching data:', error); }
      setLoading(false);
    };
    fetchData();
  }, [token]);

  // Effect to set up WebSocket
  useEffect(() => {
    const ws = new WebSocket('ws://localhost:8000/ws/analysis/');
    ws.onopen = () => console.log('WebSocket connected!');
    ws.onclose = () => console.log('WebSocket disconnected.');

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'analysis_result') {
        setAnalysisResult(data.message);
        setIsAnalyzing(false);
      }
    };

    return () => ws.close();
  }, []); // The empty [] means this runs only once

  // --- Click Handlers ---

  const onRepoClick = async (repoName) => {
    setLoadingFiles(true);
    setSelectedRepo(repoName);
    try {
      // Fetches the root directory of the repo
      const contentsResponse = await fetch(
        `https://api.github.com/repos/${userData.login}/${repoName}/contents/`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const contentsData = await contentsResponse.json();
      setRepoFiles(contentsData);
    } catch (error) { console.error('Error fetching repo contents:', error); }
    setLoadingFiles(false);
  };

  const onFileClick = async (file) => {
    if (file.type === 'dir') {
      alert("Directory navigation not implemented yet.");
      return;
    }
    setLoadingFileContent(true);
    setSelectedFile(file);
    try {
      // Fetches the specific file's content
      const fileResponse = await fetch(file.url, {
         headers: { Authorization: `Bearer ${token}` }
      });
      const fileData = await fileResponse.json();
      // Content from GitHub API is base64 encoded, so we must decode it
      const decodedContent = atob(fileData.content);
      setFileContent(decodedContent);
    } catch (error) { console.error('Error fetching file content:', error); }
    setLoadingFileContent(false);
  };

  const handleBackToRepos = () => {
    setSelectedRepo(null);
    setRepoFiles([]);
  };

  const handleBackToFiles = () => {
    setSelectedFile(null);
    setFileContent('');
    setAnalysisResult(''); // Clear analysis on back
  };

  const handleAnalyzeClick = async () => {
    setAnalysisResult('');
    setIsAnalyzing(true);
    try {
      // Call our Django backend to start the task
      const response = await fetch('http://127.0.0.1:8000/api/analyze/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: fileContent })
      });
      const data = await response.json();
      if (response.status !== 202) { // 202 Accepted
        alert(`Error: ${data.error}`);
        setIsAnalyzing(false);
      }
      // If successful (202), we just wait. The WebSocket will deliver the result.
    } catch (error) {
      console.error('Error starting analysis:', error);
      alert('Failed to start analysis.');
      setIsAnalyzing(false);
    }
  };

  // --- Render Logic ---

  if (loading) {
    return <p>Loading dashboard...</p>;
  }


// Render State 3: A file is selected


const showAnalysisPanel = () => {
  return isAnalyzing || analysisResult;
};
if (selectedFile) {
  return (
    <div style={{ textAlign: 'left', width: '95%' }}>
      <button onClick={handleBackToFiles} style={{ marginBottom: '10px' }}>
        &larr; Back to Files
      </button>

      <h3>{selectedFile.name}</h3>

      {/* ANALYZE BUTTON */}
      <button
        onClick={handleAnalyzeClick}
        disabled={isAnalyzing}
        style={{
          marginBottom: '10px',
          background: '#007bff',
          color: 'white',
          padding: '8px',
          border: 'none',
          borderRadius: '5px'
        }}
      >
        {isAnalyzing ? 'Analyzing...' : 'Analyze File'}
      </button>

      {/* --- NEW GRID LAYOUT --- */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '20px',
          marginTop: '20px'
        }}
      >

        {/* LEFT PANEL — CODE */}
        <div
          style={{
            background: '#1e1e1e',
            padding: '10px',
            borderRadius: '8px',
            overflowY: 'auto',
            maxHeight: '80vh'
          }}
        >
          <h4 style={{ color: '#ccc' }}>Code</h4>
          <SyntaxHighlighter
            language="python"
            style={vscDarkPlus}
            showLineNumbers
          >
            {fileContent}
          </SyntaxHighlighter>
        </div>

        {/* RIGHT PANEL — AI RESULT */}
        <div
          style={{
            background: '#0f5132',
            padding: '10px',
            borderRadius: '8px',
            color: 'white',
            overflowY: 'auto',
            maxHeight: '80vh',
            display: showAnalysisPanel() ? 'block' : 'none'
          }}
        >
          <h4>AI Result</h4>

          {isAnalyzing && (
            <div style={{ padding: '10px', background: '#333', borderRadius: '5px' }}>
              <p>Waiting for analysis...</p>
            </div>
          )}

          {analysisResult && (
            <div
              style={{
                background: '#198754',
                padding: '10px',
                borderRadius: '6px',
                marginTop: '10px'
              }}
            >
              {analysisResult}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


  // Render State 2: A repo is selected
  if (selectedRepo) {
    return (
      <div style={{ textAlign: 'left', width: '80%' }}>
        <button onClick={handleBackToRepos} style={{ marginBottom: '10px' }}>&larr; Back to Repos</button>
        <h3>{selectedRepo}</h3>
        {loadingFiles ? (
          <p>Loading files...</p>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0, cursor: 'pointer' }}>
            {repoFiles.map(file => (
              <li
                key={file.sha}
                onClick={() => onFileClick(file)}
                style={{ background: '#333', margin: '5px', padding: '10px', borderRadius: '5px', transition: 'background 0.2s' }}
                onMouseOver={e => e.currentTarget.style.background = '#555'}
                onMouseOut={e => e.currentTarget.style.background = '#333'}
              >
                {file.type === 'dir' ? '📁' : '📄'} {file.name}
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  // Render State 1: No repo selected (the repo list)
  return (
    <div style={{ textAlign: 'left', width: '80%' }}>
      <h2>Welcome, {userData.login}!</h2>
      <div>
        <h3>Your Repositories</h3>
        <ul style={{ listStyle: 'none', padding: 0, cursor: 'pointer' }}>
          {repos.map(repo => (
            <li
              key={repo.id}
              onClick={() => onRepoClick(repo.name)}
              style={{ background: '#333', margin: '5px', padding: '10px', borderRadius: '5px', transition: 'background 0.2s' }}
              onMouseOver={e => e.currentTarget.style.background = '#555'}
              onMouseOut={e => e.currentTarget.style.background = '#333'}
            >
              {repo.name}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}


// --- Login Component ---
// This is the view before login
function Login() {
  const [clientId, setClientId] = useState('');

  useEffect(() => {
    // Fetches the GitHub Client ID from our backend
    const fetchClientId = async () => {
      try {
        const response = await fetch('http://127.0.0.1:8000/api/auth/github/login/');
        const data = await response.json();
        setClientId(data.client_id);
      } catch (error) {
        console.error('Error fetching Client ID:', error);
      }
    };
    fetchClientId();
  }, []);

  const githubLoginUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&scope=read:user%20repo`;

  return (
    <div>
      <h1>CodeSentry</h1>
      {clientId ? (
        <a className="github-login-button" href={githubLoginUrl}>
          Login with GitHub
        </a>
      ) : (
        <p>Loading...</p>
      )}
    </div>
  );
}

// --- App Component (Main) ---
// This component decides whether to show Login or UserDashboard
// --- THIS IS THE FIXED App FUNCTION ---
function App() {
  const [token, setToken] = useState(null);

  useEffect(() => {
    // Check if a token is in the URL (from the OAuth redirect)
    const urlParams = new URLSearchParams(window.location.search);
    const tokenFromUrl = urlParams.get('token');

    if (tokenFromUrl) {
      setToken(tokenFromUrl);
      localStorage.setItem('githubToken', tokenFromUrl);
      // Clean the URL so the token isn't visible
      window.history.replaceState({}, document.title, window.location.pathname);
    } else {
      // If no token in URL, check if one is saved in localStorage
      const storedToken = localStorage.getItem('githubToken');
      if (storedToken) {
        setToken(storedToken);
      }
    }
  }, []);

  return (
    <div className="App">
      <header className="App-header">
        {token ? <UserDashboard token={token} /> : <Login />}
      </header> {/* <-- Corrected closing tag --> */}
    </div>
  );
}

// --- Styles ---
// We inject these styles directly into the head for simplicity
const styles = `
.github-login-button {
  background-color: #24292e;
  color: white;
  padding: 12px 20px;
  text-decoration: none;
  font-weight: bold;
  border-radius: 6px;
  font-size: 1.1em;
  transition: background-color 0.2s;
}
.github-login-button:hover {
  background-color: #444;
}
`;
const styleSheet = document.createElement("style");
styleSheet.type = "text/css";
styleSheet.innerText = styles;
document.head.appendChild(styleSheet);

export default App;