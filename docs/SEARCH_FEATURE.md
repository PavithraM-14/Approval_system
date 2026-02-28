# Request Search Feature

## Overview
The Request Search feature allows users to quickly find requests using various search criteria and filters. This feature is available on both the Requests page (for requesters) and the Approvals page (for approvers).

## Features

### 1. Basic Search
- **Text Search**: Search by request title, purpose, or request ID
- **Real-time**: Results update as you type
- **Case-insensitive**: Searches are not case-sensitive

### 2. Advanced Filters
Click the "Filters" button to access advanced search options:

- **Status**: Filter by request status (Manager Review, VP Approval, Approved, Rejected, etc.)
- **College**: Filter by college
- **Department**: Filter by department
- **Expense Category**: Filter by expense category
- **Date Range**: Filter by creation date (from/to)
- **Amount Range**: Filter by cost estimate (min/max)

### 3. Active Filters Display
- See all active filters at a glance
- Quickly identify what filters are applied
- Clear individual filters or all at once

### 4. Role-Based Visibility
- Search results respect role-based permissions
- Requesters only see their own requests
- Approvers see requests relevant to their role

## Usage

### For Requesters
1. Navigate to **Dashboard > My Requests**
2. Use the search bar to find specific requests
3. Click "Filters" to access advanced search options
4. Apply filters and click "Search"
5. Clear filters with the "Clear" button

### For Approvers
1. Navigate to **Dashboard > Pending Approvals**
2. Use the search bar to find requests
3. Apply filters as needed
4. Search results will show only requests you have permission to view

## API Endpoint

### GET `/api/requests/search`

**Query Parameters:**
- `query` - Text search (title, purpose, requestId)
- `status` - Request status
- `college` - College name
- `department` - Department name
- `expenseCategory` - Expense category
- `dateFrom` - Start date (YYYY-MM-DD)
- `dateTo` - End date (YYYY-MM-DD)
- `minAmount` - Minimum cost estimate
- `maxAmount` - Maximum cost estimate

**Example:**
```
GET /api/requests/search?query=laptop&status=pending&minAmount=10000&maxAmount=50000
```

**Response:**
```json
{
  "requests": [...],
  "total": 5,
  "query": {
    "query": "laptop",
    "status": "pending",
    "minAmount": "10000",
    "maxAmount": "50000"
  }
}
```

## Components

### RequestSearch Component
Location: `components/RequestSearch.tsx`

**Props:**
- `onSearch`: Callback function when search is triggered
- `onClear`: Callback function when filters are cleared
- `colleges`: Array of available colleges
- `departments`: Array of available departments
- `expenseCategories`: Array of available expense categories

**Features:**
- Collapsible advanced filters
- Active filters display
- Keyboard support (Enter to search)
- Responsive design

## Technical Details

### Search Implementation
1. **Frontend**: React component with controlled inputs
2. **Backend**: MongoDB text search with regex matching
3. **Filtering**: Role-based visibility applied after search
4. **Performance**: Indexed fields for faster searches

### Security
- All searches respect role-based permissions
- User authentication required
- Visibility filtering applied server-side

## Future Enhancements
- [ ] Save search filters as presets
- [ ] Export search results
- [ ] Advanced search operators (AND, OR, NOT)
- [ ] Search history
- [ ] Autocomplete suggestions
- [ ] Full-text search indexing for better performance

## Testing

To test the search feature:

1. Create multiple requests with different attributes
2. Try searching by title, purpose, or request ID
3. Apply various filters and combinations
4. Verify role-based visibility works correctly
5. Test date and amount range filters
6. Verify search works on both Requests and Approvals pages

## Troubleshooting

**Search returns no results:**
- Check if filters are too restrictive
- Verify you have permission to view the requests
- Clear all filters and try again

**Search is slow:**
- Consider adding database indexes on frequently searched fields
- Limit the number of results returned
- Use more specific search criteria

**Filters not working:**
- Ensure you click the "Search" button after applying filters
- Check browser console for errors
- Verify API endpoint is accessible
