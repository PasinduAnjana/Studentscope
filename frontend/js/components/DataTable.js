class DataTable extends HTMLElement {
    constructor() {
        super();
        this.data = [];
        this.originalData = [];
        this.columns = [];
        this.currentPage = 1;
        this.pageSize = 25;
        this.filteredData = [];
        this.externalFilters = {}; // Function-based filters
    }

    connectedCallback() {
        // PRESERVE LIGHT DOM CHILDREN (The Filters)
        // Since we are not using Shadow DOM (to keep global styles working easily),
        // setting innerHTML would destroy the slots. We must manually move them.
        const filterContent = this.querySelector('[slot="filters"]');

        this.renderStructure();
        
        // Restore children
        if (filterContent) {
            const widthPlaceholder = this.querySelector('slot[name="filters"]');
            if (widthPlaceholder) {
                widthPlaceholder.replaceWith(filterContent);
            }
        }

        this.initSearchablePageSize();
        this.setupEventListeners();
    }

    initSearchablePageSize() {
        if (typeof makeSearchableDropdown === 'function') {
            const pageSizeSelect = this.querySelector('#dt-page-size');
            if (pageSizeSelect) {
                 makeSearchableDropdown('dt-page-size', (val) => {
                     // The searchable dropdown helper updates the UI, but we need to trigger our logic
                     this.pageSize = parseInt(val);
                     this.currentPage = 1;
                     this.renderRows(); // Just re-render, data is already filtered
                     this.renderPagination();
                 });
            }
        }
    }

    setColumns(columns) {
        this.columns = columns;
        this.renderHeader();
        this.renderRows(); // Render rows immediately if data exists
    }

    setData(data) {
        this.originalData = data;
        this.filterData(); // This will populate filteredData and trigger render
    }

    // New method: Add a filter function
    addFilter(name, filterFn) {
        this.externalFilters[name] = filterFn;
        this.filterData();
    }

    renderStructure() {
        this.innerHTML = `
            <div class="flex mb-2 filter-controls" style="gap: 16px; align-items: baseline; flex-wrap: wrap;">
                <div class="search-group" style="max-width: 350px;">
                    <input type="text" class="search-input" placeholder="Search..." id="dt-search">
                    <span class="search-icon"><i class="fas fa-search"></i></span>
                </div>
                
                <!-- Slot for additional filters (e.g. dropdowns) -->
                <div class="input-group" style="display: contents;">
                    <slot name="filters"></slot>
                </div>

                <div class="input-group">
                    <select id="dt-page-size" class="dropdown-select">
                        <option value="5">5</option>
                        <option value="10">10</option>
                        <option value="25" selected>25</option>
                        <option value="50">50</option>
                        <option value="100">100</option>
                    </select>
                </div>
            </div>

            <style>
                .pagination-controls {
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    gap: 10px;
                    margin-top: 20px;
                    flex-wrap: wrap;
                }
                #dt-pages { display: flex; gap: 5px; }
                #dt-mobile-page { display: none; font-weight: 600; color: var(--color-text); }
                #dt-info { margin-left: 20px; color: var(--color-subtext); }

                @media (max-width: 640px) {
                    #dt-pages { display: none !important; }
                    #dt-mobile-page { display: inline-block !important; }
                    #dt-info { display: none !important; }
                    #dt-prev span, #dt-next span { display: none; } /* Hide text "Previous"/"Next" to save space if needed, or keep it */
                }
            </style>

            <div class="table-responsive">
                <table>
                    <thead>
                        <tr id="dt-header-row"></tr>
                    </thead>
                    <tbody id="dt-body"></tbody>
                </table>
            </div>

            <div class="pagination-controls">
                <button id="dt-prev" class="btn btn-secondary" disabled>
                    <i class="fas fa-chevron-left"></i>
                </button>
                
                <div id="dt-pages"></div>
                <span id="dt-mobile-page"></span>

                <button id="dt-next" class="btn btn-secondary" disabled>
                    <i class="fas fa-chevron-right"></i>
                </button>
                
                <span id="dt-info"></span>
            </div>
        `;
    }

    renderHeader() {
        const tr = this.querySelector('#dt-header-row');
        if (!tr) return;
        tr.innerHTML = this.columns.map(col => `<th>${col.header}</th>`).join('');
    }

    setupEventListeners() {
        // Search
        const searchInput = this.querySelector('#dt-search');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.searchQuery = e.target.value.toLowerCase().trim();
                this.currentPage = 1;
                this.filterData();
            });
        }

        // Page Size
        const pageSizeSelect = this.querySelector('#dt-page-size');
        if (pageSizeSelect) {
            pageSizeSelect.addEventListener('change', (e) => {
                this.pageSize = parseInt(e.target.value);
                this.currentPage = 1;
                this.renderRows(); // Just re-render, data is already filtered
                this.renderPagination();
            });
        }

        // Pagination
        const prevBtn = this.querySelector('#dt-prev');
        const nextBtn = this.querySelector('#dt-next');
        if (prevBtn) prevBtn.addEventListener('click', () => this.changePage(this.currentPage - 1));
        if (nextBtn) nextBtn.addEventListener('click', () => this.changePage(this.currentPage + 1));
    }

    filterData() {
        let res = this.originalData;

        // 1. Text Search
        if (this.searchQuery) {
            res = res.filter(row => {
                // Search in all fields that are specified in columns or just check all values
                // Using column keys is safer
                return this.columns.some(col => {
                    if (col.searchable === false) return false;
                    const val = row[col.key];
                    return val && String(val).toLowerCase().includes(this.searchQuery);
                });
            });
        }

        // 2. External Filters (Dropdowns etc)
        // External filters should register a callback that returns true/false for a row
        for (const key in this.externalFilters) {
            res = res.filter(this.externalFilters[key]);
        }

        this.filteredData = res;
        this.renderRows();
        this.renderPagination();
    }

    renderRows() {
        const tbody = this.querySelector('#dt-body');
        if (!tbody) return;
        tbody.innerHTML = '';

        if (this.filteredData.length === 0) {
            // Use empty state component if available, otherwise text
            if (customElements.get('empty-state-message')) {
                const tr = document.createElement('tr');
                const td = document.createElement('td');
                td.colSpan = this.columns.length || 1;
                td.style.padding = '0';
                td.style.border = 'none';
                td.innerHTML = `<empty-state-message message="No records found" icon="fas fa-search"></empty-state-message>`;
                tr.appendChild(td);
                tbody.appendChild(tr);
            } else {
                tbody.innerHTML = `<tr><td colspan="${this.columns.length || 1}" class="text-center">No records found</td></tr>`;
            }
            return;
        }

        const start = (this.currentPage - 1) * this.pageSize;
        const end = start + this.pageSize;
        const pageData = this.filteredData.slice(start, end);

        pageData.forEach(row => {
            const tr = document.createElement('tr');
            this.columns.forEach(col => {
                const td = document.createElement('td');
                if (col.render) {
                    const content = col.render(row);
                    if (content instanceof HTMLElement) {
                        td.appendChild(content);
                    } else {
                        td.innerHTML = content;
                    }
                } else {
                    td.textContent = row[col.key] || '';
                }
                tr.appendChild(td);
            });
            tbody.appendChild(tr);
        });
    }

    renderPagination() {
        const totalPages = Math.ceil(this.filteredData.length / this.pageSize);
        
        // Ensure current page is valid
        if (this.currentPage > totalPages) this.currentPage = Math.max(1, totalPages);
        if (totalPages === 0) this.currentPage = 1;

        const prevBtn = this.querySelector('#dt-prev');
        const nextBtn = this.querySelector('#dt-next');
        const pagesContainer = this.querySelector('#dt-pages');
        const info = this.querySelector('#dt-info');

        if (!prevBtn || !nextBtn || !pagesContainer || !info) return;

        prevBtn.disabled = this.currentPage <= 1;
        nextBtn.disabled = this.currentPage >= totalPages;

        const startItem = this.filteredData.length > 0 ? (this.currentPage - 1) * this.pageSize + 1 : 0;
        const endItem = Math.min(this.currentPage * this.pageSize, this.filteredData.length);
        info.textContent = `Showing ${startItem}-${endItem} of ${this.filteredData.length}`;

        pagesContainer.innerHTML = '';
        
        // Simple pagination logic (similar to existing)
        const maxVisible = 5;
        let startPage = Math.max(1, this.currentPage - Math.floor(maxVisible / 2));
        let endPage = Math.min(totalPages, startPage + maxVisible - 1);

        if (endPage - startPage + 1 < maxVisible) {
            startPage = Math.max(1, endPage - maxVisible + 1);
        }

        if (startPage > 1) {
             this.addPageBtn(1, pagesContainer);
             if (startPage > 2) pagesContainer.appendChild(document.createTextNode('...'));
        }

        for (let i = startPage; i <= endPage; i++) {
            this.addPageBtn(i, pagesContainer);
        }

        if (endPage < totalPages) {
            if (endPage < totalPages - 1) pagesContainer.appendChild(document.createTextNode('...'));
            this.addPageBtn(totalPages, pagesContainer);
        }

        // Update mobile page display
        const mobilePage = this.querySelector('#dt-mobile-page');
        if (mobilePage) {
            mobilePage.textContent = `Page ${this.currentPage} of ${totalPages}`;
        }
    }

    addPageBtn(pageNum, container) {
        const btn = document.createElement('button');
        btn.className = `btn ${pageNum === this.currentPage ? 'btn-primary' : 'btn-secondary'}`;
        btn.textContent = pageNum;
        btn.onclick = () => this.changePage(pageNum);
        container.appendChild(btn);
    }

    changePage(pageNum) {
        this.currentPage = pageNum;
        this.renderRows();
        this.renderPagination();
    }
}

customElements.define('data-table', DataTable);
