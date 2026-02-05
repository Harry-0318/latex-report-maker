# Lab Report Builder

A full-stack web application for creating professional LaTeX lab reports with a modern, mobile-first editor. Build structured reports with sections, subsections, text, code, and images — then download a ready-to-compile ZIP containing your `.tex` file and assets.

---

## 1. Project Overview

### What It Does

Lab Report Builder is a browser-based tool that allows users to:

- Create structured lab reports with sections and subsections
- Add text, code blocks, and images to each subsection
- Load pre-built templates using a 6-character code
- Autosave progress locally
- Generate a downloadable ZIP containing LaTeX source and images

### Who It's For

- Students writing lab reports
- Researchers needing quick LaTeX document generation
- Anyone who wants structured document creation without learning LaTeX syntax

### Why It Exists

Writing LaTeX manually is time-consuming. This tool abstracts the complexity while preserving the professional output quality of LaTeX documents.

### Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│    Frontend     │────▶│    Backend      │────▶│ Storage Service │
│   (React/Vite)  │     │ (Python/FastAPI)│     │   (External)    │
│     Vercel      │     │     Render      │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
        │                       │
        │                       ▼
        │               ┌─────────────────┐
        │               │  LaTeX + ZIP    │
        │               │   Generation    │
        │               └─────────────────┘
        ▼
┌─────────────────┐
│   localStorage  │
│   (Autosave)    │
└─────────────────┘
```

---

## 2. Features

### Editor

| Feature | Description |
|---------|-------------|
| **Sections & Subsections** | Hierarchical document structure |
| **Text Cells** | Rich text content with LaTeX escaping |
| **Code Cells** | Code blocks rendered with `lstlisting` |
| **Image Cells** | Upload images or use placeholders |
| **Placeholder Images** | Boxed placeholders for images to add later |

### System

| Feature | Description |
|---------|-------------|
| **Template System** | Load read-only templates via 6-character codes |
| **Autosave** | Automatic localStorage save with 1-second debounce |
| **ZIP Generation** | Download `.tex` file + images in organized ZIP |
| **Mobile-First UI** | Responsive design for all devices |
| **Table of Contents** | Auto-generated when report has >5 sections |

---

## 3. Project Structure

```
report-maker/
├── backend/
│   ├── main.py              # FastAPI application entry point
│   ├── requirements.txt     # Python dependencies
│   ├── .env                 # Environment variables (not committed)
│   ├── latex/
│   │   ├── cell_renderer.py # Converts cells to LaTeX strings
│   │   └── template.py      # LaTeX document template
│   ├── services/
│   │   └── templateStorage.py # External storage service client
│   └── zip_utils/
│       └── zip_builder.py   # Creates ZIP with .tex and images
│
└── frontend/
    ├── src/
    │   ├── App.jsx          # Main application component
    │   ├── main.jsx         # React entry point
    │   ├── index.css        # Global styles
    │   ├── components/
    │   │   ├── TextCell.jsx
    │   │   ├── CodeCell.jsx
    │   │   └── ImageCell.jsx
    │   └── utils/
    │       └── storage.js   # localStorage autosave utilities
    ├── package.json
    └── vite.config.js
```

### Module Responsibilities

| Module | Responsibility |
|--------|----------------|
| `main.py` | API endpoints, request handling, CORS |
| `latex/cell_renderer.py` | Convert editor cells to LaTeX markup |
| `latex/template.py` | Full LaTeX document template with packages |
| `services/templateStorage.py` | Fetch templates from external storage |
| `zip_utils/zip_builder.py` | Package LaTeX + images into ZIP |
| `utils/storage.js` | Serialize/deserialize state to localStorage |

---

## 4. Local Development Setup

### Prerequisites

- Python 3.9+
- Node.js 18+
- npm or yarn

### Backend Setup

```bash
# Navigate to backend
cd backend

# Create virtual environment
python3 -m venv env
source env/bin/activate  # On Windows: env\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Create .env file
echo "STORAGE_TOKEN=your-storage-token-here" > .env

# Run server
uvicorn main:app --reload --port 8000
```

### Frontend Setup

```bash
# Navigate to frontend
cd frontend

# Install dependencies
npm install

# Create .env file (optional, defaults to localhost:8000)
echo "VITE_BACKEND_URL=http://localhost:8000" > .env

# Run dev server
npm run dev
```

### Verify Setup

1. Backend: Visit `http://localhost:8000/docs` for API documentation
2. Frontend: Visit `http://localhost:5173`

---

## 5. Environment Variables

### Backend (`backend/.env`)

| Variable | Required | Description |
|----------|----------|-------------|
| `STORAGE_TOKEN` | **Yes** | Authentication token for external storage service |

### Frontend (`frontend/.env`)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `VITE_BACKEND_URL` | No | `http://localhost:8000` | Backend API base URL |

---

## 6. Deployment Architecture

### Production URLs

| Service | URL | Host |
|---------|-----|------|
| Frontend | `https://reports.projectalpha.in` | Vercel |
| Backend | `https://backend.reports.projectalpha.in` | Render |

### Frontend Deployment (Vercel)

1. Connect GitHub repository to Vercel
2. Set root directory to `frontend`
3. Set environment variable:
   ```
   VITE_BACKEND_URL=https://backend.reports.projectalpha.in
   ```
4. Deploy

### Backend Deployment (Render)

1. Create new Web Service on Render
2. Set root directory to `backend`
3. Set build command: `pip install -r requirements.txt`
4. Set start command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
5. Set environment variable:
   ```
   STORAGE_TOKEN=your-production-token
   ```
6. Deploy

### Domain Configuration

```
reports.projectalpha.in          → Vercel (frontend)
backend.reports.projectalpha.in  → Render (backend)
```

---

## 7. Template System

### Overview

Templates are pre-built report structures stored in an external storage service. Users load templates using a **6-character alphanumeric code**.

### How It Works

1. User clicks "Use Template" button
2. Enters 6-character template code
3. Frontend calls `GET /get-template/{code}`
4. Backend fetches all templates from storage service
5. Finds matching template by code
6. Returns template structure (sections, subsections, cells)
7. Frontend replaces editor state with template
8. Autosave triggers immediately

### Template Structure

```json
{
  "code": "ABC123",
  "name": "Physics Lab Template",
  "structure": [
    {
      "id": "sec1",
      "title": "Introduction",
      "subsections": [
        {
          "id": "sub1",
          "title": "Objective",
          "cells": [
            { "id": "c1", "type": "text", "content": "" }
          ]
        }
      ]
    }
  ]
}
```

### Key Points

- Templates are **read-only** in storage
- Users can **freely edit** after loading
- Images can be added after template load
- Templates contain only `text` and `code` cells (no images)

### Storage Service Details

| Property | Value |
|----------|-------|
| Base URL | `https://storage.projectalpha.in` |
| Endpoint | `/tools/tool_report_templates` |
| Auth Header | `token: {STORAGE_TOKEN}` |

---

## 8. Autosave System

### Behavior

- **Trigger**: Any change to title, author, or sections
- **Debounce**: 1 second delay before saving
- **Storage**: Browser localStorage
- **Key**: `lab_report_autosave_v1`

### What's Saved

```json
{
  "title": "Report Title",
  "author": "Author Name",
  "sections": [...],
  "timestamp": 1234567890,
  "version": 2
}
```

### Image Handling

- Images are converted to Base64 for localStorage
- Restored to File objects on page load
- Large images may hit localStorage quota (~5MB limit)

### Template Load Behavior

When a template is loaded:
1. Current state is overwritten
2. Immediate autosave triggers with new content
3. No race condition with stale state

### Recovery

On page load, if autosave data exists:
- State is automatically restored
- User continues where they left off

---

## 9. LaTeX & ZIP Generation

### LaTeX Generation Flow

1. Frontend sends report JSON + image files to `/generate-zip`
2. Backend iterates sections → subsections → cells
3. Each cell is converted to LaTeX via `cell_renderer.py`
4. Full document assembled using template from `template.py`
5. ZIP created with `zip_builder.py`

### Cell Types

| Type | LaTeX Output |
|------|--------------|
| `text` | Escaped paragraph text |
| `code` | `\begin{lstlisting}...\end{lstlisting}` |
| `image` (uploaded) | `\includegraphics{images/img_001.png}` |
| `image` (placeholder) | Boxed placeholder with caption |

### ZIP Structure

```
Report_Name_Report.zip
├── main.tex
└── images/
    ├── img_001.png
    └── img_002.jpg
```

### LaTeX Packages Included

- `graphicx` — Image support
- `listings` — Code blocks
- `geometry` — Page margins
- `parskip` — Paragraph spacing
- `float` — Figure positioning
- `hyperref` — Clickable links

---

## 10. Troubleshooting

### Backend Won't Start

```bash
# Check Python version
python3 --version  # Must be 3.9+

# Reinstall dependencies
pip install -r requirements.txt --force-reinstall
```

### CORS Errors

Backend is configured for `allow_origins=["*"]`. If issues persist:
- Verify `VITE_BACKEND_URL` matches actual backend URL
- Check browser console for exact error

### Templates Not Loading

1. Verify `STORAGE_TOKEN` is set in backend `.env`
2. Check backend logs for storage service errors
3. Ensure template code is exactly 6 characters

### ZIP Generation Fails

- Check backend logs: `print(f"ERROR: {e}")`
- Verify all image files are properly attached
- Ensure report has at least one section

### localStorage Quota Exceeded

- Clear browser storage: `localStorage.clear()`
- Reduce number/size of images
- Warning appears in console when quota is exceeded

### Storage Service Unavailable

If external storage is down:
- Template loading returns "Invalid template code"
- Backend logs show HTTP error status
- All other functionality remains unaffected

---

## 11. Future Improvements

- [ ] User authentication system
- [ ] Cloud-based autosave (cross-device sync)
- [ ] Template management UI for admins
- [ ] Real-time collaboration
- [ ] PDF preview before download
- [ ] Custom LaTeX template selection

---

## API Reference

### `POST /generate-zip`

Generate LaTeX ZIP from report data.

**Request**: `multipart/form-data`
- `report_json`: JSON string of report structure
- `files`: Image files (optional)

**Response**: ZIP file download

### `GET /get-template/{code}`

Fetch template by 6-character code.

**Response**:
```json
{
  "success": true,
  "name": "Template Name",
  "structure": [...]
}
```

**Error Response**:
```json
{
  "success": false,
  "error": "Invalid template code"
}
```

### `GET /admin/templates`

**Admin only** — List all available template codes and names.

**Response**:
```json
[
  { "code": "ABC123", "name": "Physics Lab Template" },
  { "code": "XYZ789", "name": "Chemistry Report" }
]
```

**Error Response**:
```json
{
  "success": false,
  "error": "storage_unreachable"
}
```

---

## License

*Needs confirmation* — Add appropriate license.

---

## Contributing

*Needs confirmation* — Add contribution guidelines if open source.
