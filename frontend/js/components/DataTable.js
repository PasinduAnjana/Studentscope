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
        this.emptyStateMessage = "No records found";
        this.emptyStateIcon = "fas fa-search";
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

    setEmptyState(message, icon) {
        if (message) this.emptyStateMessage = message;
        if (icon) this.emptyStateIcon = icon;
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

                <div class="input-group" style="margin-left: auto; display: flex; gap: 8px;">
                     <button id="dt-export-btn" class="btn btn-secondary" style="padding: 8px 12px;">
                        <i class="fas fa-download"></i> Export
                    </button>
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
            </div>

            <!-- Export Modal Overlay -->
            <div id="dt-export-modal" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 2000; align-items: center; justify-content: center;">
                <div style="background: var(--color-card); padding: 24px; border-radius: 12px; width: 90%; max-width: 400px; display: flex; flex-direction: column; gap: 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.2);">
                    <h3 style="margin: 0; font-size: 18px; color: var(--color-text);">Export Data</h3>
                    
                    <div>
                        <p style="margin: 0 0 8px 0; font-weight: 600; font-size: 14px; color: var(--color-text);">Select Columns:</p>
                        <div id="dt-export-columns" style="max-height: 200px; overflow-y: auto; display: flex; flex-direction: column; gap: 8px;">
                            <!-- Checkboxes injected here -->
                        </div>
                    </div>

                    <div>
                        <p style="margin: 0 0 8px 0; font-weight: 600; font-size: 14px; color: var(--color-text);">Format:</p>
                        <div style="display: flex; gap: 16px;">
                            <label style="display: flex; align-items: center; gap: 6px; cursor: pointer;">
                                <input type="radio" name="export-format" value="csv" checked> CSV
                            </label>
                            <label style="display: flex; align-items: center; gap: 6px; cursor: pointer;">
                                <input type="radio" name="export-format" value="pdf"> PDF (Print)
                            </label>
                        </div>
                    </div>

                    <div style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 8px;">
                        <button id="dt-export-cancel" class="btn btn-secondary">Cancel</button>
                        <button id="dt-export-confirm" class="btn btn-primary">Download</button>
                    </div>
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

        // Export
        const exportBtn = this.querySelector('#dt-export-btn');
        const exportModal = this.querySelector('#dt-export-modal');
        const exportCancel = this.querySelector('#dt-export-cancel');
        const exportConfirm = this.querySelector('#dt-export-confirm');

        if (exportBtn) {
            exportBtn.addEventListener('click', () => this.openExportModal());
        }
        if (exportCancel) {
            exportCancel.addEventListener('click', () => {
                if (exportModal) exportModal.style.display = 'none';
            });
        }
        if (exportConfirm) {
            exportConfirm.addEventListener('click', () => this.executeExport());
        }
    }

    openExportModal() {
        const modal = this.querySelector('#dt-export-modal');
        const container = this.querySelector('#dt-export-columns');
        if (!modal || !container) return;

        container.innerHTML = '';
        this.columns.forEach((col, index) => {
            // Skip action columns or columns without headers
            if (!col.header || col.key === 'actions') return;

            const label = document.createElement('label');
            label.style.display = 'flex';
            label.style.alignItems = 'center';
            label.style.gap = '8px';
            label.style.cursor = 'pointer';
            
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.value = col.key; // Store key to identify column
            checkbox.checked = true; // Default to checked
            checkbox.dataset.header = col.header;
            checkbox.dataset.index = index; // Store index to access render function if needed

            label.appendChild(checkbox);
            label.appendChild(document.createTextNode(col.header));
            container.appendChild(label);
        });

        modal.style.display = 'flex';
    }

    executeExport() {
        const modal = this.querySelector('#dt-export-modal');
        const format = this.querySelector('input[name="export-format"]:checked').value;
        const checkboxes = Array.from(this.querySelectorAll('#dt-export-columns input[type="checkbox"]:checked'));
        
        if (checkboxes.length === 0) {
            alert("Please select at least one column.");
            return;
        }

        const selectedColumns = checkboxes.map(cb => ({
            key: cb.value,
            header: cb.dataset.header,
            index: parseInt(cb.dataset.index)
        }));

        if (format === 'csv') {
            this.exportToCSV(selectedColumns);
        } else {
            this.exportToPDF(selectedColumns);
        }

        modal.style.display = 'none';
    }

    exportToCSV(selectedColumns) {
        const headers = selectedColumns.map(col => col.header).join(',');
        const rows = this.filteredData.map(row => {
            return selectedColumns.map(col => {
                // Get display value
                let val = row[col.key];
                // If there's a specific render function, we might want to use it, 
                // but usually render returns HTML. For CSV we want raw data or clean text.
                // We'll stick to the raw data property if possible, or try to strip HTML from render if absolutely needed.
                // For simplicity/robustness in vanilla, let's use the raw data value or a simple string representation.
                const columnDef = this.columns[col.index];
                if (columnDef && columnDef.render && !val) {
                    // If val is null/undefined but there is a render function, maybe the data is composite
                    // Try to execute render and strip tags (basic)
                    const rendered = columnDef.render(row);
                    if (typeof rendered === 'string') {
                         val = rendered.replace(/<[^>]*>?/gm, ''); // Basic strip tags
                    } else if (rendered instanceof HTMLElement) {
                         val = rendered.textContent;
                    }
                }
                
                // Escape quotes and wrap in quotes
                val = String(val || '').replace(/"/g, '""');
                return `"${val}"`;
            }).join(',');
        });

        const csvContent = [headers, ...rows].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', 'export.csv');
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    exportToPDF(selectedColumns) {
        // Vanilla "PDF" = Print View
        let printWindow = window.open('', '', 'height=600,width=800');
        if (!printWindow) {
            alert("Please allow popups to export options.");
            return;
        }

        const headers = selectedColumns.map(c => `<th>${c.header}</th>`).join('');
        const rows = this.filteredData.map(row => {
            const cells = selectedColumns.map(col => {
                let val = row[col.key];
                 const columnDef = this.columns[col.index];
                 if (columnDef && columnDef.render) {
                    const rendered = columnDef.render(row);
                    if (typeof rendered === 'string') {
                         val = rendered; // Keep HTML for PDF/Print view!
                    } else if (rendered instanceof HTMLElement) {
                         val = rendered.outerHTML;
                    }
                 }
                 return `<td>${val || ''}</td>`;
            }).join('');
            return `<tr>${cells}</tr>`;
        }).join('');

        printWindow.document.write(`
            <html>
            <head>
                <title>Export Data</title>
                <style>
                    body { font-family: sans-serif; padding: 20px; }
                    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 12px; }
                    th { background-color: #f2f2f2; font-weight: bold; }
                    h1 { font-size: 18px; margin-bottom: 20px; }
                </style>
            </head>
            <body>
                <h1>Exported Data</h1>
                <table>
                    <thead><tr>${headers}</tr></thead>
                    <tbody>${rows}</tbody>
                </table>
                <script>
                    window.onload = function() { window.print(); }
                </script>
            </body>
            </html>
        `);
        printWindow.document.close();
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
                td.innerHTML = `<empty-state-message message="${this.emptyStateMessage}" icon="${this.emptyStateIcon}"></empty-state-message>`;
                tr.appendChild(td);
                tbody.appendChild(tr);
            } else {
                tbody.innerHTML = `<tr><td colspan="${this.columns.length || 1}" class="text-center">${this.emptyStateMessage}</td></tr>`;
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
