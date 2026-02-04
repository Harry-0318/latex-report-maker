import React, { useState, useEffect } from 'react';
import TextCell from './components/TextCell';
import CodeCell from './components/CodeCell';
import ImageCell from './components/ImageCell';
import { saveToStorage, loadFromStorage } from './utils/storage';
import './index.css';

function App() {
  const [title, setTitle] = useState("My Lab Report");
  const [author, setAuthor] = useState("Student Name");
  // State: [{ id, title, subsections: [{ id, title, cells: [] }] }]
  const [sections, setSections] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from storage on mount
  useEffect(() => {
    async function load() {
      const data = await loadFromStorage();
      if (data) {
        setTitle(data.title);
        setAuthor(data.author);
        setSections(data.sections || []);
      } else {
        // Initialize with one empty section/subsection if no data
        setSections([{
          id: Date.now().toString(),
          title: "Introduction",
          subsections: [{
            id: (Date.now() + 1).toString(),
            title: "Overview",
            cells: []
          }]
        }]);
      }
      setIsLoaded(true);
    }
    load();
  }, []);

  // Autosave
  useEffect(() => {
    if (!isLoaded) return;
    const timer = setTimeout(() => {
      saveToStorage({ title, author, sections });
    }, 1000);
    return () => clearTimeout(timer);
  }, [title, author, sections, isLoaded]);

  // --- Actions ---

  const addSection = () => {
    setSections([...sections, {
      id: Date.now().toString(),
      title: "New Section",
      subsections: [{
        id: (Date.now() + 1).toString(),
        title: "New Subsection",
        cells: []
      }]
    }]);
  };

  const updateSectionTitle = (secId, newTitle) => {
    setSections(sections.map(s => s.id === secId ? { ...s, title: newTitle } : s));
  };

  const deleteSection = (secId) => {
    if (confirm("Delete this section and all its contents?")) {
      setSections(sections.filter(s => s.id !== secId));
    }
  };

  const addSubsection = (secId) => {
    setSections(sections.map(s => {
      if (s.id === secId) {
        return {
          ...s,
          subsections: [...s.subsections, {
            id: Date.now().toString(),
            title: "New Subsection",
            cells: []
          }]
        };
      }
      return s;
    }));
  };

  const updateSubsectionTitle = (secId, subId, newTitle) => {
    setSections(sections.map(s => {
      if (s.id === secId) {
        return {
          ...s,
          subsections: s.subsections.map(sub =>
            sub.id === subId ? { ...sub, title: newTitle } : sub
          )
        };
      }
      return s;
    }));
  };

  const deleteSubsection = (secId, subId) => {
    if (confirm("Delete this subsection and its cells?")) {
      setSections(sections.map(s => {
        if (s.id === secId) {
          return {
            ...s,
            subsections: s.subsections.filter(sub => sub.id !== subId)
          };
        }
        return s;
      }));
    }
  };

  // Cell Actions - now scoped to secId and subId
  const addCell = (secId, subId, type) => {
    const newCell = {
      id: Date.now().toString(),
      type,
      content: "",
      mode: type === 'image' ? 'placeholder' : undefined,
      caption: "",
      file_obj: null
    };

    setSections(sections.map(s => {
      if (s.id === secId) {
        return {
          ...s,
          subsections: s.subsections.map(sub => {
            if (sub.id === subId) {
              return { ...sub, cells: [...sub.cells, newCell] };
            }
            return sub;
          })
        };
      }
      return s;
    }));
  };

  const updateCell = (secId, subId, cellId, data) => {
    setSections(sections.map(s => {
      if (s.id === secId) {
        return {
          ...s,
          subsections: s.subsections.map(sub => {
            if (sub.id === subId) {
              return {
                ...sub,
                cells: sub.cells.map(cell =>
                  cell.id === cellId ? { ...cell, ...data } : cell
                )
              };
            }
            return sub;
          })
        };
      }
      return s;
    }));
  };

  const deleteCell = (secId, subId, cellId) => {
    setSections(sections.map(s => {
      if (s.id === secId) {
        return {
          ...s,
          subsections: s.subsections.map(sub => {
            if (sub.id === subId) {
              return {
                ...sub,
                cells: sub.cells.filter(c => c.id !== cellId)
              };
            }
            return sub;
          })
        };
      }
      return s;
    }));
  };

  const generateZip = async () => {
    if (sections.length === 0) {
      alert("Report is empty.");
      return;
    }

    setIsGenerating(true);
    try {
      const formData = new FormData();

      // Clean JSON construction
      const reportData = {
        title,
        author,
        sections: sections.map(s => ({
          id: s.id,
          title: s.title,
          subsections: s.subsections.map(sub => ({
            id: sub.id,
            title: sub.title,
            cells: sub.cells.map(cell => {
              const { file_obj, ...rest } = cell;
              return rest;
            })
          }))
        }))
      };

      formData.append("report_json", JSON.stringify(reportData));

      // Append files by traversing sections
      sections.forEach(s => {
        s.subsections.forEach(sub => {
          sub.cells.forEach(cell => {
            if (cell.type === 'image' && cell.file_obj) {
              formData.append("files", cell.file_obj);
            }
          });
        });
      });

      const backendUrl = import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";
      const response = await fetch(`${backendUrl}/generate-zip`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Server error: ${response.statusText}`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${title.replace(/\s+/g, '_')}_Report.zip`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
    } catch (error) {
      console.error(error);
      alert(`Generation failed: ${error.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  if (!isLoaded) return <div className="loading">Loading...</div>;

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>Lab Report Builder</h1>
      </header>

      <div className="metadata-section">
        <label>
          <strong>Report Title</strong>
          <input type="text" value={title} onChange={e => setTitle(e.target.value)} />
        </label>
        <label>
          <strong>Author</strong>
          <input type="text" value={author} onChange={e => setAuthor(e.target.value)} />
        </label>
      </div>

      <div className="report-content">
        {sections.map(section => (
          <div key={section.id} className="section-wrapper">
            <div className="section-header">
              <input
                value={section.title}
                onChange={(e) => updateSectionTitle(section.id, e.target.value)}
              />
              <div className="controls-bar">
                <button className="btn-secondary" onClick={() => addSubsection(section.id)}>+ Subsec</button>
                <button className="delete-btn" onClick={() => deleteSection(section.id)}>🗑</button>
              </div>
            </div>

            <div className="section-content">
              {section.subsections.map(subsection => (
                <div key={subsection.id} className="subsection-wrapper">
                  <div className="subsection-header">
                    <input
                      value={subsection.title}
                      onChange={(e) => updateSubsectionTitle(section.id, subsection.id, e.target.value)}
                    />
                    <button className="delete-btn" onClick={() => deleteSubsection(section.id, subsection.id)}>🗑</button>
                  </div>

                  <div className="cells-container">
                    {subsection.cells.map((cell, idx) => (
                      <div key={cell.id} className="cell-card">
                        <div className="cell-header">
                          <span className="cell-type-badge">{idx + 1}. {cell.type}</span>
                          <button className="delete-btn" onClick={() => deleteCell(section.id, subsection.id, cell.id)}>Delete</button>
                        </div>
                        {cell.type === 'text' && (
                          <TextCell
                            cell={cell}
                            updateCell={(id, d) => updateCell(section.id, subsection.id, id, d)}
                          />
                        )}
                        {cell.type === 'code' && (
                          <CodeCell
                            cell={cell}
                            updateCell={(id, d) => updateCell(section.id, subsection.id, id, d)}
                          />
                        )}
                        {cell.type === 'image' && (
                          <ImageCell
                            cell={cell}
                            updateCell={(id, d) => updateCell(section.id, subsection.id, id, d)}
                          />
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="add-cell-bar">
                    <button className="btn-add-cell" onClick={() => addCell(section.id, subsection.id, 'text')}>+ Text</button>
                    <button className="btn-add-cell" onClick={() => addCell(section.id, subsection.id, 'code')}>+ Code</button>
                    <button className="btn-add-cell" onClick={() => addCell(section.id, subsection.id, 'image')}>+ Image</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        <div className="section-controls">
          <button className="btn-secondary" onClick={addSection}>+ Add New Section</button>
        </div>
      </div>

      <div className="main-controls">
        <span>{sections.length > 5 ? "TOC will be generated." : "No TOC (add >5 sections)"}</span>
        <button className="btn-generate" onClick={generateZip} disabled={isGenerating}>
          {isGenerating ? "Processing..." : "Generate ZIP"}
        </button>
      </div>
    </div>
  );
}

export default App;
