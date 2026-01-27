'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface CourseData {
  name: string;
  course: string;
  expiry: string;
  expiryTime?: number;
  location: string;
  delivery: string;
  awaitingTrainingDate?: boolean;
  isOneOff?: boolean;
  expiredSince?: string;
}

export default function CourseExpiryChecker({ isDark }: { isDark: boolean }) {
  const [allData, setAllData] = useState<CourseData[]>([]);
  const [filteredData, setFilteredData] = useState<CourseData[]>([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('Ready to search');
  const [activeTab, setActiveTab] = useState<'expiring' | 'awaiting' | 'expired'>('expiring');
  
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [user, setUser] = useState<any>(null);

  // Filters
  const [filters, setFilters] = useState({
    name: '',
    course: '',
    location: '',
    delivery: '',
  });

  // Filter options
  const [filterOptions, setFilterOptions] = useState({
    names: [] as string[],
    courses: [] as string[],
    locations: [] as string[],
    deliveries: [] as string[],
  });

  useEffect(() => {
    checkAuth();
    initializeDates();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [allData, filters]);

  async function checkAuth() {
    try {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();

      if (!authUser) {
        window.location.href = '/login';
        return;
      }

      setUser(authUser);
    } catch (error) {
      console.error('Auth error:', error);
    }
  }

  function initializeDates() {
    const today = new Date();
    const nextMonth = new Date();
    nextMonth.setDate(today.getDate() + 30);

    const formatDate = (date: Date) => date.toISOString().split('T')[0];

    setStartDate(formatDate(today));
    setEndDate(formatDate(nextMonth));
  }

  function buildFilterOptions(data: CourseData[]) {
    setFilterOptions({
      names: [...new Set(data.map(d => d.name))].sort(),
      courses: [...new Set(data.map(d => d.course))].sort(),
      locations: [...new Set(data.map(d => d.location))].sort(),
      deliveries: [...new Set(data.map(d => d.delivery))].sort(),
    });
  }

  async function fetchExpiringCourses() {
    if (!startDate || !endDate) {
      setStatus('Please select both dates');
      return;
    }

    setLoading(true);
    setStatus('Fetching expiring courses...');
    setActiveTab('expiring');

    try {
      const response = await fetch(
        `/api/courses/expiring?startDate=${startDate}&endDate=${endDate}`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch courses');
      }

      const data: CourseData[] = await response.json();

      setAllData(data);
      buildFilterOptions(data);
      setStatus(`Found ${data.length} expiring courses`);
    } catch (error) {
      console.error('Error fetching courses:', error);
      setStatus('Error loading courses. Please check your Google Sheets connection.');
    } finally {
      setLoading(false);
    }
  }

  async function fetchAwaitingTraining() {
    setLoading(true);
    setStatus('Fetching courses awaiting training...');
    setActiveTab('awaiting');

    try {
      const response = await fetch('/api/courses/awaiting-training');

      if (!response.ok) {
        throw new Error('Failed to fetch courses');
      }

      const data: CourseData[] = await response.json();

      setAllData(data);
      buildFilterOptions(data);
      setStatus(`Found ${data.length} courses awaiting training`);
    } catch (error) {
      console.error('Error fetching courses:', error);
      setStatus('Error loading courses. Please check your Google Sheets connection.');
    } finally {
      setLoading(false);
    }
  }

  async function fetchExpiredCourses() {
    setLoading(true);
    setStatus('Fetching expired courses...');
    setActiveTab('expired');

    try {
      const response = await fetch('/api/courses/expired');

      if (!response.ok) {
        throw new Error('Failed to fetch courses');
      }

      const data: CourseData[] = await response.json();

      setAllData(data);
      buildFilterOptions(data);
      setStatus(`Found ${data.length} expired courses`);
    } catch (error) {
      console.error('Error fetching courses:', error);
      setStatus('Error loading courses. Please check your Google Sheets connection.');
    } finally {
      setLoading(false);
    }
  }

  function applyFilters() {
    let filtered = allData;

    if (filters.name) {
      filtered = filtered.filter(d => d.name === filters.name);
    }
    if (filters.course) {
      filtered = filtered.filter(d => d.course === filters.course);
    }
    if (filters.location) {
      filtered = filtered.filter(d => d.location === filters.location);
    }
    if (filters.delivery) {
      filtered = filtered.filter(d => d.delivery === filters.delivery);
    }

    setFilteredData(filtered);
  }

  const isExpiredView = allData.length > 0 && allData[0].expiredSince !== undefined;

  return (
    <div className={`min-h-screen transition-colors duration-500 ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
      {/* Header */}
      <div className={`border-b transition-colors duration-300 ${isDark ? 'border-gray-800 bg-gray-800' : 'border-gray-200 bg-white'}`}>
        <div className="px-4 sm:px-6 lg:px-8 py-10 max-w-7xl mx-auto text-center">
          <h1 className={`text-4xl font-bold transition-colors duration-300 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            📅 Course Expiry Checker
          </h1>
          <p className={`mt-3 text-lg transition-colors duration-300 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            Track staff training certifications and expiry dates
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-4 sm:px-6 lg:px-8 py-10 max-w-7xl mx-auto">
        {/* Search Controls */}
        <div className={`rounded-lg border p-8 mb-8 transition-colors duration-300 ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <div className="flex flex-col sm:flex-row gap-4 mb-8 justify-center">
            <div>
              <label className={`block text-sm font-medium mb-2 transition-colors duration-300 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className={`px-3 py-2 text-sm rounded border w-40 transition-colors duration-300 ${
                  isDark
                    ? 'bg-gray-700 border-gray-600 text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
                    : 'bg-white border-gray-300 text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
                }`}
              />
            </div>
            <div>
              <label className={`block text-sm font-medium mb-2 transition-colors duration-300 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                End Date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className={`px-3 py-2 text-sm rounded border w-40 transition-colors duration-300 ${
                  isDark
                    ? 'bg-gray-700 border-gray-600 text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
                    : 'bg-white border-gray-300 text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
                }`}
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={fetchExpiringCourses}
              disabled={loading}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-all duration-300 font-medium shadow-md hover:shadow-lg"
            >
              🔍 Search Expiring
            </button>
            <button
              onClick={fetchAwaitingTraining}
              disabled={loading}
              className="px-6 py-3 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:opacity-50 transition-all duration-300 font-medium shadow-md hover:shadow-lg"
            >
              ⏳ Awaiting Training
            </button>
            <button
              onClick={fetchExpiredCourses}
              disabled={loading}
              className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-all duration-300 font-medium shadow-md hover:shadow-lg"
            >
              ⚠️ Expired Courses
            </button>
          </div>
        </div>

        {/* Status */}

        {loading && (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className={`mt-2 transition-colors duration-300 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Loading...</p>
          </div>
        )}

        {/* Filters */}
        {allData.length > 0 && (
          <div className={`rounded-lg border p-8 mb-8 transition-colors duration-300 ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
            <h3 className={`font-semibold text-lg mb-6 text-center transition-colors duration-300 ${isDark ? 'text-gray-200' : 'text-gray-900'}`}>
              Filter Results
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <select
                value={filters.name}
                onChange={e => setFilters({ ...filters, name: e.target.value })}
                className={`px-4 py-3 rounded-lg border transition-colors duration-300 ${
                  isDark
                    ? 'bg-gray-700 border-gray-600 text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
                    : 'bg-white border-gray-300 text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
                }`}
              >
                <option value="">All Staff</option>
                {filterOptions.names.map(name => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>

              <select
                value={filters.course}
                onChange={e => setFilters({ ...filters, course: e.target.value })}
                className={`px-4 py-3 rounded-lg border transition-colors duration-300 ${
                  isDark
                    ? 'bg-gray-700 border-gray-600 text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
                    : 'bg-white border-gray-300 text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
                }`}
              >
                <option value="">All Courses</option>
                {filterOptions.courses.map(course => (
                  <option key={course} value={course}>
                    {course}
                  </option>
                ))}
              </select>

              <select
                value={filters.location}
                onChange={e => setFilters({ ...filters, location: e.target.value })}
                className={`px-4 py-3 rounded-lg border transition-colors duration-300 ${
                  isDark
                    ? 'bg-gray-700 border-gray-600 text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
                    : 'bg-white border-gray-300 text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
                }`}
              >
                <option value="">All Locations</option>
                {filterOptions.locations.map(location => (
                  <option key={location} value={location}>
                    {location}
                  </option>
                ))}
              </select>

              <select
                value={filters.delivery}
                onChange={e => setFilters({ ...filters, delivery: e.target.value })}
                className={`px-4 py-3 rounded-lg border transition-colors duration-300 ${
                  isDark
                    ? 'bg-gray-700 border-gray-600 text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
                    : 'bg-white border-gray-300 text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
                }`}
              >
                <option value="">All Delivery Types</option>
                {filterOptions.deliveries.map(delivery => (
                  <option key={delivery} value={delivery}>
                    {delivery}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Results Table */}
        {allData.length > 0 && (
          <div className={`rounded-lg border overflow-hidden shadow-lg transition-colors duration-300 ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className={`transition-colors duration-300 ${isDark ? 'bg-gray-700' : 'bg-gray-100'}`}>
                  <tr>
                    <th className={`px-6 py-4 text-left font-semibold transition-colors duration-300 ${isDark ? 'text-gray-200' : 'text-gray-900'}`}>
                      Staff Name
                    </th>
                    <th className={`px-6 py-4 text-left font-semibold transition-colors duration-300 ${isDark ? 'text-gray-200' : 'text-gray-900'}`}>
                      Course
                    </th>
                    <th className={`px-6 py-4 text-center font-semibold transition-colors duration-300 ${isDark ? 'text-gray-200' : 'text-gray-900'}`}>
                      {isExpiredView ? 'Status' : 'Expiry Date'}
                    </th>
                    <th className={`px-6 py-4 text-left font-semibold transition-colors duration-300 ${isDark ? 'text-gray-200' : 'text-gray-900'}`}>
                      Location
                    </th>
                    <th className={`px-6 py-4 text-left font-semibold transition-colors duration-300 ${isDark ? 'text-gray-200' : 'text-gray-900'}`}>
                      Delivery
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredData.map((row, idx) => (
                    <tr
                      key={idx}
                      className={`border-t transition-colors duration-300 ${
                        isDark ? 'border-gray-700 hover:bg-gray-700' : 'border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <td className={`px-6 py-4 transition-colors duration-300 ${isDark ? 'text-gray-200' : 'text-gray-900'}`}>
                        {row.name}
                      </td>
                      <td className={`px-6 py-4 transition-colors duration-300 ${isDark ? 'text-gray-200' : 'text-gray-900'}`}>
                        {row.course}
                      </td>
                      <td className={`px-6 py-4 text-center font-semibold ${
                        isExpiredView
                          ? `transition-colors duration-300 ${isDark ? 'text-red-400' : 'text-red-600'}`
                          : `transition-colors duration-300 ${isDark ? 'text-gray-200' : 'text-gray-900'}`
                      }`}>
                        {isExpiredView ? row.expiredSince : (row.expiry || '-')}
                      </td>
                      <td className={`px-6 py-4 transition-colors duration-300 ${isDark ? 'text-gray-200' : 'text-gray-900'}`}>
                        {row.location}
                      </td>
                      <td className={`px-6 py-4 transition-colors duration-300 ${isDark ? 'text-gray-200' : 'text-gray-900'}`}>
                        {row.delivery}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className={`px-6 py-4 border-t text-center font-medium transition-colors duration-300 ${isDark ? 'border-gray-700 bg-gray-750 text-gray-300' : 'border-gray-200 bg-gray-50 text-gray-600'}`}>
              Displaying {filteredData.length} of {allData.length} records
            </div>
          </div>
        )}

        {allData.length === 0 && !loading && (
          <div className={`text-center py-16 rounded-lg border transition-colors duration-300 ${isDark ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-gray-50'}`}>
            <p className={`text-lg transition-colors duration-300 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              No data yet. Use the search buttons above to get started.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
