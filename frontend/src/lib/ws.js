const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || `${window.location.protocol}//${window.location.hostname}:8000`;
const WS_URL = BACKEND_URL.replace(/^http/, 'ws');

export class WSClient {
    constructor(editorSessionId, onMessage) {
        this.editorSessionId = editorSessionId;
        this.onMessage = onMessage;
        this.socket = null;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
    }

    connect() {
        console.log(`Connecting to WebSocket: ${WS_URL}/ws/report-session/${this.editorSessionId}`);
        this.socket = new WebSocket(`${WS_URL}/ws/report-session/${this.editorSessionId}`);

        this.socket.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                this.onMessage(data);
            } catch (err) {
                console.error('Failed to parse WS message', err);
            }
        };

        this.socket.onclose = () => {
            console.log('WebSocket closed');
            if (this.reconnectAttempts < this.maxReconnectAttempts) {
                const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 10000);
                setTimeout(() => {
                    this.reconnectAttempts++;
                    this.connect();
                }, delay);
            }
        };

        this.socket.onerror = (err) => {
            console.error('WebSocket error', err);
            this.socket.close();
        };

        this.socket.onopen = () => {
            console.log('WebSocket connected');
            this.reconnectAttempts = 0;
        };
    }

    disconnect() {
        if (this.socket) {
            this.socket.close();
        }
    }
}
