/**
 * 0G Data Availability Service
 * Handles dispersing critical game events to 0G DA network
 * Non-blocking: Game continues even if DA fails
 */

const DA_SERVICE_URL = 'http://localhost:3002/da/disperse';

class DAService {
    constructor() {
        this.enabled = true;
    }

    /**
     * Disperse data to 0G DA (non-blocking)
     */
    async disperseEvent(data, description, critical = false) {
        if (!this.enabled) {
            console.log('🔕 DA dispersal disabled');
            return { success: false, reason: 'disabled' };
        }

        console.log(`📡 Attempting to disperse: ${description}`);
        
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
            console.log(response);

            if (result.result == 'FAILURE') {
                console.log('✅ DA dispersal successful:', result.request_id);
                if (critical) {
                    console.log('🎉 Critical event secured on DA');
                }
                return { success: true, requestId: result.request_id };
            } else {
                console.warn('⚠️ DA dispersal failed:', result.message);
                return { success: false, reason: result.message };
            }
        } catch (error) {
            console.error('❌ DA dispersal error:', error.message);
            return { success: false, reason: error.message };
        }
    }

    /**
     * Fire and forget - doesn't wait for response
     */
    disperseCriticalEvent(data, description) {
        this.disperseEvent(data, description, true)
            .then(result => {
                if (result.success) {
                    console.log(`🎉 Critical event secured: ${description}`);
                }
            })
            .catch(err => {
                console.error('Critical event dispersal failed (ignored):', err);
            });
    }

    setEnabled(enabled) {
        this.enabled = enabled;
        console.log(`DA dispersal ${enabled ? 'enabled' : 'disabled'}`);
    }
}

export const daService = new DAService();