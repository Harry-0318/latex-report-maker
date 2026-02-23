# Lab Report Builder

A full-stack web application for creating professional LaTeX lab reports with a modern, mobile-first editor. Build structured reports with sections, subsections, text, code, and images — then download a ready-to-compile ZIP containing your `.tex` file and assets.

---

## 1. Project Overview

### What It Does

Lab Report Builder is a browser-based tool that allows users to:

- Create structured lab reports with sections and subsections
- Add text, code blocks, and images to each subsection
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
┌─────────────────┐     ┌─────────────────┐
│    Frontend     │────▶│    Backend      │
│   (React/Vite)  │     │ (Python/FastAPI)│
│     Vercel      │     │     Render      │
└─────────────────┘     └─────────────────┘
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
│   │   └── base_document.py # LaTeX document skeleton
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
| `latex/base_document.py` | Full LaTeX document skeleton with packages |
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
5. Deploy

---

## 7. Autosave System

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

---

## 8. LaTeX & ZIP Generation

### LaTeX Generation Flow

1. Frontend sends report JSON + image files to `/generate-zip`
2. Backend iterates sections → subsections → cells
3. Each cell is converted to LaTeX via `cell_renderer.py`
4. Full document assembled using base document from `base_document.py`
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

---

## License

*Needs confirmation* — Add appropriate license.

---

## Contributing

*Needs confirmation* — Add contribution guidelines if open source.
