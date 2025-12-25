import { useState, useEffect } from 'react';

/**
 * Custom hook for managing pagination state
 * @param {Object} options - Pagination options
 * @param {number} options.initialPage - Initial page number (default: 1)
 * @param {number} options.initialPerPage - Initial items per page (default: 10)
 * @returns {Object} Pagination state and handlers
 */
export const usePagination = ({ initialPage = 1, initialPerPage = 10 } = {}) => {
  const [pagination, setPagination] = useState({
    currentPage: initialPage,
    perPage: initialPerPage,
    totalPages: 1,
    totalItems: 0,
  });

  const handlePageChange = (page) => {
    setPagination(prev => ({ ...prev, currentPage: page }));
  };

  const handlePerPageChange = (perPage) => {
    setPagination(prev => ({ ...prev, perPage, currentPage: 1 }));
  };

  const resetToFirstPage = () => {
    setPagination(prev => ({ ...prev, currentPage: 1 }));
  };

  const updatePaginationFromResponse = (data) => {
    if (data.last_page !== undefined || data.total_pages !== undefined) {
      // Laravel pagination format
      setPagination(prev => ({
        ...prev,
        totalPages: data.last_page || data.total_pages || 1,
        totalItems: data.total || 0,
      }));
    } else if (data.current_page !== undefined) {
      // Alternative pagination format
      setPagination(prev => ({
        ...prev,
        currentPage: data.current_page || prev.currentPage,
        totalPages: data.last_page || data.total_pages || 1,
        totalItems: data.total || 0,
      }));
    }
  };

  return {
    pagination,
    handlePageChange,
    handlePerPageChange,
    resetToFirstPage,
    updatePaginationFromResponse,
    setPagination,
  };
};

/**
 * Helper function to extract data from paginated API response
 * @param {Object|Array} data - API response data
 * @param {string} dataKey - Key name for the data array (e.g., 'courses', 'discount_codes')
 * @returns {Object} Extracted data and pagination info
 */
export const extractPaginatedData = (data, dataKey = null) => {
  let items = [];
  let paginationInfo = {};

  if (data.data) {
    // Laravel pagination format: { data: [...], total: 100, last_page: 10, ... }
    items = Array.isArray(data.data) ? data.data : [];
    paginationInfo = {
      totalPages: data.last_page || data.total_pages || 1,
      totalItems: data.total || items.length,
      currentPage: data.current_page || 1,
      perPage: data.per_page || data.perPage || 10,
    };
  } else if (dataKey && data[dataKey]) {
    // Named array format: { courses: [...], total: 100, ... }
    items = Array.isArray(data[dataKey]) ? data[dataKey] : [];
    paginationInfo = {
      totalPages: data.last_page || data.total_pages || 1,
      totalItems: data.total || items.length,
      currentPage: data.current_page || 1,
      perPage: data.per_page || data.perPage || 10,
    };
  } else if (Array.isArray(data)) {
    // Plain array format
    items = data;
    paginationInfo = {
      totalPages: 1,
      totalItems: items.length,
      currentPage: 1,
      perPage: items.length,
    };
  }

  return { items, paginationInfo };
};

