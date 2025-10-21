/**
 * Wikipedia Jilebi Plugin
 * Provides comprehensive Wikipedia API access through Jilebi plugin interface
 * 
 */

// Jilebi Plugin Response Types
interface JilebiTextContent {
	type: 'text';
	text: string;
}

interface JilebiToolResponse {
	content: JilebiTextContent[];
	isError?: boolean;
}

// Environment interface for accessing configuration
interface Environment {
	WIKIPEDIA_LANGUAGE?: string;
	WIKIPEDIA_COUNTRY?: string;
	WIKIPEDIA_ENABLE_CACHE?: string;
	WIKIPEDIA_ACCESS_TOKEN?: string;
}

// Wikipedia Client Helper Class
class WikipediaClient {
	private language: string;
	private country: string | null;
	private enableCache: boolean;
	private accessToken: string | null;
	private baseLanguage: string;
	private apiUrl: string;
	private userAgent: string;

	// Language variant mappings
	private static LANGUAGE_VARIANTS: Record<string, string> = {
		'zh-hans': 'zh',
		'zh-hant': 'zh',
		'zh-tw': 'zh',
		'zh-hk': 'zh',
		'zh-mo': 'zh',
		'zh-cn': 'zh',
		'zh-sg': 'zh',
		'zh-my': 'zh',
		'sr-latn': 'sr',
		'sr-cyrl': 'sr',
		'no': 'nb',
		'ku-latn': 'ku',
		'ku-arab': 'ku',
	};

	// Country to language mappings (partial list for common countries)
	private static COUNTRY_TO_LANGUAGE: Record<string, string> = {
		'US': 'en', 'USA': 'en', 'United States': 'en',
		'UK': 'en', 'GB': 'en', 'United Kingdom': 'en',
		'CA': 'en', 'Canada': 'en',
		'AU': 'en', 'Australia': 'en',
		'CN': 'zh-hans', 'China': 'zh-hans',
		'TW': 'zh-tw', 'Taiwan': 'zh-tw',
		'HK': 'zh-hk', 'Hong Kong': 'zh-hk',
		'DE': 'de', 'Germany': 'de',
		'FR': 'fr', 'France': 'fr',
		'ES': 'es', 'Spain': 'es',
		'IT': 'it', 'Italy': 'it',
		'JP': 'ja', 'Japan': 'ja',
		'KR': 'ko', 'South Korea': 'ko',
		'IN': 'hi', 'India': 'hi',
		'BR': 'pt', 'Brazil': 'pt',
		'MX': 'es', 'Mexico': 'es',
		'RU': 'ru', 'Russia': 'ru',
	};

	constructor(language: string = 'en', country: string | null = null, enableCache: boolean = false, accessToken: string | null = null) {
		this.country = country;
		this.enableCache = enableCache;
		this.accessToken = accessToken;
		this.userAgent = 'WikipediaJilebiPlugin/1.0.0';

		// Resolve country to language if provided
		if (country) {
			this.language = this.resolveCountryToLanguage(country);
		} else {
			this.language = language;
		}

		// Parse language variant
		this.baseLanguage = this.parseLanguageVariant(this.language);
		this.apiUrl = `https://${this.baseLanguage}.wikipedia.org/w/api.php`;
	}

	private resolveCountryToLanguage(country: string): string {
		const countryUpper = country.toUpperCase().trim();
		const countryTitle = country.charAt(0).toUpperCase() + country.slice(1).toLowerCase();

		if (WikipediaClient.COUNTRY_TO_LANGUAGE[countryUpper]) {
			return WikipediaClient.COUNTRY_TO_LANGUAGE[countryUpper];
		}
		if (WikipediaClient.COUNTRY_TO_LANGUAGE[countryTitle]) {
			return WikipediaClient.COUNTRY_TO_LANGUAGE[countryTitle];
		}
		if (WikipediaClient.COUNTRY_TO_LANGUAGE[country]) {
			return WikipediaClient.COUNTRY_TO_LANGUAGE[country];
		}

		throw new Error(`Unsupported country/locale: '${country}'`);
	}

	private parseLanguageVariant(language: string): string {
		if (WikipediaClient.LANGUAGE_VARIANTS[language]) {
			return WikipediaClient.LANGUAGE_VARIANTS[language];
		}
		return language;
	}

	private getHeaders(): Record<string, string> {
		const headers: Record<string, string> = {
			'User-Agent': this.userAgent,
			'Accept': 'application/json',
		};

		if (this.accessToken) {
			headers['Authorization'] = `Bearer ${this.accessToken}`;
		}

		return headers;
	}

	async search(query: string, limit: number = 10): Promise<any[]> {
		if (!query || !query.trim()) {
			return [];
		}

		const trimmedQuery = query.trim().substring(0, 300);
		const validLimit = Math.min(Math.max(limit, 1), 500);

		const params = new URLSearchParams({
			action: 'query',
			format: 'json',
			list: 'search',
			utf8: '1',
			srsearch: trimmedQuery,
			srlimit: validLimit.toString(),
		});

		try {
			const response = await fetch(`${this.apiUrl}?${params}`, {
				headers: this.getHeaders(),
			});

			if (!response.ok) {
				throw new Error(`HTTP error! status: ${response.status}`);
			}

			const data = await response.json();

			if (data.error) {
				console.error('Wikipedia API error:', data.error);
				return [];
			}

			const searchResults = data.query?.search || [];
			return searchResults.map((item: any) => ({
				title: item.title,
				snippet: item.snippet || '',
				pageid: item.pageid || 0,
				wordcount: item.wordcount || 0,
				timestamp: item.timestamp || '',
			}));
		} catch (error) {
			console.error('Search error:', error);
			return [];
		}
	}

	async getArticle(title: string): Promise<any> {
		const params = new URLSearchParams({
			action: 'query',
			format: 'json',
			prop: 'extracts|info|categories|links',
			titles: title,
			exintro: '0',
			explaintext: '1',
			inprop: 'url',
			cllimit: '100',
			pllimit: '100',
		});

		try {
			const response = await fetch(`${this.apiUrl}?${params}`, {
				headers: this.getHeaders(),
			});

			if (!response.ok) {
				throw new Error(`HTTP error! status: ${response.status}`);
			}

			const data = await response.json();
			const pages = data.query?.pages || {};
			const page = Object.values(pages)[0] as any;

			if (!page || page.pageid < 0) {
				return {
					title,
					exists: false,
					error: 'Page does not exist',
				};
			}

			const categories = (page.categories || []).map((cat: any) => cat.title);
			const links = (page.links || []).map((link: any) => link.title).slice(0, 100);

			return {
				title: page.title,
				pageid: page.pageid,
				text: page.extract || '',
				url: page.fullurl,
				categories,
				links,
				exists: true,
			};
		} catch (error) {
			console.error('Get article error:', error);
			return {
				title,
				exists: false,
				error: String(error),
			};
		}
	}

	async getSummary(title: string): Promise<string> {
		const params = new URLSearchParams({
			action: 'query',
			format: 'json',
			prop: 'extracts',
			titles: title,
			exintro: '1',
			explaintext: '1',
		});

		try {
			const response = await fetch(`${this.apiUrl}?${params}`, {
				headers: this.getHeaders(),
			});

			if (!response.ok) {
				throw new Error(`HTTP error! status: ${response.status}`);
			}

			const data = await response.json();
			const pages = data.query?.pages || {};
			const page = Object.values(pages)[0] as any;

			if (!page || page.pageid < 0) {
				return `No Wikipedia article found for '${title}'.`;
			}

			return page.extract || 'No summary available.';
		} catch (error) {
			console.error('Get summary error:', error);
			return `Error retrieving summary for '${title}': ${error}`;
		}
	}

	async testConnectivity(): Promise<any> {
		const params = new URLSearchParams({
			action: 'query',
			format: 'json',
			meta: 'siteinfo',
			siprop: 'general',
		});

		const startTime = Date.now();

		try {
			const response = await fetch(`${this.apiUrl}?${params}`, {
				headers: this.getHeaders(),
			});

			const endTime = Date.now();

			if (!response.ok) {
				throw new Error(`HTTP error! status: ${response.status}`);
			}

			const data = await response.json();
			const siteInfo = data.query?.general || {};

			return {
				status: 'success',
				url: this.apiUrl,
				language: this.baseLanguage,
				site_name: siteInfo.sitename || 'Unknown',
				server: siteInfo.server || 'Unknown',
				response_time_ms: endTime - startTime,
			};
		} catch (error) {
			return {
				status: 'failed',
				url: this.apiUrl,
				language: this.baseLanguage,
				error: String(error),
				error_type: error instanceof Error ? error.constructor.name : 'Unknown',
			};
		}
	}

	async getSections(title: string): Promise<any[]> {
		const params = new URLSearchParams({
			action: 'parse',
			format: 'json',
			page: title,
			prop: 'sections',
		});

		try {
			const response = await fetch(`${this.apiUrl}?${params}`, {
				headers: this.getHeaders(),
			});

			if (!response.ok) {
				throw new Error(`HTTP error! status: ${response.status}`);
			}

			const data = await response.json();

			if (data.error) {
				return [];
			}

			return data.parse?.sections || [];
		} catch (error) {
			console.error('Get sections error:', error);
			return [];
		}
	}

	async getLinks(title: string): Promise<string[]> {
		const params = new URLSearchParams({
			action: 'query',
			format: 'json',
			prop: 'links',
			titles: title,
			pllimit: 'max',
		});

		try {
			const response = await fetch(`${this.apiUrl}?${params}`, {
				headers: this.getHeaders(),
			});

			if (!response.ok) {
				throw new Error(`HTTP error! status: ${response.status}`);
			}

			const data = await response.json();
			const pages = data.query?.pages || {};
			const page = Object.values(pages)[0] as any;

			if (!page || page.pageid < 0) {
				return [];
			}

			return (page.links || []).map((link: any) => link.title);
		} catch (error) {
			console.error('Get links error:', error);
			return [];
		}
	}

	async getRelatedTopics(title: string, limit: number = 10): Promise<any[]> {
		try {
			const links = await this.getLinks(title);
			const related: any[] = [];

			for (const linkTitle of links.slice(0, limit)) {
				const summary = await this.getSummary(linkTitle);
				const truncatedSummary = summary.length > 200 ? summary.substring(0, 200) + '...' : summary;

				related.push({
					title: linkTitle,
					summary: truncatedSummary,
					type: 'link',
				});

				if (related.length >= limit) {
					break;
				}
			}

			return related;
		} catch (error) {
			console.error('Get related topics error:', error);
			return [];
		}
	}

	async summarizeForQuery(title: string, query: string, maxLength: number = 250): Promise<string> {
		try {
			const article = await this.getArticle(title);

			if (!article.exists) {
				return `No Wikipedia article found for '${title}'.`;
			}

			const textContent = article.text;
			const queryLower = query.toLowerCase();
			const textLower = textContent.toLowerCase();

			const startIndex = textLower.indexOf(queryLower);

			if (startIndex === -1) {
				// Query not found, return beginning of text
				const snippet = textContent.substring(0, maxLength);
				return snippet.length >= maxLength ? snippet + '...' : snippet;
			}

			// Get context around the query
			const contextStart = Math.max(0, startIndex - Math.floor(maxLength / 2));
			const contextEnd = Math.min(textContent.length, startIndex + query.length + Math.floor(maxLength / 2));

			let snippet = textContent.substring(contextStart, contextEnd);

			if (snippet.length > maxLength) {
				snippet = snippet.substring(0, maxLength);
			}

			return snippet.length >= maxLength || contextEnd < textContent.length ? snippet + '...' : snippet;
		} catch (error) {
			console.error('Summarize for query error:', error);
			return `Error generating query-focused summary for '${title}': ${error}`;
		}
	}

	async summarizeSection(title: string, sectionTitle: string, maxLength: number = 150): Promise<string> {
		try {
			const sections = await this.getSections(title);
			const targetSection = sections.find(
				(s: any) => s.line?.toLowerCase() === sectionTitle.toLowerCase()
			);

			if (!targetSection) {
				return `Section '${sectionTitle}' not found in article '${title}'.`;
			}

			// Get the section content
			const params = new URLSearchParams({
				action: 'parse',
				format: 'json',
				page: title,
				prop: 'text',
				section: targetSection.index,
				disablelimitreport: '1',
			});

			const response = await fetch(`${this.apiUrl}?${params}`, {
				headers: this.getHeaders(),
			});

			if (!response.ok) {
				throw new Error(`HTTP error! status: ${response.status}`);
			}

			const data = await response.json();
			const html = data.parse?.text?.['*'] || '';

			// Simple HTML to text conversion (remove tags)
			const text = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

			if (!text) {
				return `Section '${sectionTitle}' is empty in article '${title}'.`;
			}

			const summary = text.substring(0, maxLength);
			return text.length > maxLength ? summary + '...' : summary;
		} catch (error) {
			console.error('Summarize section error:', error);
			return `Error summarizing section '${sectionTitle}': ${error}`;
		}
	}

	async extractFacts(title: string, topicWithinArticle: string | null = null, count: number = 5): Promise<string[]> {
		try {
			let textToProcess = '';

			if (topicWithinArticle) {
				// Try to get section content
				const sectionText = await this.summarizeSection(title, topicWithinArticle, 1000);
				if (!sectionText.startsWith('Section') && !sectionText.startsWith('Error')) {
					textToProcess = sectionText;
				} else {
					// Fallback to summary
					textToProcess = await this.getSummary(title);
				}
			} else {
				textToProcess = await this.getSummary(title);
			}

			if (!textToProcess || textToProcess.startsWith('No Wikipedia') || textToProcess.startsWith('Error')) {
				return ['No content found to extract facts from.'];
			}

			// Basic sentence splitting
			const sentences = textToProcess
				.split('.')
				.map(s => s.trim())
				.filter(s => s.length > 10); // Filter out very short fragments

			const facts: string[] = [];
			for (let i = 0; i < Math.min(count, sentences.length); i++) {
				if (sentences[i]) {
					facts.push(sentences[i] + '.');
				}
			}

			return facts.length > 0 ? facts : ['Could not extract facts from the provided text.'];
		} catch (error) {
			console.error('Extract facts error:', error);
			return [`Error extracting key facts for '${title}': ${error}`];
		}
	}

	async getCoordinates(title: string): Promise<any> {
		const params = new URLSearchParams({
			action: 'query',
			format: 'json',
			prop: 'coordinates',
			titles: title,
		});

		try {
			const response = await fetch(`${this.apiUrl}?${params}`, {
				headers: this.getHeaders(),
			});

			if (!response.ok) {
				throw new Error(`HTTP error! status: ${response.status}`);
			}

			const data = await response.json();
			const pages = data.query?.pages || {};
			const page = Object.values(pages)[0] as any;

			if (!page || page.pageid < 0) {
				return {
					title,
					coordinates: null,
					exists: false,
					error: 'Page does not exist',
				};
			}

			const coordinates = page.coordinates || [];

			if (coordinates.length === 0) {
				return {
					title: page.title,
					pageid: page.pageid,
					coordinates: null,
					exists: true,
					error: null,
					message: 'No coordinates available for this article',
				};
			}

			const processedCoordinates = coordinates.map((coord: any) => ({
				latitude: coord.lat,
				longitude: coord.lon,
				primary: coord.primary || false,
				globe: coord.globe || 'earth',
				type: coord.type || '',
				name: coord.name || '',
				region: coord.region || '',
				country: coord.country || '',
			}));

			return {
				title: page.title,
				pageid: page.pageid,
				coordinates: processedCoordinates,
				exists: true,
				error: null,
			};
		} catch (error) {
			console.error('Get coordinates error:', error);
			return {
				title,
				coordinates: null,
				exists: false,
				error: String(error),
			};
		}
	}
}

// Helper function to create Wikipedia client from environment
function createClient(env: Environment): WikipediaClient {
	const language = env.WIKIPEDIA_LANGUAGE || 'en';
	const country = env.WIKIPEDIA_COUNTRY || null;
	const enableCache = env.WIKIPEDIA_ENABLE_CACHE === 'true';
	const accessToken = env.WIKIPEDIA_ACCESS_TOKEN || null;

	return new WikipediaClient(language, country, enableCache, accessToken);
}

// Tool function implementations

export async function search_wikipedia(
	params: { query: string; limit?: number },
	env: Environment
): Promise<JilebiToolResponse> {
	try {
		const client = createClient(env);
		const { query, limit = 10 } = params;

		if (!query || !query.trim()) {
			return {
				content: [{
					type: 'text',
					text: JSON.stringify({
						query,
						results: [],
						status: 'error',
						message: 'Empty or invalid search query provided',
					}),
				}],
				isError: true,
			};
		}

		const results = await client.search(query, limit);
		const status = results.length > 0 ? 'success' : 'no_results';

		const response = {
			query,
			results,
			status,
			count: results.length,
			language: client['baseLanguage'],
		};

		if (results.length === 0) {
			(response as any).message = 'No search results found. This could indicate connectivity issues, API errors, or simply no matching articles.';
		}

		return {
			content: [{
				type: 'text',
				text: JSON.stringify(response, null, 2),
			}],
		};
	} catch (error) {
		return {
			content: [{
				type: 'text',
				text: `Error searching Wikipedia: ${error}`,
			}],
			isError: true,
		};
	}
}

export async function test_wikipedia_connectivity(
	params: {},
	env: Environment
): Promise<JilebiToolResponse> {
	try {
		const client = createClient(env);
		const result = await client.testConnectivity();

		return {
			content: [{
				type: 'text',
				text: JSON.stringify(result, null, 2),
			}],
		};
	} catch (error) {
		return {
			content: [{
				type: 'text',
				text: `Error testing connectivity: ${error}`,
			}],
			isError: true,
		};
	}
}

export async function get_article(
	params: { title: string },
	env: Environment
): Promise<JilebiToolResponse> {
	try {
		const client = createClient(env);
		const { title } = params;
		const article = await client.getArticle(title);

		return {
			content: [{
				type: 'text',
				text: JSON.stringify(article, null, 2),
			}],
		};
	} catch (error) {
		return {
			content: [{
				type: 'text',
				text: `Error getting article: ${error}`,
			}],
			isError: true,
		};
	}
}

export async function get_summary(
	params: { title: string },
	env: Environment
): Promise<JilebiToolResponse> {
	try {
		const client = createClient(env);
		const { title } = params;
		const summary = await client.getSummary(title);

		return {
			content: [{
				type: 'text',
				text: JSON.stringify({
					title,
					summary,
				}, null, 2),
			}],
		};
	} catch (error) {
		return {
			content: [{
				type: 'text',
				text: `Error getting summary: ${error}`,
			}],
			isError: true,
		};
	}
}

export async function summarize_article_for_query(
	params: { title: string; query: string; max_length?: number },
	env: Environment
): Promise<JilebiToolResponse> {
	try {
		const client = createClient(env);
		const { title, query, max_length = 250 } = params;
		const summary = await client.summarizeForQuery(title, query, max_length);

		return {
			content: [{
				type: 'text',
				text: JSON.stringify({
					title,
					query,
					summary,
				}, null, 2),
			}],
		};
	} catch (error) {
		return {
			content: [{
				type: 'text',
				text: `Error summarizing article for query: ${error}`,
			}],
			isError: true,
		};
	}
}

export async function summarize_article_section(
	params: { title: string; section_title: string; max_length?: number },
	env: Environment
): Promise<JilebiToolResponse> {
	try {
		const client = createClient(env);
		const { title, section_title, max_length = 150 } = params;
		const summary = await client.summarizeSection(title, section_title, max_length);

		return {
			content: [{
				type: 'text',
				text: JSON.stringify({
					title,
					section_title,
					summary,
				}, null, 2),
			}],
		};
	} catch (error) {
		return {
			content: [{
				type: 'text',
				text: `Error summarizing section: ${error}`,
			}],
			isError: true,
		};
	}
}

export async function extract_key_facts(
	params: { title: string; topic_within_article?: string; count?: number },
	env: Environment
): Promise<JilebiToolResponse> {
	try {
		const client = createClient(env);
		const { title, topic_within_article = '', count = 5 } = params;
		const topic = topic_within_article.trim() || null;
		const facts = await client.extractFacts(title, topic, count);

		return {
			content: [{
				type: 'text',
				text: JSON.stringify({
					title,
					topic_within_article: topic_within_article,
					facts,
				}, null, 2),
			}],
		};
	} catch (error) {
		return {
			content: [{
				type: 'text',
				text: `Error extracting key facts: ${error}`,
			}],
			isError: true,
		};
	}
}

export async function get_related_topics(
	params: { title: string; limit?: number },
	env: Environment
): Promise<JilebiToolResponse> {
	try {
		const client = createClient(env);
		const { title, limit = 10 } = params;
		const relatedTopics = await client.getRelatedTopics(title, limit);

		return {
			content: [{
				type: 'text',
				text: JSON.stringify({
					title,
					related_topics: relatedTopics,
				}, null, 2),
			}],
		};
	} catch (error) {
		return {
			content: [{
				type: 'text',
				text: `Error getting related topics: ${error}`,
			}],
			isError: true,
		};
	}
}

export async function get_sections(
	params: { title: string },
	env: Environment
): Promise<JilebiToolResponse> {
	try {
		const client = createClient(env);
		const { title } = params;
		const sections = await client.getSections(title);

		return {
			content: [{
				type: 'text',
				text: JSON.stringify({
					title,
					sections,
				}, null, 2),
			}],
		};
	} catch (error) {
		return {
			content: [{
				type: 'text',
				text: `Error getting sections: ${error}`,
			}],
			isError: true,
		};
	}
}

export async function get_links(
	params: { title: string },
	env: Environment
): Promise<JilebiToolResponse> {
	try {
		const client = createClient(env);
		const { title } = params;
		const links = await client.getLinks(title);

		return {
			content: [{
				type: 'text',
				text: JSON.stringify({
					title,
					links,
				}, null, 2),
			}],
		};
	} catch (error) {
		return {
			content: [{
				type: 'text',
				text: `Error getting links: ${error}`,
			}],
			isError: true,
		};
	}
}

export async function get_coordinates(
	params: { title: string },
	env: Environment
): Promise<JilebiToolResponse> {
	try {
		const client = createClient(env);
		const { title } = params;
		const coordinates = await client.getCoordinates(title);

		return {
			content: [{
				type: 'text',
				text: JSON.stringify(coordinates, null, 2),
			}],
		};
	} catch (error) {
		return {
			content: [{
				type: 'text',
				text: `Error getting coordinates: ${error}`,
			}],
			isError: true,
		};
	}
}
