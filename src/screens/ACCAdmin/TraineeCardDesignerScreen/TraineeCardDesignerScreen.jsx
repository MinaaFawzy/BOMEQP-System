import { useEffect, useState, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import fabric from '../../../utils/fabric-wrapper.js';
import { accAPI } from '../../../services/api';
import { ArrowLeft, Upload, Type, Trash2, Move, Save, Bold, ChevronDown, ChevronRight, Image as ImageIcon, CreditCard } from 'lucide-react';
import './TraineeCardDesignerScreen.css';

import trainingCenterLogo from '../../../assets/training_center_logo.png';
import accLogo from '../../../assets/accretidation_logo.png';
import qrCode from '../../../assets/QRcode.png';
import instructorPhoto from '../../../assets/instructor.png';
import traineePhoto from '../../../assets/trainee_photo.png';

// Card dimensions: CR80 wallet card ratio ~1.586:1
const CARD_WIDTH = 856;
const CARD_HEIGHT = 540;

const IMAGE_PLACEHOLDER_VARS = ['instructor_photo', 'training_center_logo', 'acc_logo', 'qr_code', 'trainee_photo'];

const AVAILABLE_VARIABLES = [
    { variable: 'instructor_name', label: 'Instructor Full Name' },
    // { variable: 'instructor_first_name', label: 'First Name' },
    // { variable: 'instructor_last_name', label: 'Last Name' },
    { variable: 'student_name', label: 'Student Name' },
    { variable: 'course_name', label: 'Course Name' },
    { variable: 'course_code', label: 'Course Code' },
    { variable: 'training_center_name', label: 'Training Provider Name' },
    { variable: 'acc_name', label: 'ACC Name' },
    { variable: 'issue_date', label: 'Issue Date' },
    { variable: 'issue_date_formatted', label: 'Issue Date (Formatted)' },
    { variable: 'expiry_date', label: 'Expiry Date' },
    { variable: 'serial_number', label: 'Serial Number' },
    { variable: 'instructor_photo', label: 'Instructor Photo (Image)' },
    { variable: 'trainee_photo', label: 'Trainee Photo (Image)' },
    { variable: 'training_center_logo', label: 'Training Provider Logo (Image)' },
    { variable: 'acc_logo', label: 'ACC Logo (Image)' },
    { variable: 'qr_code', label: 'QR Code (Image)' },
];

const EXAMPLE_DATA = {
    instructor_name: 'Dr. Sarah Johnson',
    instructor_first_name: 'Sarah',
    instructor_last_name: 'Johnson',
    student_name: 'John Doe',
    course_name: 'Advanced Project Management',
    course_code: 'APM-301',
    training_center_name: 'Excellence Training Provider',
    acc_name: 'Global Accreditation Council',
    issue_date: '2026-01-15',
    issue_date_formatted: 'January 15, 2026',
    expiry_date: '2027-01-15',
    serial_number: 'CARD-2026-ABC123XYZ',
    instructor_photo: instructorPhoto,
    trainee_photo: traineePhoto,
    training_center_logo: trainingCenterLogo,
    acc_logo: accLogo,
    qr_code: qrCode,
};

const SidebarSection = ({ title, children, defaultOpen = true }) => {
    const [isOpen, setIsOpen] = useState(defaultOpen);
    return (
        <div className="card-sidebar-section">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="card-section-title w-full flex items-center justify-between hover:bg-gray-50 p-1 rounded cursor-pointer group"
            >
                <span className="group-hover:text-gray-900 transition-colors">{title}</span>
                {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </button>
            {isOpen && (
                <div className="mt-2">
                    {children}
                </div>
            )}
        </div>
    );
};

const TraineeCardDesignerScreen = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    const [template, setTemplate] = useState(null);
    const [loading, setLoading] = useState(true);
    const [savingConfig, setSavingConfig] = useState(false);
    const [uploadingImage, setUploadingImage] = useState(false);
    const [placeholders, setPlaceholders] = useState([]);
    const [selectedPlaceholder, setSelectedPlaceholder] = useState(null);
    const [error, setError] = useState(null);

    const canvasRef = useRef(null);
    const canvas = useRef(null);
    const wrapperRef = useRef(null);

    // ──────────────────────────────
    // Load template
    // ──────────────────────────────
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

    const loadTemplate = async () => {
        try {
            setLoading(true);
            const data = await accAPI.getTemplateDetails(id);
            const templateData = data.template || data.data || data;
            setTemplate(templateData);
        } catch (err) {
            console.error('Failed to load template:', err);
            setError('Failed to load template details.');
        } finally {
            setLoading(false);
        }
    };

    // ──────────────────────────────
    // Canvas initialization
    // ──────────────────────────────
    useEffect(() => {
        if (!loading && template && canvasRef.current && !canvas.current) {
            initializeCanvas();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [loading, template]);

    const initializeCanvas = () => {
        if (!wrapperRef.current) return;

        const padding = 64;
        const availableWidth = wrapperRef.current.clientWidth - padding;
        const availableHeight = wrapperRef.current.clientHeight - padding;

        const scaleX = availableWidth / CARD_WIDTH;
        const scaleY = availableHeight / CARD_HEIGHT;
        const scale = Math.min(scaleX, scaleY, 1.0);

        canvas.current = new fabric.Canvas(canvasRef.current, {
            width: CARD_WIDTH * scale,
            height: CARD_HEIGHT * scale,
            backgroundColor: '#ffffff',
            preserveObjectStacking: true,
            selection: true,
        });
        canvas.current.setZoom(scale);

        // Load card background
        const bgUrl = template.card_background_image_url;
        if (bgUrl) loadBackgroundImage(bgUrl);

        // Load saved card config
        const cardConfig = template.card_config_json;
        if (cardConfig) {
            const elements = Array.isArray(cardConfig) ? cardConfig : (cardConfig.elements || []);
            if (elements.length > 0) loadCardConfig(elements);
        }

        setTimeout(() => refreshVariableDisplays(), 200);

        canvas.current.on('selection:created', handleSelection);
        canvas.current.on('selection:updated', handleSelection);
        canvas.current.on('selection:cleared', () => setSelectedPlaceholder(null));
        canvas.current.on('object:modified', updatePlaceholdersList);
        canvas.current.on('object:moving', updatePlaceholdersList);
    };

    const handleSelection = (e) => {
        const obj = e.selected[0];
        if (obj) {
            setSelectedPlaceholder(obj.variable || obj.text);
            updatePlaceholdersList();
        }
    };

    const loadBackgroundImage = (url) => {
        if (!canvas.current || !url) return;
        setTimeout(() => {
            fabric.Image.fromURL(url, (img) => {
                if (!img || !canvas.current) return;
                img.set({
                    scaleX: CARD_WIDTH / img.width,
                    scaleY: CARD_HEIGHT / img.height,
                    originX: 'left',
                    originY: 'top',
                    left: 0,
                    top: 0,
                    selectable: false,
                    evented: false,
                });
                canvas.current.setBackgroundImage(img, () => canvas.current.renderAll());
            }, { crossOrigin: 'anonymous' });
        }, 100);
    };

    const extractVariableName = (text) => {
        if (!text) return null;
        const match = text.match(/\{\{(\w+)\}\}/);
        return match ? match[1] : null;
    };

    const refreshVariableDisplays = () => {
        if (!canvas.current) return;
        const objects = canvas.current.getObjects();

        // Text elements
        objects.filter(o => o.type === 'text').forEach(obj => {
            if (obj.variable && !obj.isStatic) {
                const ex = EXAMPLE_DATA[obj.variable] || `{{${obj.variable}}}`;
                if (obj.text !== ex) obj.set('text', ex);
            }
        });

        // Image elements
        const imageObjs = objects.filter(o => o.elementType === 'image' && o.variable);
        const byVar = {};
        imageObjs.forEach(o => {
            if (!byVar[o.variable]) byVar[o.variable] = [];
            byVar[o.variable].push(o);
        });

        Object.keys(byVar).forEach(variable => {
            const objs = byVar[variable];
            const imgPath = EXAMPLE_DATA[variable];
            if (!imgPath) return;
            const rect = objs.find(o => o.type === 'rect');
            if (rect) {
                objs.forEach(o => canvas.current.remove(o));
                fabric.Image.fromURL(imgPath, (img) => {
                    if (!img || !canvas.current) return;
                    img.set({
                        scaleX: rect.getScaledWidth() / img.width,
                        scaleY: rect.getScaledHeight() / img.height,
                        originX: 'left',
                        originY: 'top',
                        left: rect.left,
                        top: rect.top,
                        selectable: true,
                        evented: true,
                    });
                    img.variable = variable;
                    img.elementType = 'image';
                    img.setControlsVisibility({ mt: true, mb: true, ml: true, mr: true, bl: true, br: true, tl: true, tr: true });
                    canvas.current.add(img);
                    canvas.current.renderAll();
                    updatePlaceholdersList();
                }, { crossOrigin: 'anonymous' });
            }
        });

        canvas.current.renderAll();
    };

    const loadCardConfig = (elements) => {
        if (!canvas.current) return;
        const processed = new Set();

        elements.forEach(item => {
            const variableName = extractVariableName(item.variable || item.text || '');
            const isImage = item.type === 'image' || item.element_type === 'image' || (variableName && IMAGE_PLACEHOLDER_VARS.includes(variableName));

            if (isImage && variableName) {
                if (processed.has(variableName)) return;
                processed.add(variableName);
                const w = item.width != null ? (item.width <= 2 ? item.width * CARD_WIDTH : item.width) : 100;
                const h = item.height != null ? (item.height <= 2 ? item.height * CARD_HEIGHT : item.height) : 70;
                const rect = new fabric.Rect({
                    left: (item.x || 0) * CARD_WIDTH,
                    top: (item.y || 0) * CARD_HEIGHT,
                    width: w, height: h,
                    fill: '#f0f4f8', stroke: '#94a3b8', strokeWidth: 2,
                    strokeDashArray: [6, 4], originX: 'left', originY: 'top',
                });
                rect.variable = variableName;
                rect.elementType = 'image';
                rect.setControlsVisibility({ mt: true, mb: true, ml: true, mr: true, bl: true, br: true, tl: true, tr: true });
                canvas.current.add(rect);
                return;
            }

            const isStatic = !variableName;
            const displayText = isStatic
                ? (item.variable || item.text || '')
                : (EXAMPLE_DATA[variableName] || `{{${variableName}}}`);
            const textAlign = item.text_align || item.textAlign || 'left';
            const originX = textAlign === 'center' ? 'center' : textAlign === 'right' ? 'right' : 'left';

            const text = new fabric.Text(displayText, {
                left: (item.x || 0) * CARD_WIDTH,
                top: (item.y || 0) * CARD_HEIGHT,
                fontSize: item.font_size || item.fontSize || 18,
                fill: item.color || '#000000',
                fontFamily: item.font_family || item.fontFamily || 'Arial',
                textAlign,
                originX,
                originY: 'top',
                fontWeight: item.font_weight || item.fontWeight || 'normal',
                lockScalingX: true,
                lockScalingY: true,
            });
            text.setControlsVisibility({ mt: false, mb: false, ml: false, mr: false, bl: false, br: false, tl: false, tr: false });
            if (variableName) { text.variable = variableName; text.isStatic = false; }
            else { text.isStatic = true; }
            canvas.current.add(text);
        });

        canvas.current.renderAll();
        updatePlaceholdersList();
    };

    // ──────────────────────────────
    // Add / delete elements
    // ──────────────────────────────
    const addPlaceholder = (variableName, isCustomText = false, customTextContent = 'Custom Text') => {
        if (!canvas.current) return;

        if (variableName && IMAGE_PLACEHOLDER_VARS.includes(variableName)) {
            const imgPath = EXAMPLE_DATA[variableName];
            if (imgPath) {
                fabric.Image.fromURL(imgPath, (img) => {
                    if (!img || !canvas.current) return;
                    const dw = 100, dh = 70;
                    img.set({
                        scaleX: dw / img.width, scaleY: dh / img.height,
                        left: CARD_WIDTH / 2 - dw / 2, top: CARD_HEIGHT / 2 - dh / 2,
                        originX: 'left', originY: 'top',
                        selectable: true, evented: true,
                    });
                    img.variable = variableName;
                    img.elementType = 'image';
                    img.setControlsVisibility({ mt: true, mb: true, ml: true, mr: true, bl: true, br: true, tl: true, tr: true });
                    canvas.current.add(img);
                    canvas.current.setActiveObject(img);
                    canvas.current.renderAll();
                    updatePlaceholdersList();
                }, { crossOrigin: 'anonymous' });
                return;
            }
            const dw = 100, dh = 70;
            const rect = new fabric.Rect({
                left: CARD_WIDTH / 2 - dw / 2, top: CARD_HEIGHT / 2 - dh / 2,
                width: dw, height: dh,
                fill: '#f0f4f8', stroke: '#94a3b8', strokeWidth: 2,
                strokeDashArray: [6, 4], originX: 'left', originY: 'top',
            });
            rect.variable = variableName;
            rect.elementType = 'image';
            rect.setControlsVisibility({ mt: true, mb: true, ml: true, mr: true, bl: true, br: true, tl: true, tr: true });
            canvas.current.add(rect);
            canvas.current.setActiveObject(rect);
            canvas.current.renderAll();
            updatePlaceholdersList();
            return;
        }

        const displayContent = isCustomText ? customTextContent : (EXAMPLE_DATA[variableName] || `{{${variableName}}}`);
        const text = new fabric.Text(displayContent, {
            left: CARD_WIDTH / 2, top: CARD_HEIGHT / 2,
            fontSize: 18, fill: '#000000', fontFamily: 'Arial',
            textAlign: 'left', originX: 'left', originY: 'top',
            fontWeight: 'normal', lockScalingX: true, lockScalingY: true,
        });
        text.setControlsVisibility({ mt: false, mb: false, ml: false, mr: false, bl: false, br: false, tl: false, tr: false });
        if (isCustomText) { text.isStatic = true; text.text = displayContent; }
        else { text.variable = variableName; text.isStatic = false; }
        canvas.current.add(text);
        canvas.current.setActiveObject(text);
        canvas.current.renderAll();
        updatePlaceholdersList();
    };

    const updatePlaceholdersList = () => {
        if (!canvas.current) return;
        const clamp = (n, mn, mx) => Math.min(Math.max(n, mn), mx);

        const list = canvas.current.getObjects().map(obj => {
            if (obj.elementType === 'image' && obj.variable) {
                const tl = obj.getPointByOrigin('left', 'top');
                return {
                    element_type: 'image',
                    variable: `{{${obj.variable}}}`,
                    text: `{{${obj.variable}}}`,
                    x: clamp(tl.x / CARD_WIDTH, 0, 1),
                    y: clamp(tl.y / CARD_HEIGHT, 0, 1),
                    width: clamp(obj.getScaledWidth() / CARD_WIDTH, 0.01, 1),
                    height: clamp(obj.getScaledHeight() / CARD_HEIGHT, 0.01, 1),
                };
            }
            if (obj.type !== 'text') return null;
            const tl = obj.getPointByOrigin('left', 'top');
            let fill = obj.fill || '#000000';
            try {
                if (typeof fill === 'string' && !fill.startsWith('#')) {
                    const c = new fabric.Color(fill);
                    fill = '#' + c.toHex();
                }
            } catch { /**/ }
            let textForSave = obj.text;
            if (obj.variable && !obj.isStatic) textForSave = `{{${obj.variable}}}`;
            let xPos = tl.x / CARD_WIDTH;
            if (obj.textAlign === 'center' && obj.originX === 'center') xPos = obj.left / CARD_WIDTH;
            else if (obj.textAlign === 'right' && obj.originX === 'right') xPos = obj.left / CARD_WIDTH;
            return {
                variable: obj.variable || null,
                text: textForSave,
                isStatic: !!obj.isStatic,
                x: clamp(xPos, 0, 1),
                y: clamp(tl.y / CARD_HEIGHT, 0, 1),
                fontFamily: obj.fontFamily || 'Arial',
                fontSize: obj.fontSize || 18,
                color: fill,
                fontWeight: obj.fontWeight || 'normal',
                text_align: obj.textAlign || 'left',
            };
        }).filter(Boolean);

        setPlaceholders(list);
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

    // ──────────────────────────────
    // Property changes
    // ──────────────────────────────
    const handlePropertyChange = (prop, value) => {
        const activeObj = canvas.current?.getActiveObject();
        if (!activeObj) return;

        if (prop === 'text' && activeObj.isStatic) {
            activeObj.set('text', value);
        } else if (prop === 'textAlign') {
            const currentLeft = activeObj.left;
            const curOrigin = activeObj.originX;
            let leftEdge = currentLeft;
            if (curOrigin === 'center') leftEdge = currentLeft - activeObj.getScaledWidth() / 2;
            else if (curOrigin === 'right') leftEdge = currentLeft - activeObj.getScaledWidth();
            activeObj.set('textAlign', value);
            if (value === 'center') { activeObj.set('originX', 'center'); activeObj.set('left', leftEdge + activeObj.getScaledWidth() / 2); }
            else if (value === 'right') { activeObj.set('originX', 'right'); activeObj.set('left', leftEdge + activeObj.getScaledWidth()); }
            else { activeObj.set('originX', 'left'); activeObj.set('left', leftEdge); }
        } else if (prop === 'fontWeight') {
            activeObj.set('fontWeight', value);
        } else if (prop === 'fontSize') {
            const v = Number(value);
            if (!isNaN(v) && v > 0) activeObj.set(prop, v);
        } else if (activeObj.elementType === 'image' && (prop === 'width' || prop === 'height')) {
            const v = Number(value);
            if (!isNaN(v) && v > 0) activeObj.set(prop, v);
        } else {
            activeObj.set(prop, value);
        }

        canvas.current?.renderAll();
        updatePlaceholdersList();
    };

    // ──────────────────────────────
    // Background upload
    // ──────────────────────────────
    const handleImageUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setUploadingImage(true);
        try {
            const formData = new FormData();
            formData.append('card_background_image', file);
            const response = await accAPI.uploadCardBackground(id, formData);
            const newUrl = response.card_background_image_url || response.template?.card_background_image_url;
            if (newUrl) {
                loadBackgroundImage(newUrl);
                setTemplate(prev => ({ ...prev, card_background_image_url: newUrl }));
            }
        } catch (err) {
            console.error('Upload failed:', err);
            alert('Failed to upload card background image');
        } finally {
            setUploadingImage(false);
        }
    };

    // ──────────────────────────────
    // Save
    // ──────────────────────────────
    const handleSave = async () => {
        setSavingConfig(true);
        try {
            const elements = placeholders.map(p => {
                const base = { type: p.element_type === 'image' ? 'image' : 'text', variable: p.text, x: p.x, y: p.y };
                if (p.element_type === 'image') return { ...base, width: p.width, height: p.height };
                return {
                    ...base,
                    font_family: p.fontFamily,
                    font_size: p.fontSize,
                    color: p.color,
                    font_weight: p.fontWeight || 'normal',
                    text_align: p.text_align || 'left',
                };
            });

            const bgImageStyle = template?.card_background_image_url
                ? `background-image: url('${template.card_background_image_url}'); background-size: cover; background-position: center; background-repeat: no-repeat;`
                : 'background-color: #ffffff;';

            const htmlContent = `
<div style="position: relative; width: ${CARD_WIDTH}px; height: ${CARD_HEIGHT}px; ${bgImageStyle} overflow: hidden; font-family: sans-serif;">
${elements.map(el => {
                const leftPx = Math.round(el.x * CARD_WIDTH);
                const topPx = Math.round(el.y * CARD_HEIGHT);
                if (el.type === 'image') {
                    const widthPx = Math.round(el.width * CARD_WIDTH);
                    const heightPx = Math.round(el.height * CARD_HEIGHT);
                    return `    <img src="${el.variable}" style="position: absolute; left: ${leftPx}px; top: ${topPx}px; width: ${widthPx}px; height: ${heightPx}px; object-fit: contain;" />`;
                } else {
                    let alignStyle = '';
                    if (el.text_align === 'center') {
                        alignStyle = `left: ${leftPx - 1000}px; width: 2000px; text-align: center;`;
                    } else if (el.text_align === 'right') {
                        alignStyle = `left: ${leftPx - 2000}px; width: 2000px; text-align: right;`;
                    } else {
                        alignStyle = `left: ${leftPx}px; text-align: left; white-space: nowrap;`;
                    }
                    return `    <div style="position: absolute; top: ${topPx}px; color: ${el.color}; font-size: ${el.font_size}px; font-family: '${el.font_family || 'Arial'}', sans-serif; font-weight: ${el.font_weight || 'normal'}; ${alignStyle} margin: 0; padding: 0; line-height: 1;">${el.variable}</div>`;
                }
            }).join('\n')}
</div>
`.trim();

            await accAPI.updateCardSettings(id, {
                card_template_html: htmlContent,
                card_config_json: { elements }
            });
            alert('Card configuration saved successfully!');
            navigate('/acc/trainee-card-template');
        } catch (err) {
            console.error('Save failed:', err);
            alert('Failed to save card configuration');
        } finally {
            setSavingConfig(false);
        }
    };

    // ──────────────────────────────
    // Derived state
    // ──────────────────────────────
    const activeObj = canvas.current?.getActiveObject();
    let activeFill = activeObj?.fill || '#000000';
    if (activeObj && typeof activeFill === 'string' && !activeFill.startsWith('#')) {
        try { activeFill = '#' + new fabric.Color(activeFill).toHex(); } catch { /**/ }
    }
    const isImagePlaceholder = activeObj?.elementType === 'image';
    const activeProperties = activeObj ? (isImagePlaceholder ? {
        elementType: 'image',
        variable: activeObj.variable,
        width: Math.round(activeObj.getScaledWidth?.() ?? activeObj.width ?? 0),
        height: Math.round(activeObj.getScaledHeight?.() ?? activeObj.height ?? 0),
    } : {
        fontFamily: activeObj.fontFamily,
        fontSize: activeObj.fontSize,
        fill: activeFill,
        fontWeight: activeObj.fontWeight || 'normal',
        text: activeObj.text,
        isStatic: activeObj.isStatic,
        textAlign: activeObj.textAlign || 'left',
    }) : null;

    // ──────────────────────────────
    // Loading / error states
    // ──────────────────────────────
    if (loading) return (
        <div className="flex h-screen items-center justify-center bg-gray-50">
            <div className="card-spinner" />
            <p className="ml-3 text-gray-500">Loading card designer...</p>
        </div>
    );

    if (error) return (
        <div className="flex h-screen items-center justify-center bg-gray-50 flex-col">
            <div className="text-red-500 mb-4 text-xl">⚠️ {error}</div>
            <button onClick={() => navigate('/acc/trainee-card-template')} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                Go Back
            </button>
        </div>
    );

    // ──────────────────────────────
    // Render
    // ──────────────────────────────
    return (
        <div className="flex flex-col h-screen bg-gray-100 card-designer-screen">
            {/* Header */}
            <header className="card-designer-header">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate('/acc/trainee-card-template')}
                        className="p-2 hover:bg-gray-100 rounded-full text-gray-600 transition-colors"
                        title="Back to Card Templates"
                    >
                        <ArrowLeft size={24} />
                    </button>
                    <div>
                        <h1 className="text-lg font-bold text-gray-900 leading-tight flex items-center gap-2">
                            <CreditCard size={20} className="text-indigo-600" />
                            Global Trainee Card
                        </h1>
                        <p className="text-xs text-gray-500">ACC-wide card design · applies to all courses · CR80 (856 × 540)</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${template?.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                        {template?.status?.toUpperCase()}
                    </span>
                    {template?.include_card && (
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700">
                            Card Enabled
                        </span>
                    )}
                </div>
            </header>

            <div className="card-designer-container flex-1 overflow-hidden relative">
                {/* Left Sidebar */}
                <div className="card-designer-sidebar">
                    <SidebarSection title="Background" defaultOpen={true}>
                        <label className="card-tool-btn card-tool-btn-primary">
                            <Upload size={18} />
                            {uploadingImage ? 'Uploading...' : 'Upload Card Image'}
                            <input
                                type="file"
                                className="hidden"
                                accept="image/png,image/jpeg"
                                onChange={handleImageUpload}
                                disabled={uploadingImage}
                            />
                        </label>
                        <p className="text-xs text-gray-400 mt-2 text-center">Recommended: 856 × 540 px</p>
                    </SidebarSection>

                    <SidebarSection title="Dynamic Elements" defaultOpen={true}>
                        <div className="grid grid-cols-1 gap-2">
                            {AVAILABLE_VARIABLES.map(field => {
                                const isImage = IMAGE_PLACEHOLDER_VARS.includes(field.variable);
                                return (
                                    <button
                                        key={field.variable}
                                        onClick={() => addPlaceholder(field.variable)}
                                        className="card-tool-btn"
                                    >
                                        <div className={`p-1 rounded ${isImage ? 'bg-amber-50 text-amber-600' : 'bg-blue-50 text-blue-600'}`}>
                                            {isImage ? <ImageIcon size={14} /> : <Type size={14} />}
                                        </div>
                                        {field.label}
                                    </button>
                                );
                            })}
                        </div>
                    </SidebarSection>

                    <SidebarSection title="Static Elements" defaultOpen={false}>
                        <div className="grid grid-cols-1 gap-2">
                            <button onClick={() => addPlaceholder(null, true)} className="card-tool-btn">
                                <div className="p-1 bg-purple-50 text-purple-600 rounded"><Type size={14} /></div>
                                Custom Text
                            </button>
                            {AVAILABLE_VARIABLES.map(field => (
                                <button
                                    key={`static-${field.variable}`}
                                    onClick={() => addPlaceholder(null, true, field.label)}
                                    className="card-tool-btn"
                                >
                                    <div className="p-1 bg-gray-50 text-gray-600 rounded"><Type size={14} /></div>
                                    {field.label} (Title)
                                </button>
                            ))}
                        </div>
                    </SidebarSection>
                </div>

                {/* Workspace */}
                <div className="card-designer-workspace">
                    {/* Toolbar */}
                    <div className="card-workspace-header">
                        <div className="card-template-info">
                            <CreditCard size={16} className="text-indigo-500" />
                            <span className="card-template-name">Global Trainee Card</span>
                            <span className="card-template-status">{template?.status || 'draft'}</span>
                        </div>
                        <div className="card-workspace-actions">
                            <button
                                className="card-action-btn card-btn-primary"
                                onClick={handleSave}
                                disabled={savingConfig}
                            >
                                <Save size={18} />
                                {savingConfig ? 'Saving...' : 'Save Card Config'}
                            </button>
                        </div>
                    </div>

                    {/* Canvas */}
                    <div className="card-canvas-wrapper" ref={wrapperRef}>
                        <div className="card-canvas-shadow">
                            <canvas ref={canvasRef} />
                        </div>
                    </div>
                </div>

                {/* Right Sidebar – Properties */}
                <div className="card-designer-properties">
                    <div className="card-properties-header">
                        <div className="card-properties-title">
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

                    <div className="card-properties-content">
                        {activeProperties ? (
                            activeProperties.elementType === 'image' ? (
                                <>
                                    <div className="card-property-group">
                                        <label className="card-property-label">Type</label>
                                        <p className="text-sm text-gray-600 flex items-center gap-2">
                                            <ImageIcon size={18} className="text-blue-600" />
                                            Image placeholder
                                        </p>
                                    </div>
                                    <div className="card-property-group">
                                        <label className="card-property-label">Variable</label>
                                        <p className="text-sm font-mono text-blue-600">{`{{${activeProperties.variable}}}`}</p>
                                        <p className="text-xs text-gray-500 mt-1">Backend will replace with image URL.</p>
                                    </div>
                                    <div className="card-property-group">
                                        <label className="card-property-label">Width (px)</label>
                                        <input type="number" className="card-property-input" value={activeProperties.width}
                                            onChange={e => handlePropertyChange('width', Number(e.target.value))} min="20" max="600" />
                                    </div>
                                    <div className="card-property-group">
                                        <label className="card-property-label">Height (px)</label>
                                        <input type="number" className="card-property-input" value={activeProperties.height}
                                            onChange={e => handlePropertyChange('height', Number(e.target.value))} min="20" max="400" />
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="card-property-group">
                                        <label className="card-property-label">
                                            {activeProperties.isStatic ? 'Text Content' : 'Dynamic Field (Example)'}
                                        </label>
                                        {!activeProperties.isStatic && (
                                            <p className="text-xs text-gray-500 mb-1">Showing example data: {activeProperties.text}</p>
                                        )}
                                        <input
                                            type="text"
                                            className="card-property-input"
                                            value={activeProperties.text}
                                            onChange={e => handlePropertyChange('text', e.target.value)}
                                            readOnly={!activeProperties.isStatic}
                                        />
                                        {!activeProperties.isStatic && (
                                            <p className="text-xs text-blue-600 mt-1">
                                                Variable: {activeObj?.variable ? `{{${activeObj.variable}}}` : 'N/A'}
                                            </p>
                                        )}
                                    </div>

                                    <div className="card-property-group">
                                        <label className="card-property-label">Text Alignment</label>
                                        <select className="card-property-select" value={activeProperties.textAlign}
                                            onChange={e => handlePropertyChange('textAlign', e.target.value)}>
                                            <option value="left">Left</option>
                                            <option value="center">Center</option>
                                            <option value="right">Right</option>
                                        </select>
                                    </div>

                                    <div className="card-property-group">
                                        <div className="flex justify-between gap-4">
                                            <div className="flex-1">
                                                <label className="card-property-label">Font Size</label>
                                                <input type="number" className="card-property-input" value={activeProperties.fontSize}
                                                    onChange={e => handlePropertyChange('fontSize', parseInt(e.target.value))} min="6" max="120" />
                                            </div>
                                            <div className="w-1/3">
                                                <label className="card-property-label">Color</label>
                                                <input type="color" className="h-[38px] w-full p-1 border rounded cursor-pointer"
                                                    value={activeProperties.fill}
                                                    onChange={e => handlePropertyChange('fill', e.target.value)} />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="card-property-group">
                                        <label className="card-property-label">Font Weight</label>
                                        <button
                                            onClick={() => handlePropertyChange('fontWeight', activeProperties.fontWeight === 'bold' ? 'normal' : 'bold')}
                                            className={`w-full p-2 rounded-lg border transition-colors flex items-center justify-center gap-2 ${activeProperties.fontWeight === 'bold'
                                                ? 'bg-blue-50 border-blue-300 text-blue-700'
                                                : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'}`}
                                        >
                                            <Bold size={18} />
                                            <span className="font-medium">{activeProperties.fontWeight === 'bold' ? 'Bold' : 'Normal'}</span>
                                        </button>
                                    </div>
                                </>
                            )
                        ) : (
                            <div className="card-empty-state">
                                <Move size={48} className="card-empty-icon" />
                                <p className="font-medium text-gray-900 mb-1">No Selection</p>
                                <p className="text-sm">Select an element on the card canvas to edit its properties.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TraineeCardDesignerScreen;
