// Types for the Met Museum API responses
export interface Department {
	departmentId: number;
	displayName: string;
}

export interface DepartmentsResponse {
	departments: Department[];
}

export interface SearchResponse {
	total: number;
	objectIDs: number[] | null;
}

export interface Tag {
	term?: string;
	AAT_URL?: string;
	Wikidata_URL?: string;
}

export interface MuseumObject {
	objectID?: number;
	isHighlight?: boolean;
	accessionNumber?: string;
	accessionYear?: string;
	isPublicDomain?: boolean;
	primaryImage?: string;
	primaryImageSmall?: string;
	additionalImages?: string[];
	department?: string;
	objectName?: string;
	title?: string;
	culture?: string;
	period?: string;
	dynasty?: string;
	reign?: string;
	portfolio?: string;
	artistRole?: string;
	artistPrefix?: string;
	artistDisplayName?: string;
	artistDisplayBio?: string;
	artistSuffix?: string;
	artistAlphaSort?: string;
	artistNationality?: string;
	artistBeginDate?: string;
	artistEndDate?: string;
	artistGender?: string;
	artistWikidata_URL?: string;
	artistULAN_URL?: string;
	objectDate?: string;
	objectBeginDate?: number;
	objectEndDate?: number;
	medium?: string;
	dimensions?: string;
	creditLine?: string;
	geographyType?: string;
	city?: string;
	state?: string;
	county?: string;
	country?: string;
	region?: string;
	subregion?: string;
	locale?: string;
	locus?: string;
	excavation?: string;
	river?: string;
	classification?: string;
	rightsAndReproduction?: string;
	linkResource?: string;
	metadataDate?: string;
	repository?: string;
	objectURL?: string;
	tags?: Tag[] | null;
	objectWikidata_URL?: string;
	isTimelineWork?: boolean;
	GalleryNumber?: string;
}

// Rate limiter implementation
class RateLimiter {
	private lastRequestTime = 0;
	private readonly minInterval = 100; // 100ms between requests

	async fetch(url: string, options?: RequestInit): Promise<Response> {
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
export function isValidDepartmentsResponse(data: any): data is DepartmentsResponse {
	return data && Array.isArray(data.departments) &&
		data.departments.every((dept: any) =>
			typeof dept.departmentId === 'number' && typeof dept.displayName === 'string'
		);
}

export function isValidSearchResponse(data: any): data is SearchResponse {
	return data && typeof data.total === 'number' &&
		(data.objectIDs === null || Array.isArray(data.objectIDs));
}

export function isValidMuseumObject(data: any): data is MuseumObject {
	return data && typeof data === 'object';
}

export async function arrayBufferToBase64(buffer: ArrayBuffer): Promise<string> {
	// Convert ArrayBuffer to base64 using modern browser/Node.js approaches
	const bytes = new Uint8Array(buffer);
	let binary = '';
	for (let i = 0; i < bytes.byteLength; i++) {
		binary += String.fromCharCode(bytes[i]);
	}
	return btoa(binary);
}
