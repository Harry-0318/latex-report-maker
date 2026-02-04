import React, { useState } from 'react';
import TextCell from './components/TextCell';
import CodeCell from './components/CodeCell';
import ImageCell from './components/ImageCell';
import './index.css';

function App() {
  const [title, setTitle] = useState("My Lab Report");
  const [author, setAuthor] = useState("Student Name");
  const [cells, setCells] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);

  const addCell = (type) => {
    const newCell = {
      id: Date.now().toString(),
      type,
      content: "",
      mode: type === 'image' ? 'placeholder' : undefined,
      caption: "",
      file_obj: null // Not part of serializable JSON
    };
    setCells([...cells, newCell]);
  };

  const updateCell = (id, data) => {
    setCells(cells.map(cell =>
      cell.id === id ? { ...cell, ...data } : cell
    ));
  };

  const deleteCell = (id) => {
    setCells(cells.filter(cell => cell.id !== id));
  };

  const generateZip = async () => {
    if (cells.length === 0) {
      alert("Please add at least one cell to the report.");
      return;
    }

    setIsGenerating(true);

    try {
      const formData = new FormData();

      // Prepare clean JSON
      const reportData = {
        title,
        author,
        cells: cells.map(cell => {
          // Destructure to remove file_obj from JSON
          const { file_obj, ...rest } = cell;

          // Ensure unique filenames for images to avoid collisions
          if (cell.type === 'image' && file_obj) {
            const uniqueFilename = `${cell.id}_${file_obj.name}`;
            return { ...rest, content: uniqueFilename, original_filename: uniqueFilename };
          }

          return rest;
        })
      };

      formData.append("report_json", JSON.stringify(reportData));

      // Append files
      cells.forEach(cell => {
        if (cell.type === 'image' && cell.file_obj) {
          // Send file with the unique filename matching the JSON report
          const uniqueFilename = `${cell.id}_${cell.file_obj.name}`;
          formData.append("files", cell.file_obj, uniqueFilename);
        }
      });

      const response = await fetch("http://localhost:8000/generate-zip", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Server error: ${response.statusText}`);
      }

      // Handle download
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
      console.error("Error generating report:", error);
      alert(`Failed to generate report: ${error.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>Lab Report Builder</h1>
      </header>

      <div className="metadata-section">
        <label>
          <strong>Report Title</strong>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </label>
        <label>
          <strong>Author</strong>
          <input
            type="text"
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
          />
        </label>
      </div>

      <div className="cells-container">
        {cells.map((cell, index) => (
          <div key={cell.id} className="cell-card">
            <div className="cell-header">
              <span className="cell-type-badge">{index + 1}. {cell.type}</span>
              <button className="delete-btn" onClick={() => deleteCell(cell.id)}>
                Delete
              </button>
            </div>

            {cell.type === 'text' && (
              <TextCell cell={cell} updateCell={updateCell} />
            )}
            {cell.type === 'code' && (
              <CodeCell cell={cell} updateCell={updateCell} />
            )}
            {cell.type === 'image' && (
              <ImageCell cell={cell} updateCell={updateCell} />
            )}
          </div>
        ))}

        {cells.length === 0 && (
          <div className="text-center p-8 text-gray-500 bg-white rounded border border-dashed">
            Start by adding content cells below.
          </div>
        )}
      </div>

      <div className="controls">
        <div className="add-buttons">
          <button className="btn-add" onClick={() => addCell('text')}>+ Text</button>
          <button className="btn-add" onClick={() => addCell('code')}>+ Code</button>
          <button className="btn-add" onClick={() => addCell('image')}>+ Image</button>
        </div>

        <button
          className="btn-generate"
          onClick={generateZip}
          disabled={isGenerating}
        >
          {isGenerating ? "Generating..." : "Generate ZIP"}
        </button>
      </div>
    </div>
  );
}

export default App;
