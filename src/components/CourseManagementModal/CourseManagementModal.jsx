import { useState, useEffect } from 'react';
import { X, BookOpen, ChevronDown, ChevronRight, Loader2, Check, Grid3x3, Layers } from 'lucide-react';
import { adminAPI, accAPI } from '../../services/api';
import { useTranslation } from '../../hooks/useTranslation';
import './CourseManagementModal.css';

const CourseManagementModal = ({ isOpen, onClose, instructor, isAdmin = false }) => {
  const { t } = useTranslation('instructor');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState([]);
  const [expandedCategories, setExpandedCategories] = useState({});
  const [expandedSubCategories, setExpandedSubCategories] = useState({});
  const [courseStates, setCourseStates] = useState({});
  const [initialCourseStates, setInitialCourseStates] = useState({});
  const [summary, setSummary] = useState({ total_courses: 0, authorized_courses: 0 });
  const [selectedACC, setSelectedACC] = useState(null);

  useEffect(() => {
    if (isOpen && instructor) {
      // Initialize selectedACC with the first ACC from instructor's accs array
      let firstACCId = null;
      if (instructor?.accs && instructor.accs.length > 0) {
        // Try different possible property names for the ID
        firstACCId = instructor.accs[0].id || instructor.accs[0].acc_id || instructor.accs[0].accreditation_id;
        setSelectedACC(firstACCId);
      } else {
        setSelectedACC(null);
      }
      // Pass the ACC ID directly to avoid async state issues
      loadAvailableCourses(firstACCId);
    }
  }, [isOpen, instructor, isAdmin]);

  const loadAvailableCourses = async (accIdOverride = null) => {
    setLoading(true);
    try {
      // Load all available courses in a single API call
      let response;
      if (isAdmin) {
        // Use the provided accIdOverride or fall back to selectedACC state
        const accIdToUse = accIdOverride !== null ? accIdOverride : selectedACC;
        response = await adminAPI.getInstructorAvailableCourses(instructor.id, { acc_id: accIdToUse });
      } else {
        response = await accAPI.getInstructorAvailableCourses(instructor.id);
      }

      const categoriesList = response.categories || [];
      setCategories(categoriesList);
      setSummary(response.summary || { total_courses: 0, authorized_courses: 0 });

      // Initialize course states based on is_authorized field from response
      const initialStates = {};
      const allCourses = [];

      categoriesList.forEach(category => {
        category.sub_categories.forEach(subCategory => {
          subCategory.courses.forEach(course => {
            allCourses.push(course);
            initialStates[course.id] = course.is_authorized || false;
          });
        });
      });

      setCourseStates(initialStates);
      setInitialCourseStates(initialStates);
    } catch (error) {
      console.error('Failed to load available courses:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleACCChange = (e) => {
    const newACCId = parseInt(e.target.value);
    setSelectedACC(newACCId);
    // Reload courses when ACC changes - pass the ID directly to avoid async issues
    if (isAdmin) {
      loadAvailableCourses(newACCId);
    }
  };

  const toggleCategory = (categoryId) => {
    setExpandedCategories(prev => ({
      ...prev,
      [categoryId]: !prev[categoryId]
    }));
  };

  const toggleSubCategory = (subCategoryId) => {
    setExpandedSubCategories(prev => ({
      ...prev,
      [subCategoryId]: !prev[subCategoryId]
    }));
  };

  const toggleCourse = (courseId) => {
    setCourseStates(prev => ({
      ...prev,
      [courseId]: !prev[courseId]
    }));
  };

  const toggleAllCoursesInCategory = (category, newState) => {
    const newStates = { ...courseStates };
    category.sub_categories.forEach(subCategory => {
      subCategory.courses.forEach(course => {
        newStates[course.id] = newState;
      });
    });
    setCourseStates(newStates);
  };

  const toggleAllCoursesInSubCategory = (subCategory, newState) => {
    const newStates = { ...courseStates };
    subCategory.courses.forEach(course => {
      newStates[course.id] = newState;
    });
    setCourseStates(newStates);
  };

  const handleSubmit = async () => {
    setSaving(true);
    try {
      const addCourseIds = [];
      const removeCourseIds = [];

      Object.keys(courseStates).forEach(courseId => {
        const currentState = courseStates[courseId];
        const initialState = initialCourseStates[courseId];

        if (currentState && !initialState) {
          addCourseIds.push(parseInt(courseId));
        } else if (!currentState && initialState) {
          removeCourseIds.push(parseInt(courseId));
        }
      });

      if (addCourseIds.length === 0 && removeCourseIds.length === 0) {
        alert(t('course_management_modal.alerts.no_changes'));
        setSaving(false);
        return;
      }

      const data = {
        add_course_ids: addCourseIds,
        remove_course_ids: removeCourseIds
      };

      // Add acc_id for Group Admin
      if (isAdmin && selectedACC) {
        data.acc_id = selectedACC;
      }

      if (isAdmin) {
        await adminAPI.updateInstructorCourses(instructor.id, data);
      } else {
        await accAPI.updateInstructorCourses(instructor.id, data);
      }

      alert(t('course_management_modal.alerts.success'));
      onClose();
    } catch (error) {
      console.error('Failed to update instructor courses:', error);
      if (error.response?.data?.message) {
        alert(t('course_management_modal.alerts.error_with_message', { message: error.response.data.message }));
      } else if (error.response?.data?.errors) {
        const errorMessages = Object.values(error.response.data.errors).flat().join('\n');
        alert(t('course_management_modal.alerts.error_with_message', { message: errorMessages }));
      } else {
        alert(t('course_management_modal.alerts.error_generic'));
      }
    } finally {
      setSaving(false);
    }
  };

  const hasChanges = () => {
    return JSON.stringify(courseStates) !== JSON.stringify(initialCourseStates);
  };

  const getSelectedCount = () => {
    return Object.values(courseStates).filter(Boolean).length;
  };

  const getTotalCount = () => {
    return Object.keys(courseStates).length;
  };

  if (!isOpen) return null;

  return (
    <div className="course-management-modal-overlay">
      <div className="course-management-modal">
        {/* Header */}
        <div className="course-management-modal-header">
          <div className="course-management-header-content">
            <div className="course-management-header-icon">
              <BookOpen size={24} />
            </div>
            <div>
              <h2 className="course-management-modal-title">
                {t('course_management_modal.title')}
              </h2>
              <p className="course-management-modal-subtitle">
                {t('course_management_modal.subtitle', {
                  first_name: instructor?.first_name || '',
                  last_name: instructor?.last_name || ''
                })}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="course-management-modal-close"
          >
            <X size={24} />
          </button>
        </div>

        {/* ACC Selector - Only show for Group Admin */}
        {isAdmin && instructor?.accs && instructor.accs.length > 0 && (
          <div className="course-management-acc-selector">
            <label className="course-management-acc-label">{t('course_management_modal.select_accreditation')}</label>
            <select
              className="course-management-acc-select"
              value={selectedACC || ''}
              onChange={handleACCChange}
              disabled={loading}
            >
              {instructor.accs.map((acc) => {
                const accId = acc.id || acc.acc_id || acc.accreditation_id;
                return (
                  <option key={accId} value={accId}>
                    {acc.name || `ACC #${accId}`}
                  </option>
                );
              })}
            </select>
          </div>
        )}

        {/* Stats Bar
        <div className="course-management-stats-bar">
          <div className="course-management-stat">
            <Grid3x3 size={18} className="course-management-stat-icon" />
            <div className="course-management-stat-content">
              <span className="course-management-stat-value">{getTotalCount()}</span>
              <span className="course-management-stat-label">Total Courses</span>
            </div>
          </div>
          <div className="course-management-stat-divider" />
          <div className="course-management-stat">
            <Check size={18} className="course-management-stat-icon course-management-stat-icon-success" />
            <div className="course-management-stat-content">
              <span className="course-management-stat-value">{getSelectedCount()}</span>
              <span className="course-management-stat-label">Selected</span>
            </div>
          </div>
        </div> */}

        {/* Body */}
        <div className="course-management-modal-body">
          {loading ? (
            <div className="course-management-loading">
              <Loader2 className="animate-spin" size={40} />
              <p>{t('course_management_modal.loading_courses')}</p>
            </div>
          ) : categories.length === 0 ? (
            <div className="course-management-empty">
              <BookOpen size={64} />
              <p>{t('course_management_modal.no_courses_available')}</p>
            </div>
          ) : (
            <div className="course-management-list">
              {categories.map((category) => {
                const allCoursesInCategory = [];
                category.sub_categories.forEach(sub => {
                  sub.courses.forEach(course => {
                    allCoursesInCategory.push(course);
                  });
                });

                const allSelected = allCoursesInCategory.length > 0 &&
                  allCoursesInCategory.every(course => courseStates[course.id]);
                const someSelected = allCoursesInCategory.some(course => courseStates[course.id]);
                const selectedCount = allCoursesInCategory.filter(course => courseStates[course.id]).length;

                return (
                  <div key={category.id} className="course-management-category">
                    <div
                      className="course-management-category-header"
                      onClick={() => toggleCategory(category.id)}
                    >
                      <div className="course-management-category-left">
                        <ChevronRight
                          size={20}
                          className={`course-management-chevron ${expandedCategories[category.id] ? 'expanded' : ''}`}
                        />
                        <Layers size={20} className="course-management-category-icon" />
                        <div className="course-management-category-info">
                          <span className="course-management-category-name">{category.name}</span>
                          <span className="course-management-category-count">
                            {t('course_management_modal.selected_count', {
                              selected: selectedCount,
                              total: allCoursesInCategory.length
                            })}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleAllCoursesInCategory(category, !allSelected);
                        }}
                        className={`course-management-toggle-btn ${allSelected ? 'selected' : ''}`}
                      >
                        <Check size={16} />
                        {allSelected ? t('course_management_modal.deselect_all') : t('course_management_modal.select_all')}
                      </button>
                    </div>

                    {expandedCategories[category.id] && (
                      <div className="course-management-subcategories">
                        {category.sub_categories.map((subCategory) => {
                          const allSelectedInSub = subCategory.courses.length > 0 &&
                            subCategory.courses.every(course => courseStates[course.id]);
                          const someSelectedInSub = subCategory.courses.some(course => courseStates[course.id]);
                          const selectedCountInSub = subCategory.courses.filter(course => courseStates[course.id]).length;

                          return (
                            <div key={subCategory.id} className="course-management-subcategory">
                              <div
                                className="course-management-subcategory-header"
                                onClick={() => toggleSubCategory(subCategory.id)}
                              >
                                <div className="course-management-subcategory-left">
                                  <ChevronRight
                                    size={18}
                                    className={`course-management-chevron ${expandedSubCategories[subCategory.id] ? 'expanded' : ''}`}
                                  />
                                  <Grid3x3 size={16} className="course-management-subcategory-icon" />
                                  <div className="course-management-subcategory-info">
                                    <span className="course-management-subcategory-name">{subCategory.name}</span>
                                    <span className="course-management-subcategory-count">
                                      {t('course_management_modal.selected_count', {
                                        selected: selectedCountInSub,
                                        total: subCategory.courses.length
                                      })}
                                    </span>
                                  </div>
                                </div>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleAllCoursesInSubCategory(subCategory, !allSelectedInSub);
                                  }}
                                  className={`course-management-toggle-btn-small ${allSelectedInSub ? 'selected' : ''}`}
                                >
                                  <Check size={14} />
                                  {allSelectedInSub ? t('course_management_modal.deselect') : t('course_management_modal.select')}
                                </button>
                              </div>

                              {expandedSubCategories[subCategory.id] && (
                                <div className="course-management-courses">
                                  {subCategory.courses.map((course) => (
                                    <div key={course.id} className="course-management-course">
                                      <div className="course-management-course-info">
                                        <div className="course-management-course-main">
                                          <span className="course-management-course-code">{t('course_management_modal.course.code')} {course.code}</span>
                                          <span className="course-management-course-name">{course.name}</span>
                                        </div>
                                        {course.name_ar && (
                                          <span className="course-management-course-name-ar">{course.name_ar}</span>
                                        )}
                                      </div>
                                      <button
                                        onClick={() => toggleCourse(course.id)}
                                        className={`course-management-switch ${courseStates[course.id] ? 'active' : ''}`}
                                      >
                                        <span className="course-management-switch-slider">
                                          {courseStates[course.id] && <Check size={14} />}
                                        </span>
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="course-management-modal-footer">
          <div className="course-management-footer-info">
            {hasChanges() && (
              <span className="course-management-changes-badge">
                {t('course_management_modal.changes_pending')}
              </span>
            )}
          </div>
          <div className="course-management-footer-actions">
            <button
              onClick={onClose}
              className="course-management-btn course-management-btn-secondary"
              disabled={saving}
            >
              {t('course_management_modal.cancel')}
            </button>
            <button
              onClick={handleSubmit}
              className="course-management-btn course-management-btn-primary"
              disabled={saving || !hasChanges()}
            >
              {saving ? (
                <>
                  <Loader2 className="animate-spin" size={18} />
                  {t('course_management_modal.saving')}
                </>
              ) : (
                <>
                  <Check size={18} />
                  {t('course_management_modal.save_changes')}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CourseManagementModal;
