
const STORAGE_KEY = 'lab_report_autosave_v1';

// Convert File object to Base64 string
const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = (error) => reject(error);
    });
};

// Convert Base64 string to File object
const base64ToFile = async (base64String, filename) => {
    const res = await fetch(base64String);
    const blob = await res.blob();
    return new File([blob], filename, { type: blob.type });
};

// Save data to localStorage
export const saveToStorage = async (data) => {
    try {
        // Helper to process cells
        const processCellList = async (cells) => {
            return Promise.all(cells.map(async (cell) => {
                const newCell = { ...cell };
                if (cell.type === 'image' && cell.file_obj) {
                    try {
                        newCell.file_base64 = await fileToBase64(cell.file_obj);
                        delete newCell.file_obj;
                    } catch (e) {
                        console.error("Failed to convert file to base64", e);
                    }
                }
                return newCell;
            }));
        };

        // Process top-level cells
        const processedCanvasCells = await processCellList(data.canvasCells || []);

        // Process sections/subsections
        const processedSections = await Promise.all(data.sections.map(async (section) => {
            const processedSubsections = await Promise.all(section.subsections.map(async (subsection) => {
                const processedCells = await processCellList(subsection.cells);
                return { ...subsection, cells: processedCells };
            }));
            return { ...section, subsections: processedSubsections };
        }));

        const finalData = {
            title: data.title,
            author: data.author,
            canvasCells: processedCanvasCells,
            sections: processedSections,
            timestamp: Date.now(),
            version: 3 // Bump version for new schema
        };

        localStorage.setItem(STORAGE_KEY, JSON.stringify(finalData));
        console.log("Autosaved at", new Date().toLocaleTimeString());

    } catch (error) {
        if (error.name === 'QuotaExceededError') {
            console.warn("LocalStorage quota exceeded. Cannot autosave.");
        } else {
            console.error("Autosave error:", error);
        }
    }
};

// Load data from localStorage
export const loadFromStorage = async () => {
    try {
        const json = localStorage.getItem(STORAGE_KEY);
        if (!json) return null;

        const data = JSON.parse(json);

        // Helper to hydrate cells
        const hydrateCellList = async (cells) => {
            return Promise.all(cells.map(async (cell) => {
                if (cell.type === 'image' && cell.file_base64) {
                    try {
                        const file = await base64ToFile(cell.file_base64, cell.content || "restored_image.png");
                        const { file_base64, ...rest } = cell;
                        return { ...rest, file_obj: file };
                    } catch (e) {
                        console.error("Failed to restore file from base64", e);
                        return cell;
                    }
                }
                return cell;
            }));
        };

        // Migration/Schema Logic
        let sections = [];
        let canvasCells = [];

        if (data.version >= 2) {
            sections = data.sections;
            canvasCells = data.canvasCells || [];
        } else {
            // Migration from v1
            sections = [{
                id: Date.now().toString(),
                title: "Section 1",
                subsections: [{
                    id: (Date.now() + 1).toString(),
                    title: "Subsection 1",
                    cells: data.cells || []
                }]
            }];
        }

        // Hydrate all cells
        const hydratedCanvasCells = await hydrateCellList(canvasCells);
        const hydratedSections = await Promise.all(sections.map(async (section) => {
            const hydratedSubsections = await Promise.all(section.subsections.map(async (subsection) => {
                const hydratedCells = await hydrateCellList(subsection.cells);
                return { ...subsection, cells: hydratedCells };
            }));
            return { ...section, subsections: hydratedSubsections };
        }));

        return {
            title: data.title,
            author: data.author,
            canvasCells: hydratedCanvasCells,
            sections: hydratedSections
        };

    } catch (error) {
        console.error("Failed to load/restore data:", error);
        return null;
    }
};
