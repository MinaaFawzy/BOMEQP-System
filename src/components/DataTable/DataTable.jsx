import { useState, useMemo, useEffect, useRef } from 'react';
import { Edit, Trash2, Eye, ChevronLeft, ChevronRight, Search, Filter, X, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import './DataTable.css';

const DataTable = ({ 
  columns, 
  data, 
  onEdit, 
  onDelete, 
  onView,
  onRowClick,
  isLoading = false,
  emptyMessage = 'No data available',
  searchable = true,
  filterable = true,
  searchPlaceholder = 'Search...',
  filterOptions = null,
  sortable = true,
  defaultFilter = 'all'
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilter, setSelectedFilter] = useState(defaultFilter);
  const [showFilters, setShowFilters] = useState(false);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const filterRef = useRef(null);

  // Update filter when defaultFilter prop changes
  useEffect(() => {
    setSelectedFilter(defaultFilter);
  }, [defaultFilter]);

  // Close filter dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (filterRef.current && !filterRef.current.contains(event.target)) {
        setShowFilters(false);
      }
    };

    if (showFilters) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showFilters]);

  const handleRowClick = (row, e) => {
    // Don't trigger row click if clicking on action buttons or clickable elements
    if (e.target.closest('button') || 
        e.target.closest('a') || 
        e.target.closest('.enrollment-clickable') ||
        e.target.classList.contains('enrollment-clickable')) {
      return;
    }
    if (onRowClick) {
      onRowClick(row);
    } else if (onView) {
      onView(row);
    }
  };

  // Handle sorting
  const handleSort = (column) => {
    if (!sortable || column.sortable === false) return;
    
    let direction = 'asc';
    if (sortConfig.key === column.accessor && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key: column.accessor, direction });
  };

  // Filter, search and sort logic
  const filteredData = useMemo(() => {
    let filtered = [...data];

    // Apply search filter
    if (searchable && searchTerm) {
      const searchLower = searchTerm.toLowerCase().trim();
      filtered = filtered.filter(row => {
        // First, check if row has _searchText field (for custom searchable text)
        if (row._searchText && typeof row._searchText === 'string') {
          if (row._searchText.includes(searchLower)) {
            return true;
          }
        }
        
        // Otherwise, search in all columns
        return columns.some(column => {
          const value = row[column.accessor];
          if (value === null || value === undefined) return false;
          
          // Handle object values
          if (typeof value === 'object' && !Array.isArray(value)) {
            const objStr = JSON.stringify(value).toLowerCase();
            return objStr.includes(searchLower);
          }
          
          // Handle array values
          if (Array.isArray(value)) {
            return value.some(item => 
              String(item).toLowerCase().includes(searchLower)
            );
          }
          
          return String(value).toLowerCase().includes(searchLower);
        });
      });
    }

    // Apply custom filter
    if (filterable && filterOptions && selectedFilter !== 'all') {
      const filterOption = filterOptions.find(opt => opt.value === selectedFilter);
      if (filterOption && filterOption.filterFn) {
        filtered = filtered.filter(filterOption.filterFn);
      }
    }

    // Apply sorting
    if (sortable && sortConfig.key) {
      filtered.sort((a, b) => {
        const column = columns.find(col => col.accessor === sortConfig.key);
        if (!column) return 0;

        let aValue = a[sortConfig.key];
        let bValue = b[sortConfig.key];

        // Handle object values
        if (aValue && typeof aValue === 'object' && !Array.isArray(aValue)) {
          aValue = aValue.name || aValue.title || JSON.stringify(aValue);
        }
        if (bValue && typeof bValue === 'object' && !Array.isArray(bValue)) {
          bValue = bValue.name || bValue.title || JSON.stringify(bValue);
        }

        // Handle dates
        if (aValue && bValue && (sortConfig.key.includes('date') || sortConfig.key.includes('Date'))) {
          aValue = new Date(aValue);
          bValue = new Date(bValue);
        }

        // Handle numbers
        if (typeof aValue === 'number' && typeof bValue === 'number') {
          return sortConfig.direction === 'asc' ? aValue - bValue : bValue - aValue;
        }

        // Handle strings
        aValue = aValue?.toString().toLowerCase() || '';
        bValue = bValue?.toString().toLowerCase() || '';

        if (aValue < bValue) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }

    return filtered;
  }, [data, searchTerm, selectedFilter, sortConfig, columns, searchable, filterable, filterOptions, sortable]);

  return (
    <>
      {/* Search and Filter Bar */}
      {(searchable || (filterable && filterOptions)) && (
        <div className="data-table-search-container">
          <div className="data-table-search-content">
            {searchable && (
              <div className="data-table-search-input-wrapper">
                <Search className="data-table-search-icon" size={18} />
                <input
                  type="text"
                  placeholder={searchPlaceholder}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="data-table-search-input"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="data-table-search-clear"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
            )}
            {filterable && filterOptions && (
              <div className="data-table-filter-wrapper" ref={filterRef}>
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={`data-table-filter-button ${
                    selectedFilter !== 'all' ? 'data-table-filter-button-active' : ''
                  }`}
                >
                  <Filter size={18} />
                  <span className="data-table-filter-text">
                    {filterOptions.find(opt => opt.value === selectedFilter)?.label || 'All'}
                  </span>
                </button>
                {showFilters && (
                  <div className="data-table-filter-dropdown">
                    {filterOptions.map((option) => (
                      <button
                        key={option.value}
                        onClick={() => {
                          setSelectedFilter(option.value);
                          setShowFilters(false);
                        }}
                        className={`data-table-filter-option ${
                          selectedFilter === option.value ? 'data-table-filter-option-active' : ''
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
          {searchTerm && (
            <div className="data-table-search-results">
              Showing {filteredData.length} of {data.length} results
            </div>
          )}
        </div>
      )}
      {/* Table */}
      <div className="data-table-container">
        <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="data-table-header">
            <tr>
              {columns.map((column, index) => {
                const isSortable = sortable && column.sortable !== false;
                const isSorted = sortConfig.key === column.accessor;
                return (
                  <th
                    key={index}
                    className={`data-table-th ${isSortable ? 'data-table-th-sortable' : ''}`}
                    onClick={() => isSortable && handleSort(column)}
                  >
                    <div className="data-table-th-content">
                      <span>{column.header}</span>
                      {isSortable && (
                        <span className="data-table-sort-icon">
                          {isSorted ? (
                            sortConfig.direction === 'asc' ? (
                              <ArrowUp size={14} />
                            ) : (
                              <ArrowDown size={14} />
                            )
                          ) : (
                            <ArrowUpDown size={14} />
                          )}
                        </span>
                      )}
                    </div>
                  </th>
                );
              })}
              {(onEdit || onDelete || onView) && (
                <th className="data-table-th">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {isLoading ? (
              <tr>
                <td colSpan={columns.length + (onEdit || onDelete || onView ? 1 : 0)} className="px-6 py-12 text-center">
                  <div className="flex justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-4 border-gray-200 border-t-primary-600"></div>
                  </div>
                </td>
              </tr>
            ) : filteredData.length === 0 ? (
              <tr>
                <td colSpan={columns.length + (onEdit || onDelete || onView ? 1 : 0)} className="px-6 py-12 text-center text-gray-500">
                  {searchTerm || selectedFilter !== 'all' ? 'No results found. Try adjusting your search or filters.' : emptyMessage}
                </td>
              </tr>
            ) : (
              filteredData.map((row, rowIndex) => (
                <tr 
                  key={row.id || rowIndex} 
                  className={`hover:bg-gray-50 transition-all duration-200 ease-out hover:shadow-sm ${(onRowClick || onView) ? 'cursor-pointer' : ''} stagger-item`}
                  onClick={(e) => handleRowClick(row, e)}
                  style={{ '--animation-delay': `${rowIndex * 0.03}s` }}
                >
                  {columns.map((column, colIndex) => {
                    const value = row[column.accessor];
                    let displayValue = value;
                    
                    // If no render function and value is an object, try to extract a meaningful string
                    if (!column.render && value && typeof value === 'object' && !Array.isArray(value)) {
                      // Try common object properties
                      displayValue = value.name || value.title || value.first_name || JSON.stringify(value);
                    }
                    
                    return (
                      <td key={colIndex} className="px-3 py-3 whitespace-nowrap text-sm text-gray-900">
                        {column.render ? column.render(value, row) : displayValue}
                      </td>
                    );
                  })}
                  {(onEdit || onDelete || onView) && (
                    <td className="px-3 py-3 whitespace-nowrap text-sm font-medium" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center space-x-2">
                        {(() => {
                          // Always show exactly 2 buttons
                          // Priority: Edit + Delete > View + Edit > View + Delete > View + View (fallback)
                          const buttons = [];
                          
                          if (onEdit && onDelete) {
                            // Show Edit and Delete
                            buttons.push(
                              <button
                                key="edit"
                                onClick={() => onEdit(row)}
                                className="data-table-action-btn data-table-action-edit"
                                title="Edit"
                              >
                                <Edit size={18} />
                              </button>
                            );
                            buttons.push(
                              <button
                                key="delete"
                                onClick={() => onDelete(row)}
                                className="data-table-action-btn data-table-action-delete"
                                title="Delete"
                              >
                                <Trash2 size={18} />
                              </button>
                            );
                          } else if (onView && onEdit) {
                            // Show View and Edit
                            buttons.push(
                              <button
                                key="view"
                                onClick={() => onView(row)}
                                className="data-table-action-btn data-table-action-view"
                                title="View"
                              >
                                <Eye size={18} />
                              </button>
                            );
                            buttons.push(
                              <button
                                key="edit"
                                onClick={() => onEdit(row)}
                                className="data-table-action-btn data-table-action-edit"
                                title="Edit"
                              >
                                <Edit size={18} />
                              </button>
                            );
                          } else if (onView && onDelete) {
                            // Show View and Delete
                            buttons.push(
                              <button
                                key="view"
                                onClick={() => onView(row)}
                                className="data-table-action-btn data-table-action-view"
                                title="View"
                              >
                                <Eye size={18} />
                              </button>
                            );
                            buttons.push(
                              <button
                                key="delete"
                                onClick={() => onDelete(row)}
                                className="data-table-action-btn data-table-action-delete"
                                title="Delete"
                              >
                                <Trash2 size={18} />
                              </button>
                            );
                          } else if (onEdit) {
                            // Only Edit - show Edit once
                            buttons.push(
                              <button
                                key="edit"
                                onClick={() => onEdit(row)}
                                className="data-table-action-btn data-table-action-edit"
                                title="Edit"
                              >
                                <Edit size={18} />
                              </button>
                            );
                          } else if (onDelete) {
                            // Only Delete - show Delete once
                            buttons.push(
                              <button
                                key="delete"
                                onClick={() => onDelete(row)}
                                className="data-table-action-btn data-table-action-delete"
                                title="Delete"
                              >
                                <Trash2 size={18} />
                              </button>
                            );
                          } else if (onView) {
                            // Only View - show View once
                            buttons.push(
                              <button
                                key="view"
                                onClick={() => onView(row)}
                                className="data-table-action-btn data-table-action-view"
                                title="View"
                              >
                                <Eye size={18} />
                              </button>
                            );
                          }
                          
                          return buttons;
                        })()}
                      </div>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
        </div>
      </div>
    </>
  );
};

export default DataTable;
