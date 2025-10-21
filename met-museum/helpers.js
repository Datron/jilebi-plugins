// Rate limiter implementation
class RateLimiter {
    lastRequestTime = 0;
    minInterval = 100; // 100ms between requests
    async fetch(url, options) {
        const now = Date.now();
        const timeSinceLastRequest = now - this.lastRequestTime;
        if (timeSinceLastRequest < this.minInterval) {
            await new Promise(resolve => setTimeout(resolve, this.minInterval - timeSinceLastRequest));
        }
        this.lastRequestTime = Date.now();
        return fetch(url, options);
    }
}
export const rateLimiter = new RateLimiter();
// Type guards
export function isValidDepartmentsResponse(data) {
    return data && Array.isArray(data.departments) &&
        data.departments.every((dept) => typeof dept.departmentId === 'number' && typeof dept.displayName === 'string');
}
export function isValidSearchResponse(data) {
    return data && typeof data.total === 'number' &&
        (data.objectIDs === null || Array.isArray(data.objectIDs));
}
export function isValidMuseumObject(data) {
    return data && typeof data === 'object';
}
export async function arrayBufferToBase64(buffer) {
    // Convert ArrayBuffer to base64 using modern browser/Node.js approaches
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}
