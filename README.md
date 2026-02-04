# Lab Report Generator

A full-stack application for building lab reports dynamically and exporting them as a LaTeX ZIP package.

## Project Overview
This tool allows users to structurally build a lab report using a notebook-style interface. Users can add text paragraphs, code blocks, and images (via camera, upload, or placeholder). The final output is a downloadable ZIP file containing a `main.tex` source file and all associated images, ready for compilation.

## Tech Stack
- **Frontend**: React (Vite)
- **Backend**: Python (FastAPI)

## Folder Structure
```
report-maker/
├── backend/            # FastAPI Application
│   ├── latex/          # LaTeX conversion logic
│   ├── zip_utils/      # ZIP generation utilities
│   └── main.py         # Entry point and API endpoints
├── frontend/           # React Application
│   ├── src/
│   │   ├── components/ # Cell components (Text, Code, Image)
│   │   └── App.jsx     # Main UI logic
│   └── package.json
└── README.md
```

## Setup Instructions

### 1. Backend Setup (Python)
Prerequisites: Python 3.8+

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Create a virtual environment:
   ```bash
   python3 -m venv venv
   ```

3. Activate the virtual environment:
   - **Mac/Linux**:
     ```bash
     source venv/bin/activate
     ```
   - **Windows**:
     ```bash
     venv\Scripts\activate
     ```

4. Install dependencies:
   ```bash
   pip install fastapi uvicorn python-multipart
   ```

5. Start the server:
   ```bash
   python main.py
   ```
   The backend will run at `http://0.0.0.0:8000`.

### 2. Frontend Setup (React)
Prerequisites: Node.js and npm

1. Open a new terminal and navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```
   The frontend will typically run at `http://localhost:5173`.

## How to Use

1. Open the frontend in your browser (usually `http://localhost:5173`).
2. **Metadata**: Enter the Report Title and Author Name at the top.
3. **Add Content**: Use the buttons at the bottom to add cells:
   - **Text Cell**: Write paragraphs of text.
   - **Code Cell**: Paste or write code snippets.
   - **Image Cell**:
     - **Camera**: Use your device camera (works best on mobile).
     - **Gallery**: Upload an image file from your device.
     - **Placeholder**: Insert a placeholder box if the image isn't ready.
     - *Caption*: Add a caption for the figure.
4. **Generate**: Click the **Generate ZIP** button.
5. **Download**: A file named `[Title]_Report.zip` will download.
6. **Compile**: Extract the ZIP and compile `main.tex` using your preferred LaTeX editor (e.g., Overleaf, TeXShop) to get the PDF.

## Notes & Limitations
- **No PDF Generation**: The backend returns a `.tex` source file. You must compile it yourself.
- **Image Handling**: Images are renamed sequentially (e.g., `img_001.png`) in the output ZIP.
- **Mobile First**: The UI is optimized for vertical scrolling on mobile devices.
