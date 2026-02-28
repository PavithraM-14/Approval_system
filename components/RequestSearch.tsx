'use client';

import { useState, useEffect } from 'react';
import { MagnifyingGlassIcon, XMarkIcon, FunnelIcon } from '@heroicons/react/24/outline';

interface SearchFilters {
  query: string;
  status: string;
  college: string;
  department: string;
  expenseCategory: string;
  dateFrom: string;
  dateTo: string;
  minAmount: string;
  maxAmount: string;
}

interface RequestSearchProps {
  onSearch: (filters: SearchFilters) => void;
  onClear: () => void;
  colleges?: string[];
  departments?: string[];
  expenseCategories?: string[];
}

export default function RequestSearch({
  onSearch,
  onClear,
  colleges = [],
  departments = [],
  expenseCategories = []
}: RequestSearchProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [filters, setFilters] = useState<SearchFilters>({
    query: '',
    status: '',
    college: '',
    department: '',
    expenseCategory: '',
    dateFrom: '',
    dateTo: '',
    minAmount: '',
    maxAmount: ''
  });

  const handleInputChange = (field: keyof SearchFilters, value: string) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  const handleSearch = () => {
    onSearch(filters);
  };

  const handleClear = () => {
    setFilters({
      query: '',
      status: '',
      college: '',
      department: '',
      expenseCategory: '',
      dateFrom: '',
      dateTo: '',
      minAmount: '',
      maxAmount: ''
    });
    onClear();
  };

  const hasActiveFilters = Object.values(filters).some(value => value !== '');

  // Trigger search on Enter key
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md border border-gray-200 p-4 mb-6">
      {/* Basic Search */}
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by title, purpose, request ID..."
            value={filters.query}
            onChange={(e) => handleInputChange('query', e.target.value)}
            onKeyPress={handleKeyPress}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        
        <button
          onClick={handleSearch}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-2"
        >
          <MagnifyingGlassIcon className="h-5 w-5" />
          <span className="hidden sm:inline">Search</span>
        </button>

        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className={`px-4 py-2 rounded-lg transition flex items-center gap-2 ${
            showAdvanced ? 'bg-gray-700 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          <FunnelIcon className="h-5 w-5" />
          <span className="hidden sm:inline">Filters</span>
        </button>

        {hasActiveFilters && (
          <button
            onClick={handleClear}
            className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition flex items-center gap-2"
          >
            <XMarkIcon className="h-5 w-5" />
            <span className="hidden sm:inline">Clear</span>
          </button>
        )}
      </div>

      {/* Advanced Filters */}
      {showAdvanced && (
        <div className="mt-4 pt-4 border-t border-gray-200 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Status Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={filters.status}
              onChange={(e) => handleInputChange('status', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Statuses</option>
              <option value="manager_review">Manager Review</option>
              <option value="parallel_verification">Verification</option>
              <option value="vp_approval">VP Approval</option>
              <option value="hoi_approval">HOI Approval</option>
              <option value="dean_review">Dean Review</option>
              <option value="department_checks">Department Checks</option>
              <option value="chief_director_approval">Chief Director</option>
              <option value="chairman_approval">Chairman</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>

          {/* College Filter */}
          {colleges.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">College</label>
              <select
                value={filters.college}
                onChange={(e) => handleInputChange('college', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All Colleges</option>
                {colleges.map(college => (
                  <option key={college} value={college}>{college}</option>
                ))}
              </select>
            </div>
          )}

          {/* Department Filter */}
          {departments.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
              <select
                value={filters.department}
                onChange={(e) => handleInputChange('department', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All Departments</option>
                {departments.map(dept => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
            </div>
          )}

          {/* Expense Category Filter */}
          {expenseCategories.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Expense Category</label>
              <select
                value={filters.expenseCategory}
                onChange={(e) => handleInputChange('expenseCategory', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All Categories</option>
                {expenseCategories.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>
          )}

          {/* Date From */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date From</label>
            <input
              type="date"
              value={filters.dateFrom}
              onChange={(e) => handleInputChange('dateFrom', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Date To */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date To</label>
            <input
              type="date"
              value={filters.dateTo}
              onChange={(e) => handleInputChange('dateTo', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Min Amount */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Min Amount (₹)</label>
            <input
              type="number"
              placeholder="0"
              value={filters.minAmount}
              onChange={(e) => handleInputChange('minAmount', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Max Amount */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Max Amount (₹)</label>
            <input
              type="number"
              placeholder="No limit"
              value={filters.maxAmount}
              onChange={(e) => handleInputChange('maxAmount', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
      )}

      {/* Active Filters Display */}
      {hasActiveFilters && (
        <div className="mt-4 flex flex-wrap gap-2">
          <span className="text-sm text-gray-600">Active filters:</span>
          {filters.query && (
            <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-sm">
              Search: "{filters.query}"
            </span>
          )}
          {filters.status && (
            <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-sm">
              Status: {filters.status.replace('_', ' ')}
            </span>
          )}
          {filters.college && (
            <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-sm">
              College: {filters.college}
            </span>
          )}
          {filters.department && (
            <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-sm">
              Department: {filters.department}
            </span>
          )}
          {filters.expenseCategory && (
            <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-sm">
              Category: {filters.expenseCategory}
            </span>
          )}
          {(filters.minAmount || filters.maxAmount) && (
            <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-sm">
              Amount: ₹{filters.minAmount || '0'} - ₹{filters.maxAmount || '∞'}
            </span>
          )}
          {(filters.dateFrom || filters.dateTo) && (
            <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-sm">
              Date: {filters.dateFrom || 'Any'} to {filters.dateTo || 'Now'}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
