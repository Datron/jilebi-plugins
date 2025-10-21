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

// AniList API Types
interface AniListMedia {
	id: number;
	title: {
		romaji?: string;
		english?: string;
		native?: string;
	};
	description?: string;
	format?: string;
	status?: string;
	type?: string;
	episodes?: number;
	chapters?: number;
	volumes?: number;
	duration?: number;
	genres?: string[];
	averageScore?: number;
	popularity?: number;
	startDate?: {
		year?: number;
		month?: number;
		day?: number;
	};
	endDate?: {
		year?: number;
		month?: number;
		day?: number;
	};
	coverImage?: {
		large?: string;
		medium?: string;
	};
	bannerImage?: string;
	studios?: {
		nodes?: Array<{
			name: string;
		}>;
	};
	source?: string;
	siteUrl?: string;
}

interface AniListCharacter {
	id: number;
	name: {
		first?: string;
		middle?: string;
		last?: string;
		full?: string;
		native?: string;
		alternative?: string[];
	};
	description?: string;
	image?: {
		large?: string;
		medium?: string;
	};
	gender?: string;
	dateOfBirth?: {
		year?: number;
		month?: number;
		day?: number;
	};
	age?: string;
	bloodType?: string;
	siteUrl?: string;
	media?: {
		nodes?: AniListMedia[];
	};
}

interface AniListResponse<T> {
	data?: {
		Page?: {
			pageInfo?: {
				hasNextPage: boolean;
				currentPage: number;
				lastPage: number;
				perPage: number;
				total: number;
			};
			media?: T[];
			characters?: T[];
		};
		Media?: T;
		Character?: T;
	};
	errors?: Array<{
		message: string;
		status: number;
		locations: Array<{
			line: number;
			column: number;
		}>;
	}>;
}

interface Environment {
	// Add environment interface if needed
}

// Rate limiter for API requests
const rateLimiter = {
	lastRequest: 0,
	minInterval: 1000, // 1 second between requests

	async fetch(url: string, options?: RequestInit): Promise<Response> {
		const now = Date.now();
		const timeSinceLastRequest = now - this.lastRequest;

		if (timeSinceLastRequest < this.minInterval) {
			await new Promise(resolve => setTimeout(resolve, this.minInterval - timeSinceLastRequest));
		}

		this.lastRequest = Date.now();
		return fetch(url, options);
	}
};

// GraphQL query builder and executor
async function executeGraphQLQuery<T>(query: string, variables: Record<string, any> = {}): Promise<AniListResponse<T>> {
	const response = await rateLimiter.fetch('https://graphql.anilist.co', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			'Accept': 'application/json',
		},
		body: JSON.stringify({
			query,
			variables,
		}),
	});

	if (!response.ok) {
	  // @ts-ignore
    console.error("Error sending request: ", response.errors);
		throw new Error(`AniList API error: ${response.status} ${response.statusText}`);
	}

	return await response.json();
}

// Helper function to convert ArrayBuffer to base64
function arrayBufferToBase64(buffer: ArrayBuffer): string {
	const bytes = new Uint8Array(buffer);
	let binary = '';
	for (let i = 0; i < bytes.byteLength; i++) {
		binary += String.fromCharCode(bytes[i]);
	}
	return btoa(binary);
}

// Helper functions
function formatMediaInfo(media: AniListMedia, isAnime: boolean = true): string {
	const title = media.title?.english || media.title?.romaji || media.title?.native || 'Unknown Title';
	const score = media.averageScore ? `${media.averageScore}/100` : 'Not rated';
	const status = media.status || 'Unknown';
	const genres = media.genres?.join(', ') || 'No genres listed';

	let info = `**${title}**\n`;
	info += `Score: ${score}\n`;
	info += `Status: ${status}\n`;
	info += `Genres: ${genres}\n`;

	if (isAnime) {
		info += `Episodes: ${media.episodes || 'Unknown'}\n`;
		if (media.duration) info += `Episode Duration: ${media.duration} minutes\n`;
	} else {
		info += `Chapters: ${media.chapters || 'Unknown'}\n`;
		info += `Volumes: ${media.volumes || 'Unknown'}\n`;
	}

	if (media.startDate?.year) {
		info += `Start Date: ${media.startDate.year}`;
		if (media.startDate.month) info += `-${media.startDate.month.toString().padStart(2, '0')}`;
		if (media.startDate.day) info += `-${media.startDate.day.toString().padStart(2, '0')}`;
		info += '\n';
	}

	if (media.description) {
		const cleanDescription = media.description.replace(/<[^>]*>/g, '').substring(0, 300);
		info += `\nDescription: ${cleanDescription}${media.description.length > 300 ? '...' : ''}\n`;
	}

	if (media.siteUrl) {
		info += `\nAniList URL: ${media.siteUrl}\n`;
	}

	return info;
}

function formatCharacterInfo(character: AniListCharacter): string {
	const name = character.name?.full || character.name?.first || 'Unknown Name';

	let info = `**${name}**\n`;

	if (character.name?.native) {
		info += `Native Name: ${character.name.native}\n`;
	}

	if (character.name?.alternative?.length) {
		info += `Alternative Names: ${character.name.alternative.join(', ')}\n`;
	}

	if (character.gender) {
		info += `Gender: ${character.gender}\n`;
	}

	if (character.age) {
		info += `Age: ${character.age}\n`;
	}

	if (character.bloodType) {
		info += `Blood Type: ${character.bloodType}\n`;
	}

	if (character.dateOfBirth?.year) {
		info += `Date of Birth: ${character.dateOfBirth.year}`;
		if (character.dateOfBirth.month) info += `-${character.dateOfBirth.month.toString().padStart(2, '0')}`;
		if (character.dateOfBirth.day) info += `-${character.dateOfBirth.day.toString().padStart(2, '0')}`;
		info += '\n';
	}

	if (character.description) {
		const cleanDescription = character.description.replace(/<[^>]*>/g, '').substring(0, 400);
		info += `\nDescription: ${cleanDescription}${character.description.length > 400 ? '...' : ''}\n`;
	}

	if (character.siteUrl) {
		info += `\nAniList URL: ${character.siteUrl}\n`;
	}

	return info;
}

// Tool implementations

/**
 * Search for anime on AniList
 */
export async function searchAnime(params: {
	search: string;
	genre?: string;
	year?: number;
	format?: string;
	status?: string;
	page?: number;
	perPage?: number;
}, env: Environment): Promise<JilebiToolResponse> {
	try {
		const { search, genre, year, format, status, page = 1, perPage = 10 } = params;

		const query = `
			query ($search: String, $genre: String, $year: String, $format: MediaFormat, $status: MediaStatus, $page: Int, $perPage: Int) {
				Page(page: $page, perPage: $perPage) {
					pageInfo {
						hasNextPage
						currentPage
						lastPage
						perPage
						total
					}
					media(search: $search, genre: $genre, startDate_like: $year, format: $format, status: $status, type: ANIME) {
						id
						title {
							romaji
							english
							native
						}
						description
						format
						status
						episodes
						duration
						genres
						averageScore
						popularity
						startDate {
							year
							month
							day
						}
						coverImage {
							large
							medium
						}
						siteUrl
					}
				}
			}
		`;

		const variables: any = { search, page, perPage };
		if (genre) variables.genre = genre;
		if (year) variables.year = year;
		if (format) variables.format = format;
		if (status) variables.status = status;

		const response = await executeGraphQLQuery<AniListMedia>(query, variables);

		if (response.errors) {
			throw new Error(`GraphQL errors: ${response.errors.map(e => e.message).join(', ')}`);
		}

		const media = response.data?.Page?.media || [];
		const pageInfo = response.data?.Page?.pageInfo;

		if (media.length === 0) {
			return {
				content: [{ type: 'text', text: `No anime found matching your search criteria.` }],
			};
		}

		let text = `Found ${pageInfo?.total || media.length} anime results (Page ${page}/${pageInfo?.lastPage || 1}):\n\n`;

		media.forEach((anime, index) => {
			text += `${index + 1}. ${formatMediaInfo(anime, true)}\n`;
		});

		if (pageInfo?.hasNextPage) {
			text += `\nUse page ${page + 1} to see more results.`;
		}

		return {
			content: [{ type: 'text', text }],
		};
	} catch (error) {
		console.error('Error searching anime:', error);
		return {
			content: [{ type: 'text', text: `Error searching anime: ${error}` }],
			isError: true,
		};
	}
}

/**
 * Search for manga on AniList
 */
export async function searchManga(params: {
	search: string;
	genre?: string;
	year?: number;
	format?: string;
	status?: string;
	page?: number;
	perPage?: number;
}, env: Environment): Promise<JilebiToolResponse> {
	try {
		const { search, genre, year, format, status, page = 1, perPage = 10 } = params;

		const query = `
			query ($search: String, $genre: String, $year: Int, $format: MediaFormat, $status: MediaStatus, $page: Int, $perPage: Int) {
				Page(page: $page, perPage: $perPage) {
					pageInfo {
						hasNextPage
						currentPage
						lastPage
						perPage
						total
					}
					media(search: $search, genre: $genre, startDate_like: $year, format: $format, status: $status, type: MANGA) {
						id
						title {
							romaji
							english
							native
						}
						description
						format
						status
						chapters
						volumes
						genres
						averageScore
						popularity
						startDate {
							year
							month
							day
						}
						coverImage {
							large
							medium
						}
						siteUrl
					}
				}
			}
		`;

		const variables: any = { search, page, perPage };
		if (genre) variables.genre = genre;
		if (year) variables.year = year;
		if (format) variables.format = format;
		if (status) variables.status = status;

		const response = await executeGraphQLQuery<AniListMedia>(query, variables);

		if (response.errors) {
			throw new Error(`GraphQL errors: ${response.errors.map(e => e.message).join(', ')}`);
		}

		const media = response.data?.Page?.media || [];
		const pageInfo = response.data?.Page?.pageInfo;

		if (media.length === 0) {
			return {
				content: [{ type: 'text', text: `No manga found matching your search criteria.` }],
			};
		}

		let text = `Found ${pageInfo?.total || media.length} manga results (Page ${page}/${pageInfo?.lastPage || 1}):\n\n`;

		media.forEach((manga, index) => {
			text += `${index + 1}. ${formatMediaInfo(manga, false)}\n`;
		});

		if (pageInfo?.hasNextPage) {
			text += `\nUse page ${page + 1} to see more results.`;
		}

		return {
			content: [{ type: 'text', text }],
		};
	} catch (error) {
		console.error('Error searching manga:', error);
		return {
			content: [{ type: 'text', text: `Error searching manga: ${error}` }],
			isError: true,
		};
	}
}

/**
 * Get detailed information about a specific anime by ID
 */
export async function getAnimeDetails(params: {
	id: number;
}, env: Environment): Promise<JilebiToolResponse> {
	try {
		const { id } = params;

		const query = `
			query ($id: Int) {
				Media(id: $id, type: ANIME) {
					id
					title {
						romaji
						english
						native
					}
					description
					format
					status
					episodes
					duration
					genres
					averageScore
					popularity
					startDate {
						year
						month
						day
					}
					endDate {
						year
						month
						day
					}
					coverImage {
						large
						medium
					}
					bannerImage
					studios {
						nodes {
							name
						}
					}
					source
					siteUrl
				}
			}
		`;

		const response = await executeGraphQLQuery<AniListMedia>(query, { id });
		
    console.log("Response from search API:", response);

		if (response.errors) {
			throw new Error(`GraphQL errors: ${response.errors.map(e => e.message).join(', ')}`);
		}

		const anime = response.data?.Media;

		if (!anime) {
			return {
				content: [{ type: 'text', text: `No anime found with ID ${id}.` }],
			};
		}

		let text = formatMediaInfo(anime, true);

		if (anime.studios?.nodes?.length) {
			text += `Studios: ${anime.studios.nodes.map(s => s.name).join(', ')}\n`;
		}

		if (anime.source) {
			text += `Source: ${anime.source}\n`;
		}

		const content: (JilebiTextContent | JilebiImageContent)[] = [{ type: 'text', text }];

		// Add cover image if available
		if (anime.coverImage?.large) {
			try {
				const imageResponse = await rateLimiter.fetch(anime.coverImage.large);
				if (imageResponse.ok) {
					const imageBuffer = await imageResponse.arrayBuffer();
					const base64Image = arrayBufferToBase64(imageBuffer);
					content.push({
						type: 'image',
						data: base64Image,
						mimeType: 'image/jpeg'
					});
				}
			} catch (imageError) {
				console.error('Error fetching cover image:', imageError);
			}
		}

		return { content };
	} catch (error) {
		console.error('Error getting anime details:', error);
		return {
			content: [{ type: 'text', text: `Error getting anime details: ${error}` }],
			isError: true,
		};
	}
}

/**
 * Get detailed information about a specific manga by ID
 */
export async function getMangaDetails(params: {
	id: number;
}, env: Environment): Promise<JilebiToolResponse> {
	try {
		const { id } = params;

		const query = `
			query ($id: Int) {
				Media(id: $id, type: MANGA) {
					id
					title {
						romaji
						english
						native
					}
					description
					format
					status
					chapters
					volumes
					genres
					averageScore
					popularity
					startDate {
						year
						month
						day
					}
					endDate {
						year
						month
						day
					}
					coverImage {
						large
						medium
					}
					source
					siteUrl
				}
			}
		`;

		const response = await executeGraphQLQuery<AniListMedia>(query, { id });

		if (response.errors) {
			throw new Error(`GraphQL errors: ${response.errors.map(e => e.message).join(', ')}`);
		}

		const manga = response.data?.Media;

		if (!manga) {
			return {
				content: [{ type: 'text', text: `No manga found with ID ${id}.` }],
			};
		}

		let text = formatMediaInfo(manga, false);

		if (manga.source) {
			text += `Source: ${manga.source}\n`;
		}

		const content: (JilebiTextContent | JilebiImageContent)[] = [{ type: 'text', text }];

		// Add cover image if available
		if (manga.coverImage?.large) {
			try {
				const imageResponse = await rateLimiter.fetch(manga.coverImage.large);
				if (imageResponse.ok) {
					const imageBuffer = await imageResponse.arrayBuffer();
					const base64Image = arrayBufferToBase64(imageBuffer);
					content.push({
						type: 'image',
						data: base64Image,
						mimeType: 'image/jpeg'
					});
				}
			} catch (imageError) {
				console.error('Error fetching cover image:', imageError);
			}
		}

		return { content };
	} catch (error) {
		console.error('Error getting manga details:', error);
		return {
			content: [{ type: 'text', text: `Error getting manga details: ${error}` }],
			isError: true,
		};
	}
}

/**
 * Get detailed information about a specific character by ID
 */
export async function getCharacterDetails(params: {
	id: number;
}, env: Environment): Promise<JilebiToolResponse> {
	try {
		const { id } = params;

		const query = `
			query ($id: Int) {
				Character(id: $id) {
					id
					name {
						first
						middle
						last
						full
						native
						alternative
					}
					description
					image {
						large
						medium
					}
					gender
					dateOfBirth {
						year
						month
						day
					}
					age
					bloodType
					siteUrl
					media(page: 1, perPage: 5) {
						nodes {
							id
							title {
								romaji
								english
							}
							type
							format
						}
					}
				}
			}
		`;

		const response = await executeGraphQLQuery<AniListCharacter>(query, { id });

		if (response.errors) {
			throw new Error(`GraphQL errors: ${response.errors.map(e => e.message).join(', ')}`);
		}

		const character = response.data?.Character;

		if (!character) {
			return {
				content: [{ type: 'text', text: `No character found with ID ${id}.` }],
			};
		}

		let text = formatCharacterInfo(character);

		if (character.media?.nodes?.length) {
			text += '\nAppears in:\n';
			character.media.nodes.forEach((media, index) => {
				const title = media.title?.english || media.title?.romaji || 'Unknown Title';
				text += `${index + 1}. ${title} (${media.type})\n`;
			});
		}

		const content: (JilebiTextContent | JilebiImageContent)[] = [{ type: 'text', text }];

		// Add character image if available
		if (character.image?.large) {
			try {
				const imageResponse = await rateLimiter.fetch(character.image.large);
				if (imageResponse.ok) {
					const imageBuffer = await imageResponse.arrayBuffer();
					const base64Image = arrayBufferToBase64(imageBuffer);
					content.push({
						type: 'image',
						data: base64Image,
						mimeType: 'image/jpeg'
					});
				}
			} catch (imageError) {
				console.error('Error fetching character image:', imageError);
			}
		}

		return { content };
	} catch (error) {
		console.error('Error getting character details:', error);
		return {
			content: [{ type: 'text', text: `Error getting character details: ${error}` }],
			isError: true,
		};
	}
}

/**
 * Search for characters on AniList
 */
export async function searchCharacters(params: {
	search: string;
	page?: number;
	perPage?: number;
}, env: Environment): Promise<JilebiToolResponse> {
	try {
		const { search, page = 1, perPage = 10 } = params;

		const query = `
			query ($search: String, $page: Int, $perPage: Int) {
				Page(page: $page, perPage: $perPage) {
					pageInfo {
						hasNextPage
						currentPage
						lastPage
						perPage
						total
					}
					characters(search: $search) {
						id
						name {
							first
							middle
							last
							full
							native
						}
						description
						image {
							large
							medium
						}
						siteUrl
					}
				}
			}
		`;

		const response = await executeGraphQLQuery<AniListCharacter>(query, { search, page, perPage });

		if (response.errors) {
			throw new Error(`GraphQL errors: ${response.errors.map(e => e.message).join(', ')}`);
		}

		const characters = response.data?.Page?.characters || [];
		const pageInfo = response.data?.Page?.pageInfo;

		if (characters.length === 0) {
			return {
				content: [{ type: 'text', text: `No characters found matching "${search}".` }],
			};
		}

		let text = `Found ${pageInfo?.total || characters.length} character results (Page ${page}/${pageInfo?.lastPage || 1}):\n\n`;

		characters.forEach((character, index) => {
			const name = character.name?.full || character.name?.first || 'Unknown Name';
			const description = character.description
				? character.description.replace(/<[^>]*>/g, '').substring(0, 150) + '...'
				: 'No description available';

			text += `${index + 1}. **${name}** (ID: ${character.id})\n`;
			if (character.name?.native) text += `Native: ${character.name.native}\n`;
			text += `${description}\n`;
			if (character.siteUrl) text += `URL: ${character.siteUrl}\n`;
			text += '\n';
		});

		if (pageInfo?.hasNextPage) {
			text += `Use page ${page + 1} to see more results.`;
		}

		return {
			content: [{ type: 'text', text }],
		};
	} catch (error) {
		console.error('Error searching characters:', error);
		return {
			content: [{ type: 'text', text: `Error searching characters: ${error}` }],
			isError: true,
		};
	}
}

/**
 * Get currently trending anime
 */
export async function getTrendingAnime(params: {
	page?: number;
	perPage?: number;
}, env: Environment): Promise<JilebiToolResponse> {
	try {
		const { page = 1, perPage = 10 } = params;

		const query = `
			query ($page: Int, $perPage: Int) {
				Page(page: $page, perPage: $perPage) {
					pageInfo {
						hasNextPage
						currentPage
						lastPage
						perPage
						total
					}
					media(sort: TRENDING_DESC, type: ANIME) {
						id
						title {
							romaji
							english
							native
						}
						description
						format
						status
						episodes
						genres
						averageScore
						popularity
						trending
						startDate {
							year
							month
							day
						}
						coverImage {
							large
							medium
						}
						siteUrl
					}
				}
			}
		`;

		const response = await executeGraphQLQuery<AniListMedia>(query, { page, perPage });

		if (response.errors) {
			throw new Error(`GraphQL errors: ${response.errors.map(e => e.message).join(', ')}`);
		}

		const media = response.data?.Page?.media || [];
		const pageInfo = response.data?.Page?.pageInfo;

		if (media.length === 0) {
			return {
				content: [{ type: 'text', text: `No trending anime found.` }],
			};
		}

		let text = `🔥 **Trending Anime** (Page ${page}/${pageInfo?.lastPage || 1}):\n\n`;

		media.forEach((anime, index) => {
			text += `${index + 1}. ${formatMediaInfo(anime, true)}\n`;
		});

		if (pageInfo?.hasNextPage) {
			text += `\nUse page ${page + 1} to see more trending anime.`;
		}

		return {
			content: [{ type: 'text', text }],
		};
	} catch (error) {
		console.error('Error getting trending anime:', error);
		return {
			content: [{ type: 'text', text: `Error getting trending anime: ${error}` }],
			isError: true,
		};
	}
}

/**
 * Get currently trending manga
 */
export async function getTrendingManga(params: {
	page?: number;
	perPage?: number;
}, env: Environment): Promise<JilebiToolResponse> {
	try {
		const { page = 1, perPage = 10 } = params;

		const query = `
			query ($page: Int, $perPage: Int) {
				Page(page: $page, perPage: $perPage) {
					pageInfo {
						hasNextPage
						currentPage
						lastPage
						perPage
						total
					}
					media(sort: TRENDING_DESC, type: MANGA) {
						id
						title {
							romaji
							english
							native
						}
						description
						format
						status
						chapters
						volumes
						genres
						averageScore
						popularity
						trending
						startDate {
							year
							month
							day
						}
						coverImage {
							large
							medium
						}
						siteUrl
					}
				}
			}
		`;

		const response = await executeGraphQLQuery<AniListMedia>(query, { page, perPage });

		if (response.errors) {
			throw new Error(`GraphQL errors: ${response.errors.map(e => e.message).join(', ')}`);
		}

		const media = response.data?.Page?.media || [];
		const pageInfo = response.data?.Page?.pageInfo;

		if (media.length === 0) {
			return {
				content: [{ type: 'text', text: `No trending manga found.` }],
			};
		}

		let text = `📚 **Trending Manga** (Page ${page}/${pageInfo?.lastPage || 1}):\n\n`;

		media.forEach((manga, index) => {
			text += `${index + 1}. ${formatMediaInfo(manga, false)}\n`;
		});

		if (pageInfo?.hasNextPage) {
			text += `\nUse page ${page + 1} to see more trending manga.`;
		}

		return {
			content: [{ type: 'text', text }],
		};
	} catch (error) {
		console.error('Error getting trending manga:', error);
		return {
			content: [{ type: 'text', text: `Error getting trending manga: ${error}` }],
			isError: true,
		};
	}
}