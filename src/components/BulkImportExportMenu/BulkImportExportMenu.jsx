import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Download, Upload, ChevronDown, FileSpreadsheet, Layers, X, CheckCircle, AlertCircle } from 'lucide-react';
import Modal from '../Modal/Modal';
import Button from '../Button/Button';
import './BulkImportExportMenu.css';

/**
 * BulkImportExportMenu
 *
 * Props:
 *   onDownloadCategories   (format) => Promise  — download categories template
 *   onImportCategories     (FormData) => Promise — import categories file
 *   onDownloadSubCategories(format) => Promise  — download sub-cats template
 *   onImportSubCategories  (FormData) => Promise — import sub-cats file
 *   categories             Array                — used to show valid names hint in CSV tip
 *   cancelLabel            string               — translated "Cancel" text (optional)
 */
const BulkImportExportMenu = ({
    onDownloadCategories,
    onImportCategories,
    onDownloadSubCategories,
    onImportSubCategories,
    categories = [],
    cancelLabel,
}) => {
    const { t } = useTranslation('common');
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef(null);

    // --- Categories import state ---
    const [isCatModalOpen, setIsCatModalOpen] = useState(false);
    const [catFile, setCatFile] = useState(null);
    const [catLoading, setCatLoading] = useState(false);
    const [catResult, setCatResult] = useState(null);
    const [catError, setCatError] = useState(null);

    // --- Sub-categories import state ---
    const [isSubCatModalOpen, setIsSubCatModalOpen] = useState(false);
    const [subCatFile, setSubCatFile] = useState(null);
    const [subCatLoading, setSubCatLoading] = useState(false);
    const [subCatResult, setSubCatResult] = useState(null);
    const [subCatError, setSubCatError] = useState(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handler = (e) => {
            if (menuRef.current && !menuRef.current.contains(e.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    // ── Helpers ────────────────────────────────────────────────────────────────

    const handleDownload = async (fn, type) => {
        setIsOpen(false);
        try {
            const response = await fn('xlsx');
            const blob = new Blob([response.data], { type: 'text/xlsx' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${type}_template.xlsx`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
        } catch (err) {
            alert(t('bulk_import_export.download_failed', { defaultValue: 'Failed to download template' }) + ': ' + (err.message || t('bulk_import_export.unknown_error', { defaultValue: 'Unknown error' })));
        }
    };

    const openCatModal = () => { setIsOpen(false); setIsCatModalOpen(true); };
    const openSubCatModal = () => { setIsOpen(false); setIsSubCatModalOpen(true); };

    const closeCatModal = () => {
        setIsCatModalOpen(false);
        setCatFile(null);
        setCatResult(null);
        setCatError(null);
    };

    const closeSubCatModal = () => {
        setIsSubCatModalOpen(false);
        setSubCatFile(null);
        setSubCatResult(null);
        setSubCatError(null);
    };

    const handleImportCat = async () => {
        if (!catFile) return;
        setCatLoading(true);
        setCatResult(null);
        setCatError(null);
        try {
            const fd = new FormData();
            fd.append('file', catFile);
            const result = await onImportCategories(fd);
            setCatResult(result);
        } catch (err) {
            setCatError({
                message: err.response?.data?.message || err.message || t('bulk_import_export.import_failed', { defaultValue: 'Import failed' }),
                errors: err.response?.data?.errors || [],
            });
        } finally {
            setCatLoading(false);
        }
    };

    const handleImportSubCat = async () => {
        if (!subCatFile) return;
        setSubCatLoading(true);
        setSubCatResult(null);
        setSubCatError(null);
        try {
            const fd = new FormData();
            fd.append('file', subCatFile);
            const result = await onImportSubCategories(fd);
            setSubCatResult(result);
        } catch (err) {
            setSubCatError({
                message: err.response?.data?.message || err.message || t('bulk_import_export.import_failed', { defaultValue: 'Import failed' }),
                errors: err.response?.data?.errors || [],
            });
        } finally {
            setSubCatLoading(false);
        }
    };

    // ── Shared sub-components ──────────────────────────────────────────────────

    const FileDropZone = ({ file, onFileChange }) => (
        <div className="biem-dropzone">
            <Upload className="biem-dropzone-icon" size={36} />
            <label className="biem-dropzone-label">
                <span className="biem-dropzone-filename">
                    {file ? file.name : t('bulk_import_export.click_to_choose_file', { defaultValue: 'Click to choose a file' })}
                </span>
                <input
                    type="file"
                    className="sr-only"
                    accept=".csv,.txt"
                    onChange={(e) => onFileChange(e.target.files[0] || null)}
                />
            </label>
            {!file && <p className="biem-dropzone-hint">{t('bulk_import_export.csv_files_only', { defaultValue: '.csv files only' })}</p>}
        </div>
    );

    const ResultBox = ({ result, error }) => {
        if (result) return (
            <div className="biem-result biem-result-success">
                <div className="biem-result-header">
                    <CheckCircle size={16} />
                    <span>{result.message}</span>
                </div>
                <div className="biem-result-counts">
                    <span>{t('bulk_import_export.created', { defaultValue: 'Created' })}: <strong>{result.created_count}</strong></span>
                    <span className="biem-result-sep">·</span>
                    <span>{t('bulk_import_export.updated', { defaultValue: 'Updated' })}: <strong>{result.updated_count}</strong></span>
                </div>
                {result.errors?.length > 0 && (
                    <ul className="biem-result-errors">
                        {result.errors.map((e, i) => <li key={i}>{e}</li>)}
                    </ul>
                )}
            </div>
        );
        if (error) return (
            <div className="biem-result biem-result-error">
                <div className="biem-result-header">
                    <AlertCircle size={16} />
                    <span>{error.message}</span>
                </div>
                {error.errors?.length > 0 && (
                    <ul className="biem-result-errors">
                        {error.errors.map((e, i) => <li key={i}>{e}</li>)}
                    </ul>
                )}
            </div>
        );
        return null;
    };

    // ── Render ─────────────────────────────────────────────────────────────────

    return (
        <>
            {/* Trigger + Dropdown */}
            <div className="biem-root" ref={menuRef}>
                <button
                    type="button"
                    className="biem-trigger"
                    onClick={() => setIsOpen((v) => !v)}
                >
                    <FileSpreadsheet size={16} className="biem-trigger-icon" />
                    <span>{t('bulk_import_export.import_export', { defaultValue: 'Import / Export' })}</span>
                    <ChevronDown size={14} className={`biem-trigger-chevron ${isOpen ? 'biem-trigger-chevron-open' : ''}`} />
                </button>

                {isOpen && (
                    <div className="biem-dropdown">
                        {/* Category section */}
                        <div className="biem-section-label">
                            <FileSpreadsheet size={12} />
                            {t('bulk_import_export.categories', { defaultValue: 'Categories' })}
                        </div>

                        <button
                            type="button"
                            className="biem-item"
                            onClick={() => handleDownload(onDownloadCategories, 'categories')}
                        >
                            <Download size={15} className="biem-item-icon biem-item-icon-blue" />
                            <div>
                                <div className="biem-item-title">{t('bulk_import_export.export_categories_template', { defaultValue: 'Export Categories Template' })}</div>
                                <div className="biem-item-desc">{t('bulk_import_export.download_csv_template', { defaultValue: 'Download CSV template file' })}</div>
                            </div>
                        </button>

                        <button
                            type="button"
                            className="biem-item"
                            onClick={openCatModal}
                        >
                            <Upload size={15} className="biem-item-icon biem-item-icon-green" />
                            <div>
                                <div className="biem-item-title">{t('bulk_import_export.import_categories', { defaultValue: 'Import Categories' })}</div>
                                <div className="biem-item-desc">{t('bulk_import_export.bulk_create_update_csv', { defaultValue: 'Bulk create/update from CSV' })}</div>
                            </div>
                        </button>

                        <div className="biem-divider" />

                        {/* Sub-Category section */}
                        <div className="biem-section-label">
                            <Layers size={12} />
                            {t('bulk_import_export.sub_categories', { defaultValue: 'Sub-Categories' })}
                        </div>

                        <button
                            type="button"
                            className="biem-item"
                            onClick={() => handleDownload(onDownloadSubCategories, 'sub-categories')}
                        >
                            <Download size={15} className="biem-item-icon biem-item-icon-blue" />
                            <div>
                                <div className="biem-item-title">{t('bulk_import_export.export_sub_categories_template', { defaultValue: 'Export Sub-Categories Template' })}</div>
                                <div className="biem-item-desc">{t('bulk_import_export.download_csv_template', { defaultValue: 'Download CSV template file' })}</div>
                            </div>
                        </button>

                        <button
                            type="button"
                            className="biem-item"
                            onClick={openSubCatModal}
                        >
                            <Upload size={15} className="biem-item-icon biem-item-icon-green" />
                            <div>
                                <div className="biem-item-title">{t('bulk_import_export.import_sub_categories', { defaultValue: 'Import Sub-Categories' })}</div>
                                <div className="biem-item-desc">{t('bulk_import_export.bulk_create_update_csv', { defaultValue: 'Bulk create/update from CSV' })}</div>
                            </div>
                        </button>
                    </div>
                )}
            </div>

            {/* ── Import Categories Modal ── */}
            <Modal isOpen={isCatModalOpen} onClose={closeCatModal} title={t('bulk_import_export.import_categories', { defaultValue: 'Import Categories' })} size="md">
                <div className="biem-modal-body">
                    <p className="biem-modal-desc">
                        {t('bulk_import_export.upload_csv_categories', { defaultValue: 'Upload a .csv file to bulk create or update categories.' })}
                    </p>

                    <button
                        type="button"
                        className="biem-dl-link"
                        onClick={() => handleDownload(onDownloadCategories, 'categories')}
                    >
                        <Download size={13} /> {t('bulk_import_export.download_template_csv', { defaultValue: 'Download Template (csv)' })}
                    </button>

                    <FileDropZone file={catFile} onFileChange={(f) => { setCatFile(f); setCatResult(null); setCatError(null); }} />
                    <ResultBox result={catResult} error={catError} />

                    <div className="biem-modal-actions">
                        <button type="button" onClick={closeCatModal} className="biem-cancel-btn">
                            {cancelLabel || t('common.cancel', { defaultValue: 'Cancel' })}
                        </button>
                        <Button
                            onClick={handleImportCat}
                            disabled={!catFile || catLoading}
                            loading={catLoading}
                            icon={<Upload size={15} />}
                            fullWidth
                        >
                            {catLoading ? t('bulk_import_export.importing', { defaultValue: 'Importing…' }) : t('bulk_import_export.import', { defaultValue: 'Import' })}
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* ── Import Sub-Categories Modal ── */}
            <Modal isOpen={isSubCatModalOpen} onClose={closeSubCatModal} title={t('bulk_import_export.import_sub_categories', { defaultValue: 'Import Sub-Categories' })} size="md">
                <div className="biem-modal-body">
                    <p className="biem-modal-desc">
                        {t('bulk_import_export.upload_csv_sub_categories', { defaultValue: 'Upload a .csv file to bulk create or update sub-categories.' })}
                        <br />
                        {t('bulk_import_export.category_column_exact', { defaultValue: 'The category column must contain the exact category name.' })}
                    </p>

                    <button
                        type="button"
                        className="biem-dl-link"
                        onClick={() => handleDownload(onDownloadSubCategories, 'sub-categories')}
                    >
                        <Download size={13} /> {t('bulk_import_export.download_template_csv', { defaultValue: 'Download Template (csv)' })}
                    </button>

                    {categories.length > 0 && (
                        <div className="biem-csv-tip">
                            <p className="biem-csv-tip-title">{t('bulk_import_export.valid_category_names', { defaultValue: 'Valid category names:' })}</p>
                            <div className="biem-csv-tip-tags">
                                {categories.slice(0, 12).map((c) => (
                                    <span key={c.id} className="biem-csv-tip-tag">{c.name}</span>
                                ))}
                                {categories.length > 12 && (
                                    <span className="biem-csv-tip-more">+{categories.length - 12} {t('bulk_import_export.more', { defaultValue: 'more' })}</span>
                                )}
                            </div>
                        </div>
                    )}

                    <FileDropZone file={subCatFile} onFileChange={(f) => { setSubCatFile(f); setSubCatResult(null); setSubCatError(null); }} />
                    <ResultBox result={subCatResult} error={subCatError} />

                    <div className="biem-modal-actions">
                        <button type="button" onClick={closeSubCatModal} className="biem-cancel-btn">
                            {cancelLabel || t('common.cancel', { defaultValue: 'Cancel' })}
                        </button>
                        <Button
                            onClick={handleImportSubCat}
                            disabled={!subCatFile || subCatLoading}
                            loading={subCatLoading}
                            icon={<Upload size={15} />}
                            fullWidth
                        >
                            {subCatLoading ? t('bulk_import_export.importing', { defaultValue: 'Importing…' }) : t('bulk_import_export.import', { defaultValue: 'Import' })}
                        </Button>
                    </div>
                </div>
            </Modal>
        </>
    );
};

export default BulkImportExportMenu;
