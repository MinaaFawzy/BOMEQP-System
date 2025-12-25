import { useState, useMemo, useEffect, useRef } from 'react';
import { Edit, Trash2, Eye, ChevronLeft, ChevronRight, Search, Filter, X } from 'lucide-react';
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
  filterOptions = null
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const filterRef = useRef(null);

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
    // Don't trigger row click if clicking on action buttons
    if (e.target.closest('button') || e.target.closest('a')) {
      return;
    }
    if (onRowClick) {
      onRowClick(row);
    } else if (onView) {
      onView(row);
    }
  };

  // Filter and search logic
  const filteredData = useMemo(() => {
    let filtered = [...data];

    // Apply search filter
    if (searchable && searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(row => {
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

    return filtered;
  }, [data, searchTerm, selectedFilter, columns, searchable, filterable, filterOptions]);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow duration-300">
      {/* Search and Filter Bar */}
      {(searchable || (filterable && filterOptions)) && (
        <div className="p-4 bg-gray-50 border-b border-gray-200">
          <div className="flex flex-col sm:flex-row gap-3">
            {searchable && (
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="text"
                  placeholder={searchPlaceholder}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
            )}
            {filterable && filterOptions && (
              <div className="relative" ref={filterRef}>
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={`px-4 py-2 border border-gray-300 rounded-lg flex items-center gap-2 hover:bg-gray-100 transition-colors ${
                    selectedFilter !== 'all' ? 'bg-primary-50 border-primary-300 text-primary-700' : 'bg-white'
                  }`}
                >
                  <Filter size={18} />
                  <span className="text-sm font-medium">
                    {filterOptions.find(opt => opt.value === selectedFilter)?.label || 'All'}
                  </span>
                </button>
                {showFilters && (
                  <div className="absolute right-0 sm:right-auto sm:left-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-50 py-1 max-h-64 overflow-y-auto">
                    {filterOptions.map((option) => (
                      <button
                        key={option.value}
                        onClick={() => {
                          setSelectedFilter(option.value);
                          setShowFilters(false);
                        }}
                        className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition-colors ${
                          selectedFilter === option.value ? 'bg-primary-50 text-primary-700 font-medium' : 'text-gray-700'
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
            <div className="mt-2 text-sm text-gray-600">
              Showing {filteredData.length} of {data.length} results
            </div>
          )}
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
            <tr>
              {columns.map((column, index) => (
                <th
                  key={index}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  {column.header}
                </th>
              ))}
              {(onEdit || onDelete || onView) && (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
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
                      <td key={colIndex} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {column.render ? column.render(value, row) : displayValue}
                      </td>
                    );
                  })}
                  {(onEdit || onDelete || onView) && (
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium" onClick={(e) => e.stopPropagation()}>
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
                                className="text-blue-600 hover:text-blue-900 p-1 rounded hover:bg-blue-50 transition-all duration-200 hover:scale-110 transform"
                                title="Edit"
                              >
                                <Edit size={18} />
                              </button>
                            );
                            buttons.push(
                              <button
                                key="delete"
                                onClick={() => onDelete(row)}
                                className="text-red-600 hover:text-red-900 p-1 rounded hover:bg-red-50 transition-all duration-200 hover:scale-110 transform"
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
                                className="text-primary-600 hover:text-primary-900 p-1 rounded hover:bg-primary-50 transition-all duration-200 hover:scale-110 transform"
                                title="View"
                              >
                                <Eye size={18} />
                              </button>
                            );
                            buttons.push(
                              <button
                                key="edit"
                                onClick={() => onEdit(row)}
                                className="text-blue-600 hover:text-blue-900 p-1 rounded hover:bg-blue-50 transition-all duration-200 hover:scale-110 transform"
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
                                className="text-primary-600 hover:text-primary-900 p-1 rounded hover:bg-primary-50 transition-all duration-200 hover:scale-110 transform"
                                title="View"
                              >
                                <Eye size={18} />
                              </button>
                            );
                            buttons.push(
                              <button
                                key="delete"
                                onClick={() => onDelete(row)}
                                className="text-red-600 hover:text-red-900 p-1 rounded hover:bg-red-50 transition-all duration-200 hover:scale-110 transform"
                                title="Delete"
                              >
                                <Trash2 size={18} />
                              </button>
                            );
                          } else if (onEdit) {
                            // Only Edit - show Edit twice with different styling
                            buttons.push(
                              <button
                                key="edit1"
                                onClick={() => onEdit(row)}
                                className="text-blue-600 hover:text-blue-900 p-1 rounded hover:bg-blue-50 transition-all duration-200 hover:scale-110 transform"
                                title="Edit"
                              >
                                <Edit size={18} />
                              </button>
                            );
                            buttons.push(
                              <button
                                key="edit2"
                                onClick={() => onEdit(row)}
                                className="text-primary-600 hover:text-primary-900 p-1 rounded hover:bg-primary-50 transition-all duration-200 hover:scale-110 transform"
                                title="Edit"
                              >
                                <Edit size={18} />
                              </button>
                            );
                          } else if (onDelete) {
                            // Only Delete - show Delete twice with different styling
                            buttons.push(
                              <button
                                key="delete1"
                                onClick={() => onDelete(row)}
                                className="text-red-600 hover:text-red-900 p-1 rounded hover:bg-red-50 transition-all duration-200 hover:scale-110 transform"
                                title="Delete"
                              >
                                <Trash2 size={18} />
                              </button>
                            );
                            buttons.push(
                              <button
                                key="delete2"
                                onClick={() => onDelete(row)}
                                className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50 transition-all duration-200 hover:scale-110 transform"
                                title="Delete"
                              >
                                <Trash2 size={18} />
                              </button>
                            );
                          } else if (onView) {
                            // Only View - show View twice with different styling
                            buttons.push(
                              <button
                                key="view1"
                                onClick={() => onView(row)}
                                className="text-primary-600 hover:text-primary-900 p-1 rounded hover:bg-primary-50 transition-all duration-200 hover:scale-110 transform"
                                title="View"
                              >
                                <Eye size={18} />
                              </button>
                            );
                            buttons.push(
                              <button
                                key="view2"
                                onClick={() => onView(row)}
                                className="text-blue-600 hover:text-blue-900 p-1 rounded hover:bg-blue-50 transition-all duration-200 hover:scale-110 transform"
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
  );
};

export default DataTable;
