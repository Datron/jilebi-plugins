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
const rateLimiter = new RateLimiter();
// Type guards
function isValidDepartmentsResponse(data) {
    return data && Array.isArray(data.departments) &&
        data.departments.every((dept) => typeof dept.departmentId === 'number' && typeof dept.displayName === 'string');
}
function isValidSearchResponse(data) {
    return data && typeof data.total === 'number' &&
        (data.objectIDs === null || Array.isArray(data.objectIDs));
}
function isValidMuseumObject(data) {
    return data && typeof data === 'object';
}
async function arrayBufferToBase64(buffer) {
    // Convert ArrayBuffer to base64 using modern browser/Node.js approaches
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

/**
 * Get detailed information about a museum object by its ID
 */
async function getMuseumObject(params, env) {
    try {
        const { objectId, returnImage = true } = params;
        const baseURL = 'https://collectionapi.metmuseum.org/public/collection/v1/objects/';
        const url = `${baseURL}${objectId}`;
        const response = await rateLimiter.fetch(url.toString());
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const jsonData = await response.json();
        if (!isValidMuseumObject(jsonData)) {
            throw new Error('Invalid response format from object API');
        }
        const data = jsonData;
        const text = `Title: ${data.title || 'Unknown'}\n`
            + `${data.artistDisplayName ? `Artist: ${data.artistDisplayName}\n` : ''}`
            + `${data.artistDisplayBio ? `Artist Bio: ${data.artistDisplayBio}\n` : ''}`
            + `${data.department ? `Department: ${data.department}\n` : ''}`
            + `${data.creditLine ? `Credit Line: ${data.creditLine}\n` : ''}`
            + `${data.medium ? `Medium: ${data.medium}\n` : ''}`
            + `${data.dimensions ? `Dimensions: ${data.dimensions}\n` : ''}`
            + `${data.primaryImage ? `Primary Image URL: ${data.primaryImage}\n` : ''}`
            + `${data.tags ? `Tags: ${data.tags.map((tag) => tag.term).filter(Boolean).join(', ')}\n` : ''}`;
        const content = [{
                type: 'text',
                text,
            }];
        if (returnImage && data.primaryImageSmall) {
            try {
                // Fetch the image and convert to base64
                const imageResponse = await rateLimiter.fetch(data.primaryImageSmall);
                if (imageResponse.ok) {
                    const imageBuffer = await imageResponse.arrayBuffer();
                    const base64Image = await arrayBufferToBase64(imageBuffer);
                    content.push({
                        type: 'image',
                        data: base64Image,
                        mimeType: 'image/jpeg',
                    });
                }
            }
            catch (imageError) {
                console.warn('Failed to fetch image:', imageError);
            }
        }
        return { content };
    }
    catch (error) {
        console.error('Error getting museum object:', error);
        return {
            content: [{ type: 'text', text: `Error getting museum object id ${params.objectId}: ${error}` }],
            isError: true,
        };
    }
}
/**
 * List all departments in the Metropolitan Museum of Art
 */
async function listDepartments(request, env) {
    try {
        const apiUrl = 'https://collectionapi.metmuseum.org/public/collection/v1/departments';
        const response = await rateLimiter.fetch(apiUrl);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const jsonData = await response.json();
        if (!isValidDepartmentsResponse(jsonData)) {
            throw new Error('Invalid response format from departments API');
        }
        const text = jsonData.departments.map((department) => {
            return `Department ID: ${department.departmentId}, Display Name: ${department.displayName}`;
        }).join('\n');
        return {
            content: [{ type: 'text', text }],
            isError: false,
        };
    }
    catch (error) {
        console.error('Error listing departments:', error);
        return {
            content: [{ type: 'text', text: `Error listing departments: ${error}` }],
            isError: true,
        };
    }
}
/**
 * Search for objects in the Metropolitan Museum of Art collection
 */
async function searchMuseumObjects(params, env) {
    try {
        const { q, hasImages = false, title = false, departmentId } = params;
        const apiBaseUrl = 'https://collectionapi.metmuseum.org/public/collection/v1/search';
        const url = new URL(apiBaseUrl);
        url.searchParams.set('q', q);
        if (hasImages) {
            url.searchParams.set('hasImages', 'true');
        }
        if (title && !hasImages) {
            url.searchParams.set('title', 'true');
        }
        if (departmentId) {
            url.searchParams.set('departmentId', departmentId.toString());
        }
        const response = await rateLimiter.fetch(url.toString());
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const jsonData = await response.json();
        if (!isValidSearchResponse(jsonData)) {
            throw new Error('Invalid response format from search API');
        }
        if (jsonData.total === 0 || !jsonData.objectIDs) {
            return {
                content: [{ type: 'text', text: 'No objects found' }],
                isError: false,
            };
        }
        const text = `Total objects found: ${jsonData.total}\nObject IDs: ${jsonData.objectIDs.join(', ')}`;
        return {
            content: [{ type: 'text', text }],
            isError: false,
        };
    }
    catch (error) {
        console.error('Error searching museum objects:', error);
        return {
            content: [{ type: 'text', text: `Error searching museum objects: ${error}` }],
            isError: true,
        };
    }
}

export { getMuseumObject, listDepartments, searchMuseumObjects };
//# sourceMappingURL=index.js.map
