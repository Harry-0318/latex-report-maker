import React, { useState, useEffect } from 'react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { SortableItem } from './components/SortableItem';
import TextCell from './components/TextCell';
import CodeCell from './components/CodeCell';
import ImageCell from './components/ImageCell';
import { saveToStorage, loadFromStorage } from './utils/storage';
import './index.css';

// --- Sub-components to handle dragHandleProps ---

const CanvasCellItem = ({ cell, idx, deleteCanvasCell, updateCanvasCell, dragHandleProps }) => (
  <div className="cell-card">
    <div className="cell-header">
      <div className="drag-handle-wrapper">
        <span className="drag-handle" {...dragHandleProps}>⋮⋮</span>
        <span className="cell-type-badge">{idx + 1}. {cell.type} (Generic)</span>
      </div>
      <button className="delete-btn" onClick={() => deleteCanvasCell(cell.id)}>Delete</button>
    </div>
    {cell.type === 'text' && <TextCell cell={cell} updateCell={updateCanvasCell} />}
    {cell.type === 'code' && <CodeCell cell={cell} updateCell={updateCanvasCell} />}
    {cell.type === 'image' && <ImageCell cell={cell} updateCell={updateCanvasCell} />}
  </div>
);

const SectionItem = ({ section, updateSectionTitle, addSubsection, deleteSection, children, dragHandleProps }) => (
  <div className="section-wrapper">
    <div className="section-header">
      <div className="drag-handle-wrapper">
        <span className="drag-handle" {...dragHandleProps}>⋮⋮</span>
        <input
          value={section.title}
          onChange={(e) => updateSectionTitle(section.id, e.target.value)}
        />
      </div>
      <div className="controls-bar">
        <button className="btn-secondary" onClick={() => addSubsection(section.id)}>+ Subsec</button>
        <button className="delete-btn" onClick={() => deleteSection(section.id)}>🗑</button>
      </div>
    </div>
    <div className="section-content">
      {children}
    </div>
  </div>
);

const SubsectionItem = ({ sectionId, subsection, updateSubsectionTitle, deleteSubsection, children, dragHandleProps }) => (
  <div className="subsection-wrapper">
    <div className="subsection-header">
      <div className="drag-handle-wrapper">
        <span className="drag-handle" {...dragHandleProps}>⋮⋮</span>
        <input
          value={subsection.title}
          onChange={(e) => updateSubsectionTitle(sectionId, subsection.id, e.target.value)}
        />
      </div>
      <button className="delete-btn" onClick={() => deleteSubsection(sectionId, subsection.id)}>🗑</button>
    </div>
    {children}
  </div>
);

const CellItem = ({ sectionId, subsectionId, cell, idx, updateCell, deleteCell, dragHandleProps }) => (
  <div className="cell-card">
    <div className="cell-header">
      <div className="drag-handle-wrapper">
        <span className="drag-handle" {...dragHandleProps}>⋮⋮</span>
        <span className="cell-type-badge">{idx + 1}. {cell.type}</span>
      </div>
      <button className="delete-btn" onClick={() => deleteCell(sectionId, subsectionId, cell.id)}>Delete</button>
    </div>
    {cell.type === 'text' && (
      <TextCell
        cell={cell}
        updateCell={(id, d) => updateCell(sectionId, subsectionId, id, d)}
      />
    )}
    {cell.type === 'code' && (
      <CodeCell
        cell={cell}
        updateCell={(id, d) => updateCell(sectionId, subsectionId, id, d)}
      />
    )}
    {cell.type === 'image' && (
      <ImageCell
        cell={cell}
        updateCell={(id, d) => updateCell(sectionId, subsectionId, id, d)}
      />
    )}
  </div>
);

function App() {
  const [title, setTitle] = useState("My Lab Report");
  const [author, setAuthor] = useState("Student Name");
  const [sections, setSections] = useState([]);
  const [canvasCells, setCanvasCells] = useState([]); // Top-level cells
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [wsClient, setWsClient] = useState(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  useEffect(() => {
    async function load() {
      const data = await loadFromStorage();
      if (data) {
        setTitle(data.title);
        setAuthor(data.author);
        setCanvasCells(data.canvasCells || []);
        setSections(data.sections || []);
      } else {
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

  // WebSocket Integration
  useEffect(() => {
    if (!isLoaded) return;

    const { WSClient } = import('./lib/ws'); // Dynamic import to avoid errors if not fully loaded
    const { getEditorSessionId } = import('./utils/editorSession');

    Promise.all([import('./lib/ws'), import('./utils/editorSession')]).then(([wsMod, sessionMod]) => {
      const editorSessionId = sessionMod.getEditorSessionId();
      const client = new wsMod.WSClient(editorSessionId, (message) => {
        if (message.type === 'photo_uploaded') {
          handleRemoteImageUpload(message.payload);
        }
      });
      client.connect();
      setWsClient(client);
    });

    return () => {
      if (wsClient) wsClient.disconnect();
    };
  }, [isLoaded]);

  const handleRemoteImageUpload = (payload) => {
    const { targetCellId, assetId, assetUrl } = payload;

    // Update top-level cells
    setCanvasCells(prev => prev.map(cell =>
      cell.id === targetCellId
        ? { ...cell, asset_id: assetId, asset_url: assetUrl, mode: 'gallery', file_obj: null }
        : cell
    ));

    // Update nested cells
    setSections(prev => prev.map(section => ({
      ...section,
      subsections: section.subsections.map(sub => ({
        ...sub,
        cells: sub.cells.map(cell =>
          cell.id === targetCellId
            ? { ...cell, asset_id: assetId, asset_url: assetUrl, mode: 'gallery', file_obj: null }
            : cell
        )
      }))
    })));
  };

  useEffect(() => {
    if (!isLoaded) return;
    const timer = setTimeout(() => {
      saveToStorage({ title, author, sections, canvasCells });
    }, 1000);
    return () => clearTimeout(timer);
  }, [title, author, sections, canvasCells, isLoaded]);

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

  const clearReport = () => {
    if (confirm("Are you sure you want to clear everything? This cannot be undone.")) {
      setTitle("My Lab Report");
      setAuthor("Student Name");
      setSections([{
        id: Date.now().toString(),
        title: "Introduction",
        subsections: [{
          id: (Date.now() + 1).toString(),
          title: "Overview",
          cells: []
        }]
      }]);
      setCanvasCells([]);
    }
  };

  const addCell = (secId, subId, type) => {
    const newCell = {
      id: Date.now().toString(),
      type,
      content: "",
      mode: type === 'image' ? 'placeholder' : undefined,
      caption: "",
      file_obj: null,
      asset_id: null,
      asset_url: null
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

  const addCanvasCell = (type) => {
    const newCell = {
      id: Date.now().toString(),
      type,
      content: "",
      mode: type === 'image' ? 'placeholder' : undefined,
      caption: "",
      file_obj: null,
      asset_id: null,
      asset_url: null
    };
    setCanvasCells([...canvasCells, newCell]);
  };

  const updateCanvasCell = (cellId, data) => {
    setCanvasCells(canvasCells.map(cell =>
      cell.id === cellId ? { ...cell, ...data } : cell
    ));
  };

  const deleteCanvasCell = (cellId) => {
    setCanvasCells(canvasCells.filter(c => c.id !== cellId));
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const activeId = active.id;
    const overId = over.id;

    // Helper: Find what type of item we are dragging and where it is
    const findCellPath = (id) => {
      // Check canvasCells
      const canvasIdx = canvasCells.findIndex(c => c.id === id);
      if (canvasIdx !== -1) return { type: 'cell', container: 'canvas', index: canvasIdx };

      // Check sections/subsections
      for (let i = 0; i < sections.length; i++) {
        for (let j = 0; j < sections[i].subsections.length; j++) {
          const idx = sections[i].subsections[j].cells.findIndex(c => c.id === id);
          if (idx !== -1) return {
            type: 'cell',
            container: 'subsection',
            sectionIdx: i,
            subIdx: j,
            index: idx
          };
        }
      }
      return null;
    };

    const findSubsectionPath = (id) => {
      for (let i = 0; i < sections.length; i++) {
        const idx = sections[i].subsections.findIndex(s => s.id === id);
        if (idx !== -1) return { type: 'subsection', sectionIdx: i, index: idx };
      }
      return null;
    };

    const findSectionPath = (id) => {
      const idx = sections.findIndex(s => s.id === id);
      if (idx !== -1) return { type: 'section', index: idx };
      return null;
    };

    const activePath = findCellPath(activeId) || findSubsectionPath(activeId) || findSectionPath(activeId);

    // Resolve "Over" path - it could be another item OR a container ID
    let overPath = findCellPath(overId) || findSubsectionPath(overId) || findSectionPath(overId);

    if (!overPath) {
      // Check if dropping on a Section ID (to move a subsection into it)
      const secIdx = sections.findIndex(s => s.id === overId);
      if (secIdx !== -1) overPath = { type: 'section', index: sections[secIdx].subsections.length, isContainer: true, sectionIdx: secIdx };

      // Check if dropping on a Subsection ID (to move a cell into it)
      for (let i = 0; i < sections.length; i++) {
        const subIdx = sections[i].subsections.findIndex(s => s.id === overId);
        if (subIdx !== -1) overPath = { type: 'subsection', sectionIdx: i, subIdx: subIdx, index: sections[i].subsections[subIdx].cells.length, isContainer: true };
      }

      // Check if dropping on Canvas container ID
      if (overId === 'canvas-container') {
        overPath = { type: 'cell', container: 'canvas', index: canvasCells.length, isContainer: true };
      }
    }

    if (!activePath || !overPath) return;

    // --- REORDERING LOGIC ---

    // 1. Sections Reordering
    if (activePath.type === 'section' && overPath.type === 'section') {
      setSections(arrayMove(sections, activePath.index, overPath.index));
      return;
    }

    // 2. Subsections Reordering (Can move across sections)
    if (activePath.type === 'subsection') {
      let targetSecIdx, targetSubIdx;
      if (overPath.type === 'subsection') {
        targetSecIdx = overPath.sectionIdx;
        targetSubIdx = overPath.index;
      } else if (overPath.type === 'section' && overPath.isContainer) {
        targetSecIdx = overPath.sectionIdx;
        targetSubIdx = overPath.index;
      } else {
        return; // Can't drop subsection on a cell
      }

      const newSections = [...sections];
      const [movedSub] = newSections[activePath.sectionIdx].subsections.splice(activePath.index, 1);
      newSections[targetSecIdx].subsections.splice(targetSubIdx, 0, movedSub);
      setSections(newSections);
      return;
    }

    // 3. Cells Reordering (Can move across Subsections and Canvas)
    if (activePath.type === 'cell') {
      let destContainer, destSecIdx, destSubIdx, destCellIdx;

      if (overPath.type === 'cell') {
        destContainer = overPath.container;
        destSecIdx = overPath.sectionIdx;
        destSubIdx = overPath.subIdx;
        destCellIdx = overPath.index;
      } else if (overPath.type === 'subsection' && overPath.isContainer) {
        destContainer = 'subsection';
        destSecIdx = overPath.sectionIdx;
        destSubIdx = overPath.subIdx;
        destCellIdx = overPath.index;
      } else if (overPath.type === 'cell' && overPath.container === 'canvas' && overPath.isContainer) {
        destContainer = 'canvas';
        destCellIdx = overPath.index;
      } else {
        return; // Can't drop cell on a section
      }

      // Get the moving cell
      let movingCell;
      let newCanvasCells = [...canvasCells];
      let newSections = [...sections];

      if (activePath.container === 'canvas') {
        [movingCell] = newCanvasCells.splice(activePath.index, 1);
      } else {
        [movingCell] = newSections[activePath.sectionIdx].subsections[activePath.subIdx].cells.splice(activePath.index, 1);
      }

      // Insert into destination
      if (destContainer === 'canvas') {
        newCanvasCells.splice(destCellIdx, 0, movingCell);
      } else {
        newSections[destSecIdx].subsections[destSubIdx].cells.splice(destCellIdx, 0, movingCell);
      }

      setCanvasCells(newCanvasCells);
      setSections(newSections);
      return;
    }
  };

  const handleDragOver = (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const activeId = active.id;
    const overId = over.id;

    const findCellPath = (id) => {
      const canvasIdx = canvasCells.findIndex(c => c.id === id);
      if (canvasIdx !== -1) return { type: 'cell', container: 'canvas', index: canvasIdx };
      for (let i = 0; i < sections.length; i++) {
        for (let j = 0; j < sections[i].subsections.length; j++) {
          const idx = sections[i].subsections[j].cells.findIndex(c => c.id === id);
          if (idx !== -1) return { type: 'cell', container: 'subsection', sectionIdx: i, subIdx: j, index: idx };
        }
      }
      return null;
    };

    const findSubsectionPath = (id) => {
      for (let i = 0; i < sections.length; i++) {
        const idx = sections[i].subsections.findIndex(s => s.id === id);
        if (idx !== -1) return { type: 'subsection', sectionIdx: i, index: idx };
      }
      return null;
    };

    const activeItem = findCellPath(activeId) || findSubsectionPath(activeId);
    if (!activeItem) return;

    let overItem = findCellPath(overId) || findSubsectionPath(overId);
    if (!overItem) {
      const secIdx = sections.findIndex(s => s.id === overId);
      if (secIdx !== -1) overItem = { type: 'section', sectionIdx: secIdx, isContainer: true };

      for (let i = 0; i < sections.length; i++) {
        const subIdx = sections[i].subsections.findIndex(s => s.id === overId);
        if (subIdx !== -1) overItem = { type: 'subsection', sectionIdx: i, subIdx: subIdx, isContainer: true };
      }

      if (overId === 'canvas-container') overItem = { type: 'cell', container: 'canvas', isContainer: true };
    }

    if (!overItem) return;

    // Subsection cross-move
    if (activeItem.type === 'subsection' && (overItem.type === 'subsection' || (overItem.type === 'section' && overItem.isContainer))) {
      const activeSecIdx = activeItem.sectionIdx;
      const overSecIdx = overItem.sectionIdx;
      if (activeSecIdx !== overSecIdx) {
        setSections(prev => {
          const next = JSON.parse(JSON.stringify(prev));
          const [moved] = next[activeSecIdx].subsections.splice(activeItem.index, 1);
          const targetIdx = overItem.type === 'subsection' ? overItem.index : next[overSecIdx].subsections.length;
          next[overSecIdx].subsections.splice(targetIdx, 0, moved);
          return next;
        });
      }
      return;
    }

    // Cell cross-move
    if (activeItem.type === 'cell') {
      const isOverCell = overItem.type === 'cell';
      const isOverSubsection = overItem.type === 'subsection' && overItem.isContainer;
      const isOverCanvas = (overId === 'canvas-container');

      const isSameContainer = () => {
        if (activeItem.container === 'canvas' && (isOverCanvas || (isOverCell && overItem.container === 'canvas'))) return true;
        if (activeItem.container === 'subsection' && isOverSubsection && activeItem.sectionIdx === overItem.sectionIdx && activeItem.subIdx === overItem.subIdx) return true;
        if (activeItem.container === 'subsection' && isOverCell && overItem.container === 'subsection' && activeItem.sectionIdx === overItem.sectionIdx && activeItem.subIdx === overItem.subIdx) return true;
        return false;
      };

      if (!isSameContainer()) {
        const newCanvas = [...canvasCells];
        const newSections = JSON.parse(JSON.stringify(sections));
        let movingCell;

        if (activeItem.container === 'canvas') {
          [movingCell] = newCanvas.splice(activeItem.index, 1);
        } else {
          [movingCell] = newSections[activeItem.sectionIdx].subsections[activeItem.subIdx].cells.splice(activeItem.index, 1);
        }

        if (isOverCanvas || (isOverCell && overItem.container === 'canvas')) {
          const targetIdx = isOverCanvas ? newCanvas.length : overItem.index;
          newCanvas.splice(targetIdx, 0, movingCell);
        } else if (isOverSubsection || (isOverCell && overItem.container === 'subsection')) {
          const tSecIdx = overItem.sectionIdx;
          const tSubIdx = overItem.subIdx;
          const targetIdx = isOverCell ? overItem.index : newSections[tSecIdx].subsections[tSubIdx].cells.length;
          newSections[tSecIdx].subsections[tSubIdx].cells.splice(targetIdx, 0, movingCell);
        }

        setCanvasCells(newCanvas);
        setSections(newSections);
      }
    }
  };

  const generateZip = async () => {
    if (sections.length === 0) {
      alert("Report is empty.");
      return;
    }
    setIsGenerating(true);
    try {
      const formData = new FormData();
      const reportData = {
        title,
        author,
        cells: canvasCells.map(cell => {
          const { file_obj, ...rest } = cell;
          return rest;
        }),
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

      // Append local image files
      canvasCells.forEach(cell => {
        if (cell.type === 'image' && cell.file_obj) {
          formData.append("files", cell.file_obj);
        }
      });
      sections.forEach(s => {
        s.subsections.forEach(sub => {
          sub.cells.forEach(cell => {
            if (cell.type === 'image' && cell.file_obj) {
              formData.append("files", cell.file_obj);
            }
          });
        });
      });

      const backendUrl = import.meta.env.VITE_BACKEND_URL || `${window.location.protocol}//${window.location.hostname}:8000`;
      const response = await fetch(`${backendUrl}/generate-zip`, {
        method: "POST",
        body: formData,
      });
      if (!response.ok) throw new Error(`Server error: ${response.statusText}`);
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
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
      onDragOver={handleDragOver}
    >
      <div className="app-container">
        <header className="app-header">
          <h1>Lab Report Builder</h1>
          <button className="btn-secondary" onClick={clearReport} style={{ marginLeft: 'auto' }}>
            Clear Report
          </button>
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
          <div className="canvas-cells-container" id="canvas-container">
            <SortableContext items={canvasCells.map(c => c.id)} strategy={verticalListSortingStrategy}>
              {canvasCells.map((cell, idx) => (
                <SortableItem key={cell.id} id={cell.id}>
                  <CanvasCellItem
                    cell={cell}
                    idx={idx}
                    deleteCanvasCell={deleteCanvasCell}
                    updateCanvasCell={updateCanvasCell}
                  />
                </SortableItem>
              ))}
            </SortableContext>
            <div className="add-cell-bar canvas-add-bar">
              <span>Add to Top-Level:</span>
              <button className="btn-add-cell" onClick={() => addCanvasCell('text')}>+ Text</button>
              <button className="btn-add-cell" onClick={() => addCanvasCell('code')}>+ Code</button>
              <button className="btn-add-cell" onClick={() => addCanvasCell('image')}>+ Image</button>
            </div>
          </div>

          <SortableContext items={sections.map(s => s.id)} strategy={verticalListSortingStrategy}>
            {sections.map(section => (
              <SortableItem key={section.id} id={section.id}>
                <SectionItem
                  section={section}
                  updateSectionTitle={updateSectionTitle}
                  addSubsection={addSubsection}
                  deleteSection={deleteSection}
                >
                  <div className="section-content-inner" id={section.id}>
                    <SortableContext items={section.subsections.map(sub => sub.id)} strategy={verticalListSortingStrategy}>
                      {section.subsections.map(subsection => (
                        <SortableItem key={subsection.id} id={subsection.id}>
                          <SubsectionItem
                            sectionId={section.id}
                            subsection={subsection}
                            updateSubsectionTitle={updateSubsectionTitle}
                            deleteSubsection={deleteSubsection}
                          >
                            <div className="cells-container" id={subsection.id}>
                              <SortableContext items={subsection.cells.map(c => c.id)} strategy={verticalListSortingStrategy}>
                                {subsection.cells.map((cell, idx) => (
                                  <SortableItem key={cell.id} id={cell.id}>
                                    <CellItem
                                      sectionId={section.id}
                                      subsectionId={subsection.id}
                                      cell={cell}
                                      idx={idx}
                                      updateCell={updateCell}
                                      deleteCell={deleteCell}
                                    />
                                  </SortableItem>
                                ))}
                              </SortableContext>
                            </div>
                            <div className="add-cell-bar">
                              <button className="btn-add-cell" onClick={() => addCell(section.id, subsection.id, 'text')}>+ Text</button>
                              <button className="btn-add-cell" onClick={() => addCell(section.id, subsection.id, 'code')}>+ Code</button>
                              <button className="btn-add-cell" onClick={() => addCell(section.id, subsection.id, 'image')}>+ Image</button>
                            </div>
                          </SubsectionItem>
                        </SortableItem>
                      ))}
                    </SortableContext>
                  </div>
                </SectionItem>
              </SortableItem>
            ))}
          </SortableContext>

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
    </DndContext>
  );
}

export default App;
