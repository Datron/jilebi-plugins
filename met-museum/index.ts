import { 
	arrayBufferToBase64, 
	Department, 
	isValidDepartmentsResponse, 
	isValidMuseumObject, 
	isValidSearchResponse, 
	MuseumObject, 
	rateLimiter, 
	Tag 
} from "./helpers";

// Types for Jilebi plugin responses
export interface JilebiTextContent {
	type: 'text';
	text: string;
}

export interface JilebiImageContent {
	type: 'image';
	data: string;
	mimeType: string;
}

export interface JilebiToolResponse {
	content: (JilebiTextContent | JilebiImageContent)[];
	isError?: boolean;
}

export interface JilebiResource {
	uri: string;
	mimeType: string;
	name: string;
}

export interface JilebiResourceResponse {
	resources?: JilebiResource[];
	contents?: Array<{
		uri: string;
		mimeType: string;
		text: string;
	}>;
}


/**
 * Get detailed information about a museum object by its ID
 */
export async function getMuseumObject(params: {
	objectId: number;
	returnImage?: boolean;
}, env: Environment): Promise<JilebiToolResponse> {
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

		const data = jsonData as MuseumObject;
		const text = `Title: ${data.title || 'Unknown'}\n`
			+ `${data.artistDisplayName ? `Artist: ${data.artistDisplayName}\n` : ''}`
			+ `${data.artistDisplayBio ? `Artist Bio: ${data.artistDisplayBio}\n` : ''}`
			+ `${data.department ? `Department: ${data.department}\n` : ''}`
			+ `${data.creditLine ? `Credit Line: ${data.creditLine}\n` : ''}`
			+ `${data.medium ? `Medium: ${data.medium}\n` : ''}`
			+ `${data.dimensions ? `Dimensions: ${data.dimensions}\n` : ''}`
			+ `${data.primaryImage ? `Primary Image URL: ${data.primaryImage}\n` : ''}`
			+ `${data.tags ? `Tags: ${data.tags.map((tag: Tag) => tag.term).filter(Boolean).join(', ')}\n` : ''}`;

		const content: (JilebiTextContent | JilebiImageContent)[] = [{
			type: 'text',
			text,
		} as JilebiTextContent];

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
					} as JilebiImageContent);

				}
			} catch (imageError) {
				console.warn('Failed to fetch image:', imageError);
			}
		}

		return { content };
	} catch (error) {
		console.error('Error getting museum object:', error);
		return {
			content: [{ type: 'text', text: `Error getting museum object id ${params.objectId}: ${error}` } as JilebiTextContent],
			isError: true,
		};
	}
}

/**
 * List all departments in the Metropolitan Museum of Art
 */
export async function listDepartments(request: {}, env: Environment): Promise<JilebiToolResponse> {
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

		const text = jsonData.departments.map((department: Department) => {
			return `Department ID: ${department.departmentId}, Display Name: ${department.displayName}`;
		}).join('\n');

		return {
			content: [{ type: 'text', text } as JilebiTextContent],
			isError: false,
		};
	} catch (error) {
		console.error('Error listing departments:', error);
		return {
			content: [{ type: 'text', text: `Error listing departments: ${error}` } as JilebiTextContent],
			isError: true,
		};
	}
}

/**
 * Search for objects in the Metropolitan Museum of Art collection
 */
export async function searchMuseumObjects(params: {
	q: string;
	hasImages?: boolean;
	title?: boolean;
	departmentId?: number;
}, env: Environment): Promise<JilebiToolResponse> {
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
				content: [{ type: 'text', text: 'No objects found' } as JilebiTextContent],
				isError: false,
			};
		}

		const text = `Total objects found: ${jsonData.total}\nObject IDs: ${jsonData.objectIDs.join(', ')}`;
		return {
			content: [{ type: 'text', text } as JilebiTextContent],
			isError: false,
		};
	} catch (error) {
		console.error('Error searching museum objects:', error);
		return {
			content: [{ type: 'text', text: `Error searching museum objects: ${error}` } as JilebiTextContent],
			isError: true,
		};
	}
}
