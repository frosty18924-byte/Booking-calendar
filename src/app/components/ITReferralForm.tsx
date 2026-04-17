'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Upload, X, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { getITReferralCategoryDescription, IT_REFERRAL_CATEGORIES } from '@/lib/itReferralCategories';
import { IT_REFERRAL_QUICK_WINS_BY_CATEGORY } from '@/lib/itReferralQuickWins';

interface FormData {
  name: string;
  email: string;
  location: string;
  issueTitle: string;
  issueDescription: string;
  errorMessages: string;
  category: string;
  subCategory: string;
  subCategoryCustom: string;
}

interface ITReferralFormProps {
  checkedItems: string[];
  onSuccess?: () => void;
}

export function ITReferralForm({
  checkedItems,
  onSuccess,
}: ITReferralFormProps) {
  const [isDark, setIsDark] = useState(true);
  const [userEmail, setUserEmail] = useState('');
  const [userName, setUserName] = useState('');
  const [userLocation, setUserLocation] = useState('');
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [subCategoryOptions, setSubCategoryOptions] = useState<string[]>([]);
  const [subCategoriesLoading, setSubCategoriesLoading] = useState(false);
  const [newSubCategory, setNewSubCategory] = useState('');
  const [subCategoriesUnavailable, setSubCategoriesUnavailable] = useState(false);

  const { register, handleSubmit, reset, setValue, watch, getValues, formState: { errors, isSubmitting, submitCount } } =
    useForm<FormData>({
      defaultValues: {
        name: '',
        email: '',
        location: '',
        issueTitle: '',
        issueDescription: '',
        errorMessages: '',
        category: '',
        subCategory: '',
        subCategoryCustom: '',
      },
    });

  const [attachedFiles, setAttachedFiles] = useState<
    { file: File; preview: string }[]
  >([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const checkTheme = () => {
      setIsDark(document.documentElement.classList.contains('dark'));
    };
    checkTheme();
    window.addEventListener('themeChange', checkTheme);
    return () => window.removeEventListener('themeChange', checkTheme);
  }, []);

  useEffect(() => {
    const loadUserData = async () => {
      try {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          setErrorMessage('Unable to load user information');
          return;
        }

        setUserEmail(user.email || '');
        setValue('email', user.email || '');

        // Fetch user profile with location
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, location, role_tier')
          .eq('id', user.id)
          .single();

        if (profile) {
          setUserName(profile.full_name || '');
          setUserLocation(profile.location || '');
          setValue('name', profile.full_name || '');
          setValue('location', profile.location || '');
          setIsAdmin(profile.role_tier === 'admin');
        }
      } catch (err) {
        console.error('Error loading user data:', err);
        setErrorMessage('Failed to load user information');
      } finally {
        setLoading(false);
      }
    };

    loadUserData();
  }, [setValue]);

  const selectedCategory = watch('category');
  const selectedSubCategory = watch('subCategory');
  const [quickWinsTried, setQuickWinsTried] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (selectedSubCategory !== '__custom__' && getValues('subCategoryCustom')) {
      setValue('subCategoryCustom', '');
    }
  }, [getValues, selectedSubCategory, setValue]);

  useEffect(() => {
    // Reset quick wins when category changes so the list stays relevant.
    setQuickWinsTried({});
  }, [selectedCategory]);

  useEffect(() => {
    const fetchSubCategories = async () => {
      if (subCategoriesUnavailable) return;
      if (!selectedCategory) {
        setSubCategoryOptions([]);
        setValue('subCategory', '');
        setValue('subCategoryCustom', '');
        return;
      }

      try {
        setSubCategoriesLoading(true);
        const { data, error } = await supabase
          .from('it_referral_subcategories')
          .select('label')
          .eq('category', selectedCategory)
          .eq('is_active', true)
          .order('sort_order', { ascending: true })
          .order('label', { ascending: true });

        if (error) {
          const status = typeof (error as any)?.status === 'number' ? (error as any).status : undefined;
          const message = String((error as any)?.message || '');
          // If the table/migration isn't present yet, fall back to free-text mode.
          if (status === 404 || message.toLowerCase().includes('schema cache') || message.toLowerCase().includes('could not find')) {
            setSubCategoriesUnavailable(true);
            setSubCategoryOptions([]);
            setValue('subCategory', '__custom__');
            return;
          }
          throw error;
        }
        const labels = (data || [])
          .map((row) => row.label as string)
          .filter(Boolean);
        setSubCategoryOptions(labels);

        const current = getValues('subCategory');
        if (current && current !== '__custom__' && !labels.includes(current)) {
          setValue('subCategory', '');
        }
      } catch (err) {
        console.error('Error fetching subcategories:', err);
        setSubCategoryOptions([]);
      } finally {
        setSubCategoriesLoading(false);
      }
    };

    fetchSubCategories();
  }, [getValues, selectedCategory, setValue, subCategoriesUnavailable]);

  const handleAddSubCategory = async () => {
    const category = getValues('category');
    const label = newSubCategory.trim();

    if (!isAdmin || !category || !label) return;
    if (subCategoriesUnavailable) {
      setErrorMessage('Sub categories list is not available yet. Please run the database migration for it_referral_subcategories.');
      return;
    }

    try {
      setErrorMessage('');

      const { error } = await supabase
        .from('it_referral_subcategories')
        .insert([
          {
            category,
            label,
            is_active: true,
            sort_order: subCategoryOptions.length,
          },
        ]);

      if (error) throw error;

      // Refresh list and set selection.
      setNewSubCategory('');
      const { data, error: reloadError } = await supabase
        .from('it_referral_subcategories')
        .select('label')
        .eq('category', category)
        .eq('is_active', true)
        .order('sort_order', { ascending: true })
        .order('label', { ascending: true });

      if (reloadError) throw reloadError;
      const labels = (data || [])
        .map((row) => row.label as string)
        .filter(Boolean);
      setSubCategoryOptions(labels);
      setValue('subCategory', label);
      setValue('subCategoryCustom', '');
    } catch (err) {
      console.error('Error adding subcategory:', err);
      setErrorMessage(err instanceof Error ? err.message : 'Failed to add sub category');
    }
  };

  const handleFileAttach = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      Array.from(files).forEach((file) => {
        if (file.type.startsWith('image/')) {
          const reader = new FileReader();
          reader.onload = (event) => {
            setAttachedFiles((prev) => [
              ...prev,
              {
                file,
                preview: event.target?.result as string,
              },
            ]);
          };
          reader.readAsDataURL(file);
        } else {
          alert('Please upload image files only (PNG, JPG, etc.)');
        }
      });
    }
  };

  const removeFile = (index: number) => {
    setAttachedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const onSubmit = async (data: FormData) => {
    try {
      setErrorMessage('');
      setSuccessMessage('');

      const quickWinsTriedList = Object.entries(quickWinsTried)
        .filter(([, tried]) => Boolean(tried))
        .map(([title]) => title);

      const resolvedSubCategory =
        subCategoriesUnavailable
          ? data.subCategoryCustom.trim()
          : data.subCategory === '__custom__'
            ? data.subCategoryCustom.trim()
            : data.subCategory.trim();

      // Create referral record
      const { data: referralData, error: referralError } = await supabase
        .from('it_referrals')
        .insert([
          {
            name: data.name,
            email: data.email,
            location: data.location,
            issue_title: data.issueTitle,
            issue_description: data.issueDescription,
            error_messages: data.errorMessages,
            category: data.category,
            sub_category: resolvedSubCategory || null,
            quick_wins_tried: quickWinsTriedList,
            troubleshooting_steps_completed: checkedItems,
            status: 'submitted',
            created_at: new Date().toISOString(),
          },
        ])
        .select();

      if (referralError) throw referralError;

      const referralId = referralData?.[0]?.id;
      const ticketNumber = referralData?.[0]?.ticket_number;

      // Upload attachments if any
      if (attachedFiles.length > 0 && referralId) {
        let uploadedCount = 0;
        for (const { file } of attachedFiles) {
          const fileName = `${referralId}/${Date.now()}-${file.name}`;
          const { error: uploadError } = await supabase.storage
            .from('referral_attachments')
            .upload(fileName, file);

          if (uploadError) throw uploadError;

          uploadedCount++;
          setUploadProgress((uploadedCount / attachedFiles.length) * 100);

          // Link attachment to referral
          await supabase.from('referral_attachments').insert([
            {
              referral_id: referralId,
              file_name: file.name,
              file_path: fileName,
              file_size: file.size,
              file_type: file.type,
            },
          ]);
        }
      }

      setSuccessMessage(
        `Your IT referral has been submitted successfully! Ticket #${ticketNumber ?? '—'}`
      );
      reset();
      setAttachedFiles([]);
      setUploadProgress(0);

      if (onSuccess) {
        setTimeout(onSuccess, 2000);
      }
    } catch (error) {
      console.error('Submission error:', error);
      const maybe = error as any;
      const msg =
        typeof maybe?.message === 'string' && maybe.message.trim()
          ? maybe.message
          : typeof maybe?.details === 'string' && maybe.details.trim()
            ? maybe.details
            : typeof maybe?.hint === 'string' && maybe.hint.trim()
              ? maybe.hint
              : 'Failed to submit referral';
      const code = typeof maybe?.code === 'string' && maybe.code.trim() ? ` (code: ${maybe.code})` : '';
      setErrorMessage(`${msg}${code}`);
    }
  };

  if (loading) {
    return (
      <div className={`w-full max-w-4xl mx-auto p-6 rounded-lg shadow-lg transition-colors duration-300 ${isDark ? 'bg-gray-800 text-gray-100' : 'bg-white text-gray-900'}`}>
        <p className="text-center">Loading your information...</p>
      </div>
    );
  }

  return (
    <div className={`w-full max-w-4xl mx-auto p-6 rounded-lg shadow-lg transition-colors duration-300 ${isDark ? 'bg-gray-800 text-gray-100' : 'bg-white text-gray-900'}`}>
      <div className="mb-8">
        <h1 className={`text-3xl font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
          IT Support Referral Form
        </h1>
        <p className={isDark ? 'text-gray-300' : 'text-gray-600'}>
          Please provide detailed information about your IT issue
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        {/* Contact Information Section */}
        <div>
          <h2 className={`text-xl font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-800'}`}>
            Contact Information
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-100' : 'text-gray-700'}`}>
                Full Name
              </label>
              <input
                type="text"
                {...register('name', { required: 'Name is required' })}
                disabled
                className={`w-full px-4 py-2 border rounded-lg transition-colors duration-300 ${
                  isDark ? 'border-gray-600 bg-gray-700 text-gray-100' : 'border-gray-300 bg-gray-50 text-gray-900'
                }`}
              />
            </div>

            <div>
              <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-100' : 'text-gray-700'}`}>
                Email
              </label>
              <input
                type="email"
                {...register('email')}
                disabled
                className={`w-full px-4 py-2 border rounded-lg transition-colors duration-300 ${
                  isDark ? 'border-gray-600 bg-gray-700 text-gray-100' : 'border-gray-300 bg-gray-50 text-gray-900'
                }`}
              />
            </div>

            <div>
              <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-100' : 'text-gray-700'}`}>
                Location
              </label>
              <input
                type="text"
                {...register('location')}
                disabled
                className={`w-full px-4 py-2 border rounded-lg transition-colors duration-300 ${
                  isDark ? 'border-gray-600 bg-gray-700 text-gray-100' : 'border-gray-300 bg-gray-50 text-gray-900'
                }`}
              />
            </div>
          </div>
        </div>

        {/* Issue Details Section */}
        <div>
          <h2 className={`text-xl font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-800'}`}>
            Issue Details
          </h2>
          <div className="space-y-6">
            <div
              className="rounded-lg border p-4"
              style={{
                borderColor: isDark ? '#374151' : '#e5e7eb',
                backgroundColor: isDark ? '#111827' : '#ffffff',
              }}
            >
              <p className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                1) Choose a category and sub category → 2) Try the quick wins → 3) Add the issue details and submit.
              </p>
            </div>

            <div>
              <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-100' : 'text-gray-700'}`}>
                Issue Category *
              </label>
              <select
                {...register('category', {
                  required: 'Please select a category',
                })}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors duration-300 ${
                  errors.category ? 'border-red-500' : isDark ? 'border-gray-600 bg-gray-700 text-gray-100' : 'border-gray-300 bg-white text-gray-900'
                }`}
              >
                <option value="">Select a category...</option>
                {IT_REFERRAL_CATEGORIES.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.label}
                  </option>
                ))}
              </select>
              {selectedCategory && (
                <p className={`text-sm mt-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  {getITReferralCategoryDescription(selectedCategory)}
                </p>
              )}
              {errors.category && (
                <p className="text-red-500 text-sm mt-1">
                  {errors.category.message}
                </p>
              )}
            </div>

            <div>
              <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-100' : 'text-gray-700'}`}>
                Sub Category
              </label>
              {subCategoriesUnavailable ? (
                <div>
                  <input
                    type="text"
                    {...register('subCategoryCustom')}
                    disabled={!selectedCategory}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors duration-300 ${
                      isDark ? 'border-gray-600 bg-gray-700 text-gray-100' : 'border-gray-300 bg-white text-gray-900'
                    } ${!selectedCategory ? 'opacity-70 cursor-not-allowed' : ''}`}
                    placeholder={!selectedCategory ? 'Select a category first...' : 'Type a sub category (optional)'}
                  />
                  <p className={`text-sm mt-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    Sub category list isn’t set up yet, so this is free-text for now.
                  </p>
                </div>
              ) : (
                <>
                  <select
                    {...register('subCategory', {
                      validate: (value) => {
                        if (value !== '__custom__') return true;
                        return getValues('subCategoryCustom').trim().length > 0 || 'Please enter a sub category';
                      },
                    })}
                    disabled={!selectedCategory || subCategoriesLoading}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors duration-300 ${
                      isDark ? 'border-gray-600 bg-gray-700 text-gray-100' : 'border-gray-300 bg-white text-gray-900'
                    } ${(!selectedCategory || subCategoriesLoading) ? 'opacity-70 cursor-not-allowed' : ''}`}
                  >
                    <option value="">
                      {!selectedCategory
                        ? 'Select a category first...'
                        : subCategoriesLoading
                          ? 'Loading...'
                          : subCategoryOptions.length > 0
                            ? 'Select a sub category (optional)...'
                            : 'No sub categories yet (optional)...'}
                    </option>
                    {subCategoryOptions.map((label) => (
                      <option key={label} value={label}>
                        {label}
                      </option>
                    ))}
                    <option value="__custom__">Other / Not listed...</option>
                  </select>

                  {selectedSubCategory === '__custom__' && (
                    <div className="mt-3">
                      <input
                        type="text"
                        {...register('subCategoryCustom')}
                        className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors duration-300 ${
                          errors.subCategory ? 'border-red-500' : isDark ? 'border-gray-600 bg-gray-700 text-gray-100' : 'border-gray-300 bg-white text-gray-900'
                        }`}
                        placeholder="Enter a sub category"
                      />
                    </div>
                  )}
                </>
              )}

              {errors.subCategory && (
                <p className="text-red-500 text-sm mt-1">
                  {errors.subCategory.message}
                </p>
              )}

              {isAdmin && selectedCategory && (
                <div className="mt-4 flex flex-col md:flex-row gap-2">
                  <input
                    type="text"
                    value={newSubCategory}
                    onChange={(e) => setNewSubCategory(e.target.value)}
                    className={`flex-1 px-4 py-2 border rounded-lg transition-colors duration-300 ${
                      isDark ? 'border-gray-600 bg-gray-700 text-gray-100' : 'border-gray-300 bg-white text-gray-900'
                    }`}
                    placeholder="Admin: add a new sub category..."
                  />
                  <button
                    type="button"
                    onClick={handleAddSubCategory}
                    disabled={!newSubCategory.trim() || subCategoriesLoading}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      newSubCategory.trim() && !subCategoriesLoading
                        ? 'bg-blue-600 hover:bg-blue-700 text-white'
                        : isDark ? 'bg-gray-600 text-gray-300' : 'bg-gray-200 text-gray-500'
                    }`}
                  >
                    Add
                  </button>
                </div>
              )}
            </div>

            {selectedCategory && (
              <div className="md:col-span-2">
                <h3 className={`text-sm font-semibold mb-2 ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
                  Quick Wins (recommended)
                </h3>
                <p className={`text-sm mb-4 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  Based on your category{selectedSubCategory && selectedSubCategory !== '__custom__' ? ` (${selectedSubCategory})` : ''}. Tick any you tried.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {(IT_REFERRAL_QUICK_WINS_BY_CATEGORY[selectedCategory] || []).map((win) => (
                    <div
                      key={win.title}
                      className="rounded-lg border p-4"
                      style={{
                        borderColor: isDark ? '#374151' : '#e5e7eb',
                        backgroundColor: isDark ? '#111827' : '#ffffff',
                      }}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className={`font-medium ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
                            {win.title}
                          </p>
                          {win.description && (
                            <p className={`text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                              {win.description}
                            </p>
                          )}
                        </div>
                        <label className={`flex items-center gap-2 text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                          <input
                            type="checkbox"
                            checked={Boolean(quickWinsTried[win.title])}
                            onChange={(e) =>
                              setQuickWinsTried((prev) => ({
                                ...prev,
                                [win.title]: e.target.checked,
                              }))
                            }
                            className="h-4 w-4"
                          />
                          Tried
                        </label>
                      </div>

                      <ul className={`mt-3 text-sm space-y-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                        {win.steps.map((step) => (
                          <li key={step} className="flex gap-2">
                            <span className={`${isDark ? 'text-gray-500' : 'text-gray-400'}`}>•</span>
                            <span>{step}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}

                  {(IT_REFERRAL_QUICK_WINS_BY_CATEGORY[selectedCategory] || []).length === 0 && (
                    <div
                      className="rounded-lg border p-4"
                      style={{
                        borderColor: isDark ? '#374151' : '#e5e7eb',
                        backgroundColor: isDark ? '#111827' : '#ffffff',
                      }}
                    >
                      <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                        No quick wins configured for this category yet.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div>
              <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-100' : 'text-gray-700'}`}>
                Issue Title *
              </label>
              <input
                type="text"
                {...register('issueTitle', {
                  required: 'Issue title is required',
                })}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors duration-300 ${
                  errors.issueTitle ? 'border-red-500' : isDark ? 'border-gray-600 bg-gray-700 text-gray-100' : 'border-gray-300 bg-white text-gray-900'
                }`}
                placeholder="Brief summary of the issue"
              />
              {errors.issueTitle && (
                <p className="text-red-500 text-sm mt-1">
                  {errors.issueTitle.message}
                </p>
              )}
            </div>

            <div>
              <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-100' : 'text-gray-700'}`}>
                Detailed Description *
              </label>
              <textarea
                {...register('issueDescription', {
                  required: 'Description is required',
                })}
                rows={5}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors duration-300 ${
                  errors.issueDescription ? 'border-red-500' : isDark ? 'border-gray-600 bg-gray-700 text-gray-100' : 'border-gray-300 bg-white text-gray-900'
                }`}
                placeholder="Describe the issue in detail. When did it start? What have you tried?"
              />
              {errors.issueDescription && (
                <p className="text-red-500 text-sm mt-1">
                  {errors.issueDescription.message}
                </p>
              )}
            </div>

            <div>
              <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-100' : 'text-gray-700'}`}>
                Error Messages
              </label>
              <textarea
                {...register('errorMessages')}
                rows={3}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors duration-300 ${isDark ? 'border-gray-600 bg-gray-700 text-gray-100' : 'border-gray-300 bg-white text-gray-900'}`}
                placeholder="Copy and paste any error messages you see"
              />
            </div>
          </div>
        </div>

        {/* File Attachments Section */}
        <div>
          <h2 className={`text-xl font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-800'}`}>
            Attachments
          </h2>
          <div className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${isDark ? 'border-gray-600 hover:border-blue-500' : 'border-gray-300 hover:border-blue-400'}`}>
            <label className="cursor-pointer">
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handleFileAttach}
                className="hidden"
              />
              <div className="flex flex-col items-center">
                <Upload className={`w-12 h-12 mb-2 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
                <p className={`font-medium ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>
                  Click to upload or drag and drop
                </p>
                <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  PNG, JPG, GIF up to 10MB (screenshots, error messages)
                </p>
              </div>
            </label>
          </div>

          {/* Attached Files Preview */}
          {attachedFiles.length > 0 && (
            <div className="mt-6">
              <h3 className={`text-sm font-medium mb-4 ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>
                Attached Files ({attachedFiles.length})
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {attachedFiles.map((item, index) => (
                  <div
                    key={index}
                    className={`relative group rounded-lg overflow-hidden border ${isDark ? 'border-gray-600' : 'border-gray-200'}`}
                  >
                    <img
                      src={item.preview}
                      alt={`Preview ${index}`}
                      className="w-full h-32 object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => removeFile(index)}
                      className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-4 h-4" />
                    </button>
                    <p className={`text-xs p-2 truncate ${isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-50 text-gray-600'}`}>
                      {item.file.name}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {uploadProgress > 0 && uploadProgress < 100 && (
            <div className="mt-4">
              <div className={`rounded-full h-2 ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`}>
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              <p className={`text-sm mt-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                Uploading: {Math.round(uploadProgress)}%
              </p>
            </div>
          )}
        </div>

        {/* Troubleshooting Summary */}
        <div className={`p-4 rounded-lg border transition-colors duration-300 ${isDark ? 'border-blue-700 bg-blue-900 text-blue-200' : 'border-blue-200 bg-blue-50 text-blue-900'}`}>
          <p className="text-sm">
            <strong>Troubleshooting Steps Completed:</strong>{" "}
            {checkedItems.length > 0
              ? checkedItems.join(", ")
              : "None selected"}
          </p>
        </div>

        {/* Submit Button */}
        <div className="flex gap-4">
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex-1 py-3 px-6 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Submitting...
              </>
            ) : (
              "Submit IT Referral"
            )}
          </button>
        </div>

        {/* Submission Result (shown after pressing submit) */}
        {(submitCount > 0 || successMessage || errorMessage) && (
          <div className="space-y-4">
            {successMessage && (
              <div
                className={`p-4 rounded-lg border transition-colors duration-300 ${
                  isDark ? 'border-green-700 bg-green-900 text-green-200' : 'border-green-200 bg-green-50 text-green-900'
                }`}
              >
                <p>{successMessage}</p>
              </div>
            )}

            {errorMessage && (
              <div
                className={`p-4 rounded-lg border transition-colors duration-300 ${
                  isDark ? 'border-red-700 bg-red-900 text-red-200' : 'border-red-200 bg-red-50 text-red-900'
                }`}
              >
                <p>{errorMessage}</p>
              </div>
            )}
          </div>
        )}
      </form>
    </div>
  );
}
