// Note: This is a hypothetical file path based on common project structure
// You may need to locate the actual search modal component in your project

class SearchModal {
  constructor() {
    // ... other code
  }

  render() {
    return `
      <div class="search-modal">
        <div class="search-header">
          <h3>搜索 Search</h3> <!-- Removed "用户母语的搜索" -->
        </div>
        <div class="search-content">
          <input type="text" class="search-input" placeholder="Enter search term...">
          <!-- Removed the cancel button below the search box -->
        </div>
        <!-- If there's a separate cancel button in the header, keep it if needed -->
        <button class="modal-close-btn">Close</button>
      </div>
    `;
  }

  // ... other methods
}