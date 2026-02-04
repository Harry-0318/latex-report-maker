
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

        // Process cells to convert files to Base64
        const processedCells = await Promise.all(
            data.cells.map(async (cell) => {
                if (cell.type === 'image' && cell.file_obj) {
                    // We can't access file_obj directly from the JSON.parse(JSON.stringify) above
                    // because File objects don't serialize.
                    // We need to access the original data.
                    // Let's iterate properly.
                    return cell; // placeholder, see loop below
                }
                return cell;
            })
        );

        // Re-map properly using original data source
        const cellsWithBase64 = await Promise.all(data.cells.map(async (cell) => {
            const newCell = { ...cell };
            if (cell.type === 'image' && cell.file_obj) {
                try {
                    newCell.file_base64 = await fileToBase64(cell.file_obj);
                    // We don't save file_obj itself, just the base64
                    delete newCell.file_obj;
                } catch (e) {
                    console.error("Failed to convert file to base64", e);
                }
            }
            return newCell;
        }));

        const finalData = {
            title: data.title,
            author: data.author,
            cells: cellsWithBase64,
            timestamp: Date.now()
        };

        localStorage.setItem(STORAGE_KEY, JSON.stringify(finalData));
        console.log("Autosaved at", new Date().toLocaleTimeString());

    } catch (error) {
        if (error.name === 'QuotaExceededError') {
            console.warn("LocalStorage quota exceeded. Cannot autosave.");
            // Optionally notify user
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

        // dehydrate cells (convert base64 back to File objects)
        const hydratedCells = await Promise.all(data.cells.map(async (cell) => {
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

        return {
            title: data.title,
            author: data.author,
            cells: hydratedCells
        };

    } catch (error) {
        console.error("Failed to load/restore data:", error);
        return null;
    }
};
