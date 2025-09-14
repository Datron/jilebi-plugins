# Met Museum Jilebi Plugin

A Jilebi plugin for accessing the Metropolitan Museum of Art collection through their public API.

## Features

- **List Departments**: Get all departments in the Met Museum
- **Search Objects**: Search for objects with various filters (by query, images, title, department)
- **Get Object Details**: Retrieve detailed information about specific museum objects
- **Image Resources**: Access and display images of museum objects

## Tools

### `list-departments`
Lists all departments in the Metropolitan Museum of Art.

**Parameters**: None

**Returns**: List of department IDs and display names

### `search-museum-objects`
Search for objects in the Met Museum collection.

**Parameters**:
- `q` (string, required): Search query
- `hasImages` (boolean, optional): Filter for objects with images
- `title` (boolean, optional): Search by title only
- `departmentId` (number, optional): Filter by department ID

**Returns**: Total count and list of object IDs matching the search criteria

### `get-museum-object`
Get detailed information about a specific museum object.

**Parameters**:
- `objectId` (number, required): The ID of the museum object
- `returnImage` (boolean, optional): Whether to include object images (default: true)

**Returns**: Detailed object information including title, artist, dimensions, etc., and optionally the object's image

## Resources

The plugin provides access to images from museum objects that have been retrieved. Images are stored with URIs in the format `met-image://{object-title}`.

## API Rate Limiting

The plugin includes built-in rate limiting to respect the Met Museum API guidelines, with a minimum 100ms interval between requests.

## Usage Example

```typescript
// List all departments
const departments = await listDepartments();

// Search for paintings
const searchResults = await searchMuseumObjects({
  q: "painting",
  hasImages: true,
  departmentId: 11
});

// Get details for a specific object
const objectDetails = await getMuseumObject({
  objectId: 436524,
  returnImage: true
});
```

## Development

This plugin is built with TypeScript and follows the Jilebi plugin structure. The code is organized into:

- `index.ts`: Main export file with type definitions
- `tools/`: Individual tool implementations
- `utils/helpers.ts`: Shared utilities and type guards
- `manifest.toml`: Plugin configuration and metadata
