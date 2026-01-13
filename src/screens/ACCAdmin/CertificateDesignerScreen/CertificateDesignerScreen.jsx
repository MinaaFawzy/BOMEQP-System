import { useEffect, useState, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import fabric from '../../../utils/fabric-wrapper.js';
import { accAPI } from '../../../services/api';
import { ArrowLeft, Upload, Type, Trash2, Move, Save, AlignLeft, AlignCenter, AlignRight } from 'lucide-react';
import './CertificateDesignerScreen.css';

const CertificateDesignerScreen = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    // Removed useHeader hook as we are now standalone

    // State
    const [template, setTemplate] = useState(null);
    const [loading, setLoading] = useState(true);
    const [savingConfig, setSavingConfig] = useState(false);
    const [uploadingImage, setUploadingImage] = useState(false);
    const [placeholders, setPlaceholders] = useState([]);
    const [selectedPlaceholder, setSelectedPlaceholder] = useState(null);
    const [error, setError] = useState(null);

    // Constants
    const availablePlaceholders = useMemo(() => [
        { variable: 'student_name', label: 'Student Name' },
        { variable: 'course_name', label: 'Course Name' },
        { variable: 'date', label: 'Issue Date' },
        { variable: 'expiry_date', label: 'Expiry Date' },
        { variable: 'cert_id', label: 'Certificate ID' },
        { variable: 'verification_code', label: 'Verification Code' },
    ], []);

    const fontFamilies = [
        'Arial', 'Helvetica', 'Times New Roman', 'Courier New',
        'Verdana', 'Georgia', 'Tahoma', 'Trebuchet MS', 'Impact'
    ];

    // Refs
    const canvasRef = useRef(null);
    const canvas = useRef(null);
    const wrapperRef = useRef(null);

    // Initialize Screen
    useEffect(() => {
        loadTemplate();

        return () => {
            if (canvas.current) {
                canvas.current.dispose();
                canvas.current = null;
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    // Load Template Data
    const loadTemplate = async () => {
        try {
            setLoading(true);
            const data = await accAPI.getTemplateDetails(id);

            // Handle different response structures
            const templateData = data.template || data.data || data;
            setTemplate(templateData);

            if (templateData.name) {
                // Title handled in local state/UI now
            }
        } catch (err) {
            console.error('Failed to load template:', err);
            setError('Failed to load template details.');
        } finally {
            setLoading(false);
        }
    };

    // Initialize Canvas after template load
    useEffect(() => {
        if (!loading && template && canvasRef.current && !canvas.current) {
            initializeCanvas();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [loading, template]);

    const initializeCanvas = () => {
        if (!wrapperRef.current) return;

        // Calculate dimensions to fit in view
        // A4 Landscape Ratio: 1200 x 848 (approx)
        const targetWidth = 1200;
        const targetHeight = 848;

        // Get available space in wrapper
        const padding = 64; // 2rem padding on each side
        const availableWidth = wrapperRef.current.clientWidth - padding;
        const availableHeight = wrapperRef.current.clientHeight - padding;

        // Calculate scale
        const scaleX = availableWidth / targetWidth;
        const scaleY = availableHeight / targetHeight;
        const scale = Math.min(scaleX, scaleY, 0.9); // Limit max scale to 90% of available space

        // Create Canvas
        canvas.current = new fabric.Canvas(canvasRef.current, {
            width: targetWidth * scale,
            height: targetHeight * scale,
            backgroundColor: '#ffffff',
            preserveObjectStacking: true,
            selection: true,
        });

        // Set Viewport Transform for Zoom
        canvas.current.setZoom(scale);

        // Load Background Image
        if (template.background_image_url) {
            loadBackgroundImage(template.background_image_url);
        }

        // Load Config Objects
        if (template.config_json && Array.isArray(template.config_json)) {
            loadTemplateConfig(template.config_json);
        }

        // Event Listeners
        canvas.current.on('selection:created', handleSelection);
        canvas.current.on('selection:updated', handleSelection);
        canvas.current.on('selection:cleared', () => setSelectedPlaceholder(null));
        canvas.current.on('object:modified', updatePlaceholdersList);
        canvas.current.on('object:moving', updatePlaceholdersList);
    };

    // Canvas Helpers
    const handleSelection = (e) => {
        const obj = e.selected[0];
        if (obj) {
            setSelectedPlaceholder(obj.variable || obj.text);
            updatePlaceholdersList();
        }
    };


    const loadBackgroundImage = (url) => {
        if (!canvas.current || !url) {
            console.warn('Cannot load background: canvas or url missing', { canvas: !!canvas.current, url });
            return;
        }

        // Add a small delay to ensure canvas is fully ready/rendered
        setTimeout(() => {
            fabric.Image.fromURL(url, (img) => {
                if (!img) {
                    console.error('Failed to load image from URL:', url);
                    return;
                }

                // Scale image to fit canvas (A4 size)
                const canvasWidth = 1200;
                const canvasHeight = 848;

                // Calculate scale to cover the canvas or fit? Usually fit for certificate background
                // If the image is exactly A4 ratio, it should match perfectly.
                // Otherwise, we might want to stretch or 'meet'. 
                // Let's assume the uploaded image IS the certificate background.

                const scaleX = canvasWidth / img.width;
                const scaleY = canvasHeight / img.height;

                img.set({
                    scaleX: scaleX,
                    scaleY: scaleY,
                    originX: 'left', // Changed to left/top to match canvas origin
                    originY: 'top',
                    left: 0,
                    top: 0,
                    selectable: false,
                    evented: false,
                });

                if (canvas.current) {
                    canvas.current.setBackgroundImage(img, () => {
                        canvas.current.renderAll();
                    });
                }
            });
        }, 100);
    };

    const loadTemplateConfig = (config) => {
        if (!canvas.current) return;

        config.forEach(item => {
            const text = new fabric.Text(item.variable || item.text || '', {
                left: (item.x || 0) * 1200,
                top: (item.y || 0) * 848,
                fontSize: item.font_size || 24,
                fill: item.color || '#000000',
                fontFamily: item.font_family || 'Arial',
                textAlign: item.text_align || 'left',
                originX: item.text_align === 'center' ? 'center' : (item.text_align === 'right' ? 'right' : 'left'),
                originY: 'top',
                lockScalingX: true,
                lockScalingY: true,
            });

            // Disable scaling controls
            text.setControlsVisibility({
                mt: false, mb: false, ml: false, mr: false,
                bl: false, br: false, tl: false, tr: false
            });

            // If text contains {{}}, treat as variable mode, otherwise text
            if (item.variable && item.variable.includes('{{')) {
                text.variable = item.variable.replace(/[{}]/g, '');
                text.isStatic = false;
            } else {
                text.isStatic = true;
                text.text = item.variable || item.text; // Fallback for legacy
            }

            // Correction for alignment: Backend stores Top-Left (x,y).
            // Fabric needs 'left'/'top' based on originX/originY.
            // If originX is center, left = x + width/2.
            // But width is not fully known until render? Fabric calculates it on creation.
            // Let's assume standard width for now or recalculate.
            // Actually, we can just set left/top to x/y first (Top-Left), set origin to left/top, 
            // THEN change origin to center/center if needed without moving the object?
            // Fabric's setPositionByOrigin is useful.

            // First, set it at Top-Left
            text.set({
                originX: 'left',
                originY: 'top',
                left: (item.x || 0) * 1200,
                top: (item.y || 0) * 848
            });

            // Now apply the desired text alignment and origin
            const finalOriginX = item.text_align === 'center' ? 'center' : (item.text_align === 'right' ? 'right' : 'left');

            // Adjust position to maintain visual placement while changing origin
            // We want the visual Top-Left to stay at item.x * 1200, item.y * 848
            // basically we don't need to do anything complex if we use setPositionByOrigin?
            // BUT we want to SET properties. 
            // If we change originX to center, the effective 'left' property changes.
            // So:

            if (finalOriginX !== 'left') {
                const centerPoint = text.getPointByOrigin(finalOriginX, 'top');
                // This gets current point. We want to MATCH the point.
                // Actually simpler:
                // 1. Set origin: left, top. 
                // 2. Set left: x, top: y.
                // 3. Update origin to targetOrigin.
                // 4. Recalculate left/top to keep object in place.
                text.set({ originX: finalOriginX });
                // Fabric might shift it visually if we just change originX without adjusting left.
                // So we need to shift 'left' by width/2 if center, width if right.
                if (finalOriginX === 'center') {
                    text.set({ left: text.left + (text.width * text.scaleX) / 2 });
                } else if (finalOriginX === 'right') {
                    text.set({ left: text.left + (text.width * text.scaleX) });
                }
            }

            // Disable scaling controls
            text.setControlsVisibility({
                mt: false, mb: false, ml: false, mr: false,
                bl: false, br: false, tl: false, tr: false
            });

            canvas.current.add(text);
        });

        canvas.current.renderAll();
        updatePlaceholdersList();
    };

    // Actions
    const addPlaceholder = (variableName, isCustomText = false) => {
        if (!canvas.current) return;

        const content = isCustomText ? 'Custom Text' : `{{${variableName}}}`;

        const text = new fabric.Text(content, {
            left: 1200 / 2,
            top: 848 / 2,
            fontSize: 24,
            fill: '#000000',
            fontFamily: 'Arial',
            textAlign: 'center',
            originX: 'center',
            originY: 'top',
            lockScalingX: true,
            lockScalingY: true,
        });

        // Disable scaling controls
        text.setControlsVisibility({
            mt: false, mb: false, ml: false, mr: false,
            bl: false, br: false, tl: false, tr: false
        });

        if (isCustomText) {
            text.isStatic = true;
            text.text = content;
        } else {
            text.variable = variableName;
        }

        canvas.current.add(text);
        canvas.current.setActiveObject(text);
        canvas.current.renderAll();
        updatePlaceholdersList();
    };

    const updatePlaceholdersList = () => {
        if (!canvas.current) return;
        const objects = canvas.current.getObjects().filter(obj => obj.type === 'text');

        const list = objects.map(obj => {
            // Calculate Top-Left coordinates regardless of origin/alignment
            const tl = obj.getPointByOrigin('left', 'top');

            // Ensure color is Hex for backend
            let fill = obj.fill || '#000000';
            try {
                // Check if it is not a hex string (simple check)
                if (typeof fill === 'string' && !fill.startsWith('#')) {
                    const c = new fabric.Color(fill);
                    fill = '#' + c.toHex();
                }
            } catch (e) {
                console.warn('Color conversion failed', e);
            }

            return {
                variable: obj.variable || null,
                text: obj.text, // Always serve text content
                isStatic: !!obj.isStatic,
                x: tl.x / 1200,
                y: tl.y / 848,
                fontFamily: obj.fontFamily || 'Arial',
                fontSize: obj.fontSize || 24,
                color: fill,
                textAlign: obj.textAlign || 'left',
            };
        });

        setPlaceholders(list);
    };

    const handlePropertyChange = (prop, value) => {
        const activeObj = canvas.current?.getActiveObject();
        if (!activeObj) return;

        if (prop === 'text' && activeObj.isStatic) {
            activeObj.set('text', value);
        } else if (prop === 'textAlign') {
            activeObj.set('textAlign', value);
            activeObj.set('originX', value === 'center' ? 'center' : (value === 'right' ? 'right' : 'left'));
        } else if (prop === 'fontSize') {
            // Validations for fontSize
            const val = parseInt(value);
            if (!isNaN(val) && val > 0) {
                activeObj.set(prop, val);
            }
        } else {
            activeObj.set(prop, value);
        }

        canvas.current.renderAll();
        updatePlaceholdersList();
    };

    const deleteSelected = () => {
        const activeObj = canvas.current?.getActiveObject();
        if (activeObj) {
            canvas.current.remove(activeObj);
            canvas.current.renderAll();
            updatePlaceholdersList();
            setSelectedPlaceholder(null);
        }
    };

    const handleImageUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setUploadingImage(true);
        try {
            const formData = new FormData();
            formData.append('background_image', file);

            const response = await accAPI.uploadBackgroundImage(template.id, formData);
            const newUrl = response.background_image_url || response.template?.background_image_url;

            if (newUrl) {
                loadBackgroundImage(newUrl);
                // Update local template state
                setTemplate(prev => ({ ...prev, background_image_url: newUrl }));
            }
        } catch (err) {
            console.error('Upload failed:', err);
            alert('Failed to upload image');
        } finally {
            setUploadingImage(false);
        }
    };

    const handleSave = async () => {
        setSavingConfig(true);
        try {
            const config = placeholders.map(p => ({
                // Send the exact text content as 'variable'
                // This covers both "{{student_name}}" and "Custom Text"
                variable: p.text,
                x: p.x,
                y: p.y,
                font_family: p.fontFamily,
                font_size: p.fontSize,
                color: p.color,
                text_align: p.textAlign,
            }));

            await accAPI.updateTemplateConfig(template.id, { config_json: config });
            alert('Configuration saved successfully!');
            navigate('/acc/certificate-templates');
        } catch (err) {
            console.error('Save failed:', err);
            alert('Failed to save configuration');
        } finally {
            setSavingConfig(false);
        }
    };

    // Derived state for property panel
    const activeObj = canvas.current?.getActiveObject();

    // Ensure hex for color input
    let activeFill = activeObj?.fill || '#000000';
    if (activeObj && typeof activeFill === 'string' && !activeFill.startsWith('#')) {
        try {
            activeFill = '#' + new fabric.Color(activeFill).toHex();
        } catch { /* ignore */ }
    }

    const activeProperties = activeObj ? {
        fontFamily: activeObj.fontFamily,
        fontSize: activeObj.fontSize,
        fill: activeFill,
        textAlign: activeObj.textAlign,
        text: activeObj.text,
        isStatic: activeObj.isStatic
    } : null;

    if (loading) return (
        <div className="flex h-screen items-center justify-center bg-gray-50">
            <div className="spinner"></div>
            <p className="ml-3 text-gray-500">Loading designer...</p>
        </div>
    );

    if (error) return (
        <div className="flex h-screen items-center justify-center bg-gray-50 flex-col">
            <div className="text-red-500 mb-4 text-xl">⚠️ {error}</div>
            <button
                onClick={() => navigate('/acc/certificate-templates')}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
                Go Back
            </button>
        </div>
    );

    return (
        <div className="flex flex-col h-screen bg-gray-100 designer-screen">
            {/* Custom Header */}
            <header className="bg-white border-b border-gray-200 h-16 flex items-center justify-between px-6 flex-shrink-0 z-20 shadow-sm">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate('/acc/certificate-templates')}
                        className="p-2 hover:bg-gray-100 rounded-full text-gray-600 transition-colors"
                        title="Back to Templates"
                    >
                        <ArrowLeft size={24} />
                    </button>
                    <div>
                        <h1 className="text-lg font-bold text-gray-900 leading-tight">
                            {template?.name || 'Untitled Template'}
                        </h1>
                        <p className="text-xs text-gray-500">Certificate Designer</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${template?.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                        }`}>
                        {template?.status?.toUpperCase()}
                    </span>
                </div>
            </header>

            <div className="designer-container flex-1 overflow-hidden relative">
                {/* Left Sidebar - Tools */}
                <div className="designer-sidebar">
                    {/* Background Section */}
                    <div className="sidebar-section">
                        <div className="section-title">Background</div>
                        <label className="tool-btn primary">
                            <Upload size={18} />
                            {uploadingImage ? 'Uploading...' : 'Upload Image'}
                            <input
                                type="file"
                                className="hidden"
                                accept="image/png,image/jpeg"
                                onChange={handleImageUpload}
                                disabled={uploadingImage}
                            />
                        </label>
                    </div>

                    {/* Dynamic Fields Section */}
                    <div className="sidebar-section">
                        <div className="section-title">Dynamic Fields</div>
                        <div className="grid grid-cols-1 gap-2">
                            {availablePlaceholders.map(field => (
                                <button
                                    key={field.variable}
                                    onClick={() => addPlaceholder(field.variable)}
                                    className="tool-btn"
                                >
                                    <div className="p-1 bg-blue-50 text-blue-600 rounded">
                                        <Type size={14} />
                                    </div>
                                    {field.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Static Elements Section */}
                    <div className="sidebar-section">
                        <div className="section-title">Elements</div>
                        <button
                            onClick={() => addPlaceholder(null, true)}
                            className="tool-btn"
                        >
                            <div className="p-1 bg-purple-50 text-purple-600 rounded">
                                <Type size={14} />
                            </div>
                            Custom Text
                        </button>
                    </div>
                </div>

                {/* Main Workspace */}
                <div className="designer-workspace">
                    {/* Workspace Toolbar */}
                    <div className="workspace-header">
                        <div className="template-info">
                            <span className="template-name">{template?.name || 'Untitled Template'}</span>
                            <span className="template-status">{template?.status || 'draft'}</span>
                        </div>

                        <div className="workspace-actions">
                            <button
                                className="action-btn btn-primary"
                                onClick={handleSave}
                                disabled={savingConfig}
                            >
                                <Save size={18} />
                                {savingConfig ? 'Saving...' : 'Save Changes'}
                            </button>
                        </div>
                    </div>

                    {/* Canvas Area */}
                    <div className="canvas-wrapper" ref={wrapperRef}>
                        <div className="canvas-container-shadow">
                            <canvas ref={canvasRef} />
                        </div>
                    </div>
                </div>

                {/* Right Sidebar - Properties */}
                <div className="designer-properties">
                    <div className="properties-header">
                        <div className="properties-title">
                            Properties
                            {activeProperties && (
                                <button
                                    onClick={deleteSelected}
                                    className="text-red-500 hover:text-red-700 p-1 hover:bg-red-50 rounded"
                                    title="Delete Selected"
                                >
                                    <Trash2 size={18} />
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="properties-content">
                        {activeProperties ? (
                            <>
                                <div className="property-group">
                                    <label className="property-label">Text Content</label>
                                    <input
                                        type="text"
                                        className="property-input"
                                        value={activeProperties.text}
                                        onChange={(e) => handlePropertyChange('text', e.target.value)}
                                    />
                                </div>

                                <div className="property-group">
                                    <label className="property-label">Font Family</label>
                                    <select
                                        className="property-select"
                                        value={activeProperties.fontFamily}
                                        onChange={(e) => handlePropertyChange('fontFamily', e.target.value)}
                                    >
                                        {fontFamilies.map(font => (
                                            <option key={font} value={font}>{font}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="property-group">
                                    <div className="flex justify-between gap-4">
                                        <div className="flex-1">
                                            <label className="property-label">Font Size</label>
                                            <input
                                                type="number"
                                                className="property-input"
                                                value={activeProperties.fontSize}
                                                onChange={(e) => handlePropertyChange('fontSize', parseInt(e.target.value))}
                                                min="8"
                                                max="200"
                                            />
                                        </div>
                                        <div className="w-1/3">
                                            <label className="property-label">Color</label>
                                            <input
                                                type="color"
                                                className="h-[38px] w-full p-1 border rounded cursor-pointer"
                                                value={activeProperties.fill}
                                                onChange={(e) => handlePropertyChange('fill', e.target.value)}
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="property-group">
                                    <label className="property-label">Alignment</label>
                                    <div className="flex gap-2 bg-gray-50 p-1 rounded-lg border border-gray-200">
                                        {['left', 'center', 'right'].map((align) => (
                                            <button
                                                key={align}
                                                onClick={() => handlePropertyChange('textAlign', align)}
                                                className={`flex-1 p-2 rounded flex justify-center items-center transition-colors ${activeProperties.textAlign === align
                                                    ? 'bg-white shadow-sm text-blue-600'
                                                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                                                    }`}
                                            >
                                                {align === 'left' && <AlignLeft size={16} />}
                                                {align === 'center' && <AlignCenter size={16} />}
                                                {align === 'right' && <AlignRight size={16} />}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="empty-state">
                                <Move size={48} className="empty-icon" />
                                <p className="font-medium text-gray-900 mb-1">No Selection</p>
                                <p className="text-sm">Select an element on the canvas to edit its properties.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CertificateDesignerScreen;
