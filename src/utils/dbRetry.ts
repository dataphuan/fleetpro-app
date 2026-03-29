/**
 * Database Retry Utility
 * Handles SQLITE_BUSY errors in multi-user LAN environments
 */

/**
 * Executes a database operation with automatic retries if the database is locked.
 * @param operation - The operation to perform
 * @param maxRetries - Maximum number of retries (default: 3)
 * @param delayMs - Delay between retries in milliseconds (default: 200ms)
 */
export async function withRetry<T>(
    operation: () => T,
    maxRetries = 3,
    delayMs = 200
): Promise<T> {
    let lastError: any;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            return operation();
        } catch (error: any) {
            lastError = error;
            
            // Check for SQLite busy/locked errors
            const isBusy = error.code === 'SQLITE_BUSY' || 
                          error.message?.includes('database is locked') ||
                          error.message?.includes('SQLITE_BUSY');
            
            if (isBusy && attempt < maxRetries) {
                const waitTime = delayMs * (attempt + 1); // Exponential backoff
                console.warn(`[DB] Database busy, retrying in ${waitTime}ms (Attempt ${attempt + 1}/${maxRetries})...`);
                await new Promise(resolve => setTimeout(resolve, waitTime));
                continue;
            }
            
            throw error;
        }
    }
    
    throw lastError;
}

/**
 * Synchronous version of withRetry for better-sqlite3 standard calls
 * Note: Since JavaScript is single-threaded, true synchronous sleep blocks the event loop.
 * For Electron Main process, this is acceptable for very short durations (ms) during DB writes.
 */
export function withRetrySync<T>(
    operation: () => T,
    maxRetries = 3,
    delayMs = 100
): T {
    let lastError: any;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            return operation();
        } catch (error: any) {
            lastError = error;
            const isBusy = error.code === 'SQLITE_BUSY' || 
                          error.message?.includes('database is locked') ||
                          error.message?.includes('SQLITE_BUSY');
            
            if (isBusy && attempt < maxRetries) {
                // Busy wait (Synchronous sleep using Atomic/loop)
                const start = Date.now();
                const waitTime = delayMs * (attempt + 1);
                console.warn(`[DB] Database busy (Sync), waiting ${waitTime}ms...`);
                while (Date.now() - start < waitTime) {
                    // Blocking wait
                }
                continue;
            }
            throw error;
        }
    }
    throw lastError;
}
