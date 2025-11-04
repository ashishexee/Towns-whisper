/**
 * 0G Data Availability Service
 * Handles dispersing critical game events to 0G DA network
 * Non-blocking: Game continues even if DA fails
 */

const DA_SERVICE_URL = 'https://towns-whisper-0g-storage-service.onrender.com/da/disperse';

class DAService {
    constructor() {
        this.enabled = true;
    }

    /**
     * Disperse data to 0G DA (non-blocking)
     */
    async disperseEvent(data, description, critical = false) {
        if (!this.enabled) {
            return { success: false, reason: 'disabled' };
        }

        
        try {
            const response = await fetch(DA_SERVICE_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    data: data,
                    description: description,
                }),
                signal: AbortSignal.timeout(5000), // 5 second timeout
            });

            const result = await response.json();

            if (result.result == 'FAILURE') {
                return { success: true, requestId: result.request_id };
            } else {
                return { success: false, reason: result.message };
            }
        } catch (error) {
            return { success: false, reason: error.message };
        }
    }

    /**
     * Fire and forget - doesn't wait for response
     */
    disperseCriticalEvent(data, description) {
        this.disperseEvent(data, description, true)
            .then(() => {})
            .catch(err => {
            });
    }

    setEnabled(enabled) {
        this.enabled = enabled;
    }
}

export const daService = new DAService();
