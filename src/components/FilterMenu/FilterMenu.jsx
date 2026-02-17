import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Filter, X, Check, ChevronDown } from 'lucide-react';
import { useTranslation } from '../../hooks/useTranslation';
import { publicAPI } from '../../services/api';

const FilterMenu = ({
    filters,
    onApply,
    onClear,
    showLocation = true,
    showAssessorStatus = true,
    showCertificateType = false,
    showStatus = false,
}) => {
    const { t, isRTL } = useTranslation('common');
    const [isOpen, setIsOpen] = useState(false);
    const [localFilters, setLocalFilters] = useState(filters);
    const [menuPosition, setMenuPosition] = useState({});

    // Data states
    const [countries, setCountries] = useState([]);
    const [cities, setCities] = useState([]);
    const [loadingCountries, setLoadingCountries] = useState(false);
    const [loadingCities, setLoadingCities] = useState(false);

    const buttonRef = useRef(null);
    const dropdownRef = useRef(null);

    // Sync local state when prop changes (e.g. clear from parent)
    useEffect(() => {
        setLocalFilters(filters);
    }, [filters]);

    // Fetch Countries
    useEffect(() => {
        if (!showLocation) return;

        const fetchCountries = async () => {
            setLoadingCountries(true);
            try {
                const response = await publicAPI.getCountries();
                setCountries(response.countries || response.data || []);
            } catch (error) {
                console.error("Failed to fetch countries", error);
            } finally {
                setLoadingCountries(false);
            }
        };
        fetchCountries();
    }, [showLocation]);

    // Fetch Cities when country changes
    useEffect(() => {
        if (!showLocation) return;

        const fetchCities = async () => {
            if (!localFilters.country) {
                setCities([]);
                return;
            }
            setLoadingCities(true);
            try {
                const response = await publicAPI.getCities(localFilters.country);
                setCities(response.cities || response.data || []);
            } catch (error) {
                console.error("Failed to fetch cities", error);
                setCities([]);
            } finally {
                setLoadingCities(false);
            }
        };

        // Debounce or just fetch? API likely fast enough.
        fetchCities();
    }, [localFilters.country, showLocation]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (
                buttonRef.current &&
                !buttonRef.current.contains(event.target) &&
                dropdownRef.current &&
                !dropdownRef.current.contains(event.target)
            ) {
                setIsOpen(false);
            }
        };

        const updatePosition = () => {
            if (buttonRef.current && isOpen) {
                const rect = buttonRef.current.getBoundingClientRect();

                if (isRTL) {
                    setMenuPosition({
                        top: rect.bottom + 8,
                        left: rect.left
                    });
                } else {
                    setMenuPosition({
                        top: rect.bottom + 8,
                        right: window.innerWidth - rect.right
                    });
                }
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            window.addEventListener('scroll', updatePosition, true);
            window.addEventListener('resize', updatePosition);
            updatePosition();
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            window.removeEventListener('scroll', updatePosition, true);
            window.removeEventListener('resize', updatePosition);
        };
    }, [isOpen, isRTL]); // Added isRTL to dependency array

    const handleChange = (key, value) => {
        setLocalFilters(prev => {
            const newState = { ...prev, [key]: value };
            // Reset city if country changes
            if (key === 'country') {
                newState.city = '';
            }
            return newState;
        });
    };

    const handleApply = () => {
        onApply(localFilters);
        setIsOpen(false);
    };

    const handleClear = () => {
        const cleared = { ...filters }; // Start with current filters to preserve unmanaged keys if any, or just empty?
        // Better to clear only managed fields

        if (showLocation) {
            cleared.country = '';
            cleared.city = '';
        }
        if (showAssessorStatus) {
            cleared.is_assessor = '';
        }
        if (showCertificateType) {
            cleared.type = '';
        }

        setLocalFilters(cleared);
        onClear(cleared);
        setIsOpen(false);
    };

    const activeCount = Object.values(filters).filter(v => v !== '' && v !== null && v !== undefined && v !== 'all').length;

    return (
        <>
            <button
                ref={buttonRef}
                onClick={() => setIsOpen(!isOpen)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors ${activeCount > 0
                    ? 'bg-primary-50 border-primary-200 text-primary-700'
                    : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
            >
                <Filter size={18} />
                <span className="text-sm font-medium">{t('filter_menu.button')}</span>
                {activeCount > 0 && (
                    <span className="ml-1 px-1.5 py-0.5 text-xs bg-primary-200 text-primary-800 rounded-full font-bold">
                        {activeCount}
                    </span>
                )}
            </button>

            {isOpen && createPortal(
                <div
                    ref={dropdownRef}
                    className="fixed bg-white rounded-xl shadow-xl border border-gray-100 z-[9999] p-4 w-72"
                    style={{
                        top: menuPosition.top,
                        ...menuPosition.left !== undefined ? { left: menuPosition.left } : { right: menuPosition.right }
                    }}
                >
                    <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-100">
                        <h3 className="font-semibold text-gray-900">{t('filter_menu.title')}</h3>
                        <button
                            onClick={() => setIsOpen(false)}
                            className="text-gray-400 hover:text-gray-600"
                        >
                            <X size={18} />
                        </button>
                    </div>

                    <div className="space-y-4">
                        {/* Country */}
                        {showLocation && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    {t('filter_menu.country_label')}
                                </label>
                                <div className="relative">
                                    <select
                                        value={localFilters.country || ''}
                                        onChange={(e) => handleChange('country', e.target.value)}
                                        disabled={loadingCountries}
                                        className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none text-sm bg-white appearance-none ${isRTL ? 'pl-8' : 'pr-8'}`}
                                    >
                                        <option value="">{t('filter_menu.country_placeholder') || 'Select Country'}</option>
                                        {countries.map((c) => (
                                            <option key={c.code} value={c.code}>
                                                {c.name}
                                            </option>
                                        ))}
                                    </select>
                                    <ChevronDown className={`absolute ${isRTL ? 'left-3' : 'right-3'} top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none`} />
                                </div>
                            </div>
                        )}

                        {/* City */}
                        {showLocation && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    {t('filter_menu.city_label')}
                                </label>
                                <div className="relative">
                                    <select
                                        value={localFilters.city || ''}
                                        onChange={(e) => handleChange('city', e.target.value)}
                                        disabled={!localFilters.country || loadingCities}
                                        className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none text-sm bg-white appearance-none ${isRTL ? 'pl-8' : 'pr-8'}`}
                                    >
                                        <option value="">{t('filter_menu.city_placeholder') || 'Select City'}</option>
                                        {cities.map((c) => (
                                            <option key={c.id || c.name} value={c.name}>
                                                {c.name}
                                            </option>
                                        ))}
                                    </select>
                                    <ChevronDown className={`absolute ${isRTL ? 'left-3' : 'right-3'} top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none`} />
                                </div>
                            </div>
                        )}

                        {/* Assessor Status */}
                        {showAssessorStatus && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    {t('filter_menu.assessor_status_label')}
                                </label>
                                <div className="flex flex-col gap-2">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="radio"
                                            name="is_assessor"
                                            checked={localFilters.is_assessor === '' || localFilters.is_assessor === undefined}
                                            onChange={() => handleChange('is_assessor', '')}
                                            className="text-primary-600 focus:ring-primary-500"
                                        />
                                        <span className="text-sm text-gray-600">{t('filter_menu.status_all')}</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="radio"
                                            name="is_assessor"
                                            checked={localFilters.is_assessor === 'true'}
                                            onChange={() => handleChange('is_assessor', 'true')}
                                            className="text-primary-600 focus:ring-primary-500"
                                        />
                                        <span className="text-sm text-gray-600">{t('filter_menu.status_assessor')}</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="radio"
                                            name="is_assessor"
                                            checked={localFilters.is_assessor === 'false'}
                                            onChange={() => handleChange('is_assessor', 'false')}
                                            className="text-primary-600 focus:ring-primary-500"
                                        />
                                        <span className="text-sm text-gray-600">{t('filter_menu.status_instructor')}</span>
                                    </label>
                                </div>
                            </div>
                        )}

                        {/* Certificate Type */}
                        {showCertificateType && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    {t('filter_menu.type_label')}
                                </label>
                                <div className="flex flex-col gap-2">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="radio"
                                            name="type"
                                            checked={localFilters.type === '' || localFilters.type === undefined || localFilters.type === 'all'}
                                            onChange={() => handleChange('type', '')}
                                            className="text-primary-600 focus:ring-primary-500"
                                        />
                                        <span className="text-sm text-gray-600">{t('filter_menu.type_all')}</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="radio"
                                            name="type"
                                            checked={localFilters.type === 'instructor'}
                                            onChange={() => handleChange('type', 'instructor')}
                                            className="text-primary-600 focus:ring-primary-500"
                                        />
                                        <span className="text-sm text-gray-600">{t('filter_menu.type_instructor')}</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="radio"
                                            name="type"
                                            checked={localFilters.type === 'trainee'}
                                            onChange={() => handleChange('type', 'trainee')}
                                            className="text-primary-600 focus:ring-primary-500"
                                        />
                                        <span className="text-sm text-gray-600">{t('filter_menu.type_trainee')}</span>
                                    </label>
                                </div>
                            </div>
                        )}

                        {/* Status */}
                        {showStatus && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    {t('filter_menu.status_label')}
                                </label>
                                <div className="flex flex-col gap-2">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="radio"
                                            name="status"
                                            checked={localFilters.status === '' || localFilters.status === undefined || localFilters.status === 'all'}
                                            onChange={() => handleChange('status', '')}
                                            className="text-primary-600 focus:ring-primary-500"
                                        />
                                        <span className="text-sm text-gray-600">{t('filter_menu.status_all')}</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="radio"
                                            name="status"
                                            checked={localFilters.status === 'valid'}
                                            onChange={() => handleChange('status', 'valid')}
                                            className="text-primary-600 focus:ring-primary-500"
                                        />
                                        <span className="text-sm text-gray-600">{t('filter_menu.status_valid')}</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="radio"
                                            name="status"
                                            checked={localFilters.status === 'expired'}
                                            onChange={() => handleChange('status', 'expired')}
                                            className="text-primary-600 focus:ring-primary-500"
                                        />
                                        <span className="text-sm text-gray-600">{t('filter_menu.status_expired')}</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="radio"
                                            name="status"
                                            checked={localFilters.status === 'revoked'}
                                            onChange={() => handleChange('status', 'revoked')}
                                            className="text-primary-600 focus:ring-primary-500"
                                        />
                                        <span className="text-sm text-gray-600">{t('filter_menu.status_revoked')}</span>
                                    </label>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="flex gap-2 mt-6 pt-4 border-t border-gray-100">
                        <button
                            onClick={handleClear}
                            className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm font-medium transition-colors"
                        >
                            {t('filter_menu.clear_button')}
                        </button>
                        <button
                            onClick={handleApply}
                            className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm font-medium transition-colors flex items-center justify-center gap-2"
                        >
                            <Check size={16} />
                            {t('filter_menu.apply_button')}
                        </button>
                    </div>
                </div >,
                document.body
            )}
        </>
    );
};

export default FilterMenu;
