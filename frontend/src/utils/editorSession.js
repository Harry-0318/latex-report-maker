import { v4 as uuidv4 } from 'uuid';

const STORAGE_KEY = 'report_editor_session_id';

export const getEditorSessionId = () => {
    let sessionId = localStorage.getItem(STORAGE_KEY);
    if (!sessionId) {
        sessionId = uuidv4();
        localStorage.setItem(STORAGE_KEY, sessionId);
    }
    return sessionId;
};
