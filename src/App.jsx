import { useState, useEffect, useRef } from 'react';
import './App.css';
const { ipcRenderer } = window.require('electron');

// Simple Icons
const CogIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58a.49.49 0 0 0 .12-.61l-1.92-3.32a.488.488 0 0 0-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.484.484 0 0 0-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58a.49.49 0 0 0-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z" /></svg>
);

const PlusIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" /></svg>
);

const CloseIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" /></svg>
);

const MinimizeIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><path d="M6 19h12v2H6z" /></svg>
);

const WidgetIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24"><path d="M4 4h16v16H4V4zm2 2v12h12V6H6z" /></svg>
);

const LockIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" width="12" height="12"><path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z" /></svg>
);

// Helper to get title from text
const getNoteTitle = (note) => {
  if (note.title) return note.title;
  if (!note.content) return "Untitled";
  const lines = note.content.split('\n');
  const firstLine = lines[0].trim();
  if (!firstLine) return "Untitled";
  return firstLine.length > 15 ? firstLine.substring(0, 15) + "..." : firstLine;
};

function App() {
  const [notes, setNotes] = useState(() => {
    try {
      const saved = localStorage.getItem('jb_terminal_notes_v2');
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed.map(n => {
          // Ensure title property exists
          if (!n.title) n.title = "";
          if (n.locked === undefined) n.locked = false; // Default locked state
          if (n.content && typeof n.content === 'string' && n.content.trim().startsWith('<')) {
            const tmp = document.createElement("DIV");
            tmp.innerHTML = n.content;
            return { ...n, content: tmp.textContent || "" };
          }
          return n;
        });
      }
      return [{ id: 1, content: 'Welcome to jot.bot', title: "", locked: false }];
    } catch (e) {
      return [{ id: 1, content: 'Error loading notes.', title: "Error", locked: false }];
    }
  });

  const [currentId, setCurrentId] = useState(() => {
    const savedId = localStorage.getItem('jb_current_note_id');
    return savedId ? parseInt(savedId) : (notes[0]?.id || 1);
  });

  // Settings State
  const [showSettings, setShowSettings] = useState(false);
  const [theme, setTheme] = useState(() => localStorage.getItem('jb_theme') || 'modern');
  const [fontSize, setFontSize] = useState(() => parseInt(localStorage.getItem('jb_fontsize') || '14'));
  const [crtIntensity, setCrtIntensity] = useState(() => localStorage.getItem('jb_crt') || 'none');
  const [alwaysOnTop, setAlwaysOnTop] = useState(() => localStorage.getItem('jb_float') === 'true');
  const [tabCharLimit, setTabCharLimit] = useState(() => parseInt(localStorage.getItem('jb_tab_limit') || '10'));
  const [wordWrap, setWordWrap] = useState(() => localStorage.getItem('jb_word_wrap') !== 'false'); // Default true
  const [showLineNumbers, setShowLineNumbers] = useState(() => localStorage.getItem('jb_line_numbers') !== 'false'); // Default true
  const [isWidgetMode, setIsWidgetMode] = useState(false);

  // Tab Renaming State
  const [editingTabId, setEditingTabId] = useState(null);
  const [editTitle, setEditTitle] = useState("");

  const editInputRef = useRef(null);

  useEffect(() => {
    localStorage.setItem('jb_terminal_notes_v2', JSON.stringify(notes));
  }, [notes]);

  useEffect(() => {
    localStorage.setItem('jb_current_note_id', currentId.toString());
  }, [currentId]);

  useEffect(() => {
    localStorage.setItem('jb_theme', theme);
    localStorage.setItem('jb_fontsize', fontSize.toString());
    localStorage.setItem('jb_crt', crtIntensity);
    localStorage.setItem('jb_float', alwaysOnTop);
    localStorage.setItem('jb_tab_limit', tabCharLimit.toString());
    localStorage.setItem('jb_word_wrap', wordWrap);
    localStorage.setItem('jb_line_numbers', showLineNumbers);

    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.style.setProperty('--font-size', `${fontSize}px`);
    document.documentElement.setAttribute('data-crt', crtIntensity);

    ipcRenderer.send('set-always-on-top', alwaysOnTop);
  }, [theme, fontSize, crtIntensity, alwaysOnTop, tabCharLimit, wordWrap, showLineNumbers]);

  // Widget Mode Effect
  useEffect(() => {
    if (isWidgetMode) {
      ipcRenderer.send('resize-window', 60, 60);
      document.body.classList.add('widget-mode-active');
    } else {
      ipcRenderer.send('resize-window', 400, 500); // Default Expanded Size
      document.body.classList.remove('widget-mode-active');
    }
  }, [isWidgetMode]);

  const currentNote = notes.find(n => n.id === currentId) || notes[0];

  const updateNote = (content) => {
    setNotes(notes.map(n => n.id === currentId ? { ...n, content } : n));
  };

  const addNote = () => {
    const newId = Date.now();
    setNotes([...notes, { id: newId, content: '', title: '', locked: false }]);
    setCurrentId(newId);
  };

  const deleteNote = (id, e) => {
    e.stopPropagation();
    const noteToDelete = notes.find(n => n.id === id);
    if (noteToDelete?.locked) return; // Prevent deleting locked notes

    if (notes.length > 1) {
      const newNotes = notes.filter(n => n.id !== id);
      setNotes(newNotes);
      if (currentId === id) {
        setCurrentId(newNotes[Math.max(0, newNotes.length - 1)].id);
      }
    }
  };

  const toggleLock = (id) => {
    setNotes(notes.map(n => n.id === id ? { ...n, locked: !n.locked } : n));
  };

  // Drag and Drop Logic
  const handleDragStart = (e, index) => {
    e.dataTransfer.setData('text/plain', index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e) => {
    e.preventDefault(); // Necessary for drop to allow
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e, dropIndex) => {
    e.preventDefault();
    const dragIndex = parseInt(e.dataTransfer.getData('text/plain'));
    if (dragIndex === dropIndex) return;
    if (isNaN(dragIndex)) return;

    const newNotes = [...notes];
    const [draggedItem] = newNotes.splice(dragIndex, 1);
    newNotes.splice(dropIndex, 0, draggedItem);
    setNotes(newNotes);
  };

  const startEditingTab = (note) => {
    if (note.locked) return; // Disable renaming if locked? Or allow? Let's allow renaming.
    setEditingTabId(note.id);
    setEditTitle(note.title || getNoteTitle(note));
    setTimeout(() => editInputRef.current?.focus(), 50);
  };

  const saveTabTitle = () => {
    if (editingTabId !== null) {
      setNotes(notes.map(n => n.id === editingTabId ? { ...n, title: editTitle } : n));
      setEditingTabId(null);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') saveTabTitle();
    if (e.key === 'Escape') setEditingTabId(null);
  };

  const toggleWidgetMode = () => {
    setIsWidgetMode(!isWidgetMode);
  };

  // Helper to get displayed title with truncation
  const getDisplayTitle = (note) => {
    let title = note.title || getNoteTitle(note);
    if (title.length > tabCharLimit) {
      return title.substring(0, tabCharLimit) + "..";
    }
    return title;
  };

  // Render Widget Mode
  if (isWidgetMode) {
    return (
      <div className="widget-icon" onDoubleClick={toggleWidgetMode}>
        <div className="title-drag-region widget-drag" />
        <WidgetIcon />
      </div>
    );
  }

  // Line Numbers Logic
  const lineCount = (currentNote?.content || "").split('\n').length;
  const lines = Array.from({ length: Math.max(1, lineCount) }, (_, i) => i + 1);

  return (
    <div className="app-container">
      {/* Drag Region */}
      <div className="title-drag-region">
        <div className="app-title">jot.bot</div>
        <div className="window-controls">
          <button className="settings-btn" onClick={toggleWidgetMode} title="Minimize to Widget">
            <MinimizeIcon />
          </button>
          <button className="settings-btn nospin" onClick={() => setShowSettings(!showSettings)}>
            <CogIcon />
          </button>
        </div>
      </div>

      {/* Settings Flyout */}
      {showSettings && (
        <>
          <div className="settings-backdrop" onClick={() => setShowSettings(false)} />
          <div className="settings-flyout">
            <div className="settings-row">
              <label>Theme</label>
              <select value={theme} onChange={(e) => setTheme(e.target.value)}>
                <option value="modern">Modern Dark</option>
                <option value="green">Matrix Green</option>
                <option value="amber">Retro Amber</option>
                <option value="cyan">Cyber Blue</option>
              </select>
            </div>
            <div className="settings-row">
              <label>Size</label>
              <input
                type="range" min="10" max="32"
                value={fontSize} onChange={(e) => setFontSize(parseInt(e.target.value))}
              />
              <span>{fontSize}px</span>
            </div>
            <div className="settings-row">
              <label>Tab Len</label>
              <input
                type="number" min="1" max="50"
                value={tabCharLimit} onChange={(e) => setTabCharLimit(parseInt(e.target.value) || 10)}
                style={{ width: '40px' }}
              />
            </div>
            <div className="settings-row">
              <label>Wrap</label>
              <input type="checkbox" checked={wordWrap} onChange={(e) => setWordWrap(e.target.checked)} />
            </div>
            <div className="settings-row">
              <label>Line #</label>
              <input type="checkbox" checked={showLineNumbers} onChange={(e) => setShowLineNumbers(e.target.checked)} />
            </div>
            <div className="settings-row">
              <label>Float</label>
              <input type="checkbox" checked={alwaysOnTop} onChange={(e) => setAlwaysOnTop(e.target.checked)} />
            </div>
            <div className="settings-row">
              <label>CRT</label>
              <select value={crtIntensity} onChange={(e) => setCrtIntensity(e.target.value)}>
                <option value="none">Off</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
          </div>
        </>
      )}

      {/* Main Editor Area */}
      <div className="editor-area">
        {showLineNumbers && (
          <div className="line-numbers">
            {lines.map(l => <div key={l}>{l}</div>)}
          </div>
        )}
        <textarea
          className="main-textarea"
          value={currentNote?.content || ""}
          onChange={(e) => updateNote(e.target.value)}
          spellCheck="false"
          autoFocus
          style={{ whiteSpace: wordWrap ? 'pre-wrap' : 'pre' }}
        />
      </div>

      {/* Bottom Tabs */}
      <div className="bottom-tabs">
        <div className="tabs-scroll-area">
          {notes.map((note, index) => (
            <div
              key={note.id}
              className={`tab ${note.id === currentId ? 'active' : ''} ${note.locked ? 'locked' : ''}`}
              onClick={() => setCurrentId(note.id)}
              onDoubleClick={() => startEditingTab(note)}
              onContextMenu={(e) => { e.preventDefault(); toggleLock(note.id); }}
              draggable
              onDragStart={(e) => handleDragStart(e, index)}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, index)}
              title={note.locked ? "Right-click to unlock" : "Right-click to lock"}
            >
              {editingTabId === note.id ? (
                <input
                  ref={editInputRef}
                  className="tab-edit-input"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  onBlur={saveTabTitle}
                  onKeyDown={handleKeyDown}
                />
              ) : (
                <span className="tab-title">{getDisplayTitle(note)}</span>
              )}

              {/* Show Lock Icon if locked, otherwise Close Icon (if > 1 note) */}
              {note.locked ? (
                <span className="tab-icon lock-icon">
                  <LockIcon />
                </span>
              ) : (
                notes.length > 1 && editingTabId !== note.id && (
                  <span className="tab-icon tab-close" onClick={(e) => deleteNote(note.id, e)}>
                    <CloseIcon />
                  </span>
                )
              )}
            </div>
          ))}
        </div>
        <div className="tab add-tab" onClick={addNote}>
          <PlusIcon />
        </div>
      </div>

      <div className="crt-overlay"></div>
    </div>
  );
}

export default App;
