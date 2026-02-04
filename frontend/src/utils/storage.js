
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
        // Deep clone to avoid mutating state
        const dataToSave = JSON.parse(JSON.stringify(data));

        // Helper to process cells
        const processCells = async (cells) => {
            return Promise.all(cells.map(async (cell) => {
                const newCell = { ...cell };
                // Original data reference hack - we need to look up the original file object
                // This is tricky with deep cloning. Ideally we traverse the original structure properly.
                // But let's simplify: we'll assume the passed 'data' structure holds the file objects.

                // To do this correctly without complex mapping, let's just traverse the ORIGINAL data.
                return newCell;
            }));
        };

        // We need to traverse the ORIGINAL data to get file objects
        const processedSections = await Promise.all(data.sections.map(async (section) => {
            const processedSubsections = await Promise.all(section.subsections.map(async (subsection) => {
                const processedCells = await Promise.all(subsection.cells.map(async (cell) => {
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
                return { ...subsection, cells: processedCells };
            }));
            return { ...section, subsections: processedSubsections };
        }));

        const finalData = {
            title: data.title,
            author: data.author,
            sections: processedSections,
            timestamp: Date.now(),
            version: 2 // Schema version
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

        // Migration Logic
        let sections = [];

        if (data.version === 2) {
            sections = data.sections;
        } else {
            // Migration from v1 (flat cells)
            console.log("Migrating from v1 to v2...");
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

        // Hydrate cells (restore files from base64)
        const hydratedSections = await Promise.all(sections.map(async (section) => {
            const hydratedSubsections = await Promise.all(section.subsections.map(async (subsection) => {
                const hydratedCells = await Promise.all(subsection.cells.map(async (cell) => {
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
                return { ...subsection, cells: hydratedCells };
            }));
            return { ...section, subsections: hydratedSubsections };
        }));

        return {
            title: data.title,
            author: data.author,
            sections: hydratedSections
        };

    } catch (error) {
        console.error("Failed to load/restore data:", error);
        return null;
    }
};
