import { useEffect, useState, useRef, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import fabric from '../../../utils/fabric-wrapper.js';
import { accAPI, adminAPI } from '../../../services/api';
import { ArrowLeft, Upload, Type, Trash2, Move, Save, Bold, ChevronDown, ChevronRight, Image as ImageIcon } from 'lucide-react';
import './CertificateDesignerScreen.css';

// Import images from src/assets
import trainingCenterLogo from '../../../assets/training_center_logo.png';
import accLogo from '../../../assets/accretidation_logo.png';
import qrCode from '../../../assets/QRcode.png';
import instructorPhoto from '../../../assets/instructor.png';

const SidebarSection = ({ title, children, defaultOpen = true }) => {
    const [isOpen, setIsOpen] = useState(defaultOpen);

    return (
        <div className="sidebar-section border-b border-gray-100 last:border-0 pb-2">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="section-title w-full flex items-center justify-between hover:bg-gray-50 p-1 rounded cursor-pointer group"
            >
                <span className="group-hover:text-gray-900 transition-colors">{title}</span>
                {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </button>

            {isOpen && (
                <div className="mt-2 animate-in slide-in-from-top-1 fade-in duration-200">
                    {children}
                </div>
            )}
        </div>
    );
};

const CertificateDesignerScreen = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();

    // Route-aware API: if accessed via /admin/… use adminAPI, else accAPI
    const isGroupAdmin = location.pathname.startsWith('/admin/');
    const templateAPI = isGroupAdmin
        ? {
            getTemplateDetails: (tid) => adminAPI.getCertificateTemplate(tid),
            uploadBackgroundImage: (tid, fd) => adminAPI.uploadCertificateTemplateBackground(tid, fd),
            updateTemplate: (tid, data) => adminAPI.updateCertificateTemplate(tid, data),
            backRoute: '/admin/certificate-templates',
        }
        : {
            getTemplateDetails: (tid) => accAPI.getTemplateDetails(tid),
            uploadBackgroundImage: (tid, fd) => accAPI.uploadBackgroundImage(tid, fd),
            updateTemplate: (tid, data) => accAPI.updateTemplate(tid, data),
            backRoute: '/acc/certificate-templates',
        };

    // Removed useHeader hook as we are now standalone

    // State
    const [template, setTemplate] = useState(null);
    const [loading, setLoading] = useState(true);
    const [savingConfig, setSavingConfig] = useState(false);
    const [uploadingImage, setUploadingImage] = useState(false);
    const [placeholders, setPlaceholders] = useState([]);
    const [selectedPlaceholder, setSelectedPlaceholder] = useState(null);
    const [error, setError] = useState(null);
    const [orientation, setOrientation] = useState('landscape'); // 'landscape' | 'portrait'

    const getPageDimensions = () => {
        return orientation === 'portrait'
            ? { width: 848, height: 1200 } // A4 portrait approx
            : { width: 1200, height: 848 }; // A4 landscape approx
    };

    // Image-type variables: rendered as image placeholders on canvas and as <img> in HTML
    const IMAGE_PLACEHOLDER_VARS = ['training_center_logo', 'acc_logo', 'qr_code', 'instructor_photo'];

    // ACC-related variable keys to hide when coming from the Group Admin dashboard
    const ACC_ONLY_VARS = ['acc_logo', 'acc_legal_name'];

    // Dynamic Constants based on template type
    const availablePlaceholders = useMemo(() => {
        const templateType = template?.template_type || 'course';

        let list = [];

        // Course Certificate Variables
        if (templateType === 'course') {
            list = [
                { variable: 'student_name', label: 'Student Name' },
                { variable: 'course_name', label: 'Course Name' },
                { variable: 'date', label: 'Issue Date' },
                { variable: 'expiry_date', label: 'Expiry Date' },
                { variable: 'cert_id', label: 'Certificate ID' },
                { variable: 'verification_code', label: 'Verification Code' },
                { variable: 'training_center_logo', label: 'Training Center Logo (Image)' },
                { variable: 'acc_logo', label: 'ACC Logo (Image)' },
                { variable: 'qr_code', label: 'QR Code (Image)' },
            ];
        }

        // Training Center Template Variables
        else if (templateType === 'training_center') {
            list = [
                { variable: 'training_center_legal_name', label: 'Training Center Legal Name' },
                { variable: 'acc_legal_name', label: 'ACC Legal Name' },
                { variable: 'issue_date', label: 'Issue Date' },
                { variable: 'issue_date_formatted', label: 'Issue Date (Formatted)' },
                { variable: 'verification_code', label: 'Verification Code' },
                { variable: 'training_center_logo', label: 'Training Center Logo (Image)' },
                { variable: 'acc_logo', label: 'ACC Logo (Image)' },
                { variable: 'qr_code', label: 'QR Code (Image)' },
            ];
        }

        // Instructor Template Variables
        else if (templateType === 'instructor') {
            list = [
                { variable: 'instructor_name', label: 'Instructor Full Name' },
                { variable: 'instructor_id_number', label: 'Instructor ID Number' },
                { variable: 'acc_legal_name', label: 'ACC Legal Name' },
                { variable: 'issue_date', label: 'Issue Date' },
                { variable: 'issue_date_formatted', label: 'Issue Date (Formatted)' },
                { variable: 'verification_code', label: 'Verification Code' },
                { variable: 'expiry_date', label: 'Expiry Date' },
                { variable: 'instructor_photo', label: 'Instructor Photo (Image)' },
                { variable: 'training_center_logo', label: 'Training Center Logo (Image)' },
                { variable: 'acc_logo', label: 'ACC Logo (Image)' },
                { variable: 'qr_code', label: 'QR Code (Image)' },
            ];
        }

        // Default to course
        else {
            list = [
                { variable: 'student_name', label: 'Student Name' },
                { variable: 'course_name', label: 'Course Name' },
                { variable: 'date', label: 'Issue Date' },
            ];
        }

        // Strip ACC-only variables when accessed from the Group Admin dashboard
        if (isGroupAdmin) {
            list = list.filter(p => !ACC_ONLY_VARS.includes(p.variable));
        }

        return list;
    }, [template?.template_type, isGroupAdmin]);

    // Example data for preview - shows actual data length and format
    const exampleData = useMemo(() => {
        const templateType = template?.template_type || 'course';

        let data = {};

        // Course Certificate Example Data
        if (templateType === 'course') {
            data = {
                student_name: 'John Smith',
                course_name: 'Advanced Business Management',
                date: 'January 15, 2026',
                expiry_date: 'January 15, 2027',
                cert_id: 'CERT-2026-EDOBM2KN',
                verification_code: 'ABC123XYZ789',
                training_center_logo: trainingCenterLogo,
                acc_logo: accLogo,
                qr_code: qrCode,
            };
        }

        // Training Center Example Data
        else if (templateType === 'training_center') {
            data = {
                training_center_legal_name: 'Excellence Training Center LLC',
                acc_legal_name: 'Global Accreditation Council Inc.',
                issue_date: '2026-01-15',
                issue_date_formatted: 'January 15, 2026',
                verification_code: 'TC-VER-ABC123XYZ',
                training_center_logo: trainingCenterLogo,
                acc_logo: accLogo,
                qr_code: qrCode,
            };
        }

        // Instructor Example Data
        else if (templateType === 'instructor') {
            data = {
                instructor_name: 'Dr. Sarah Johnson',
                instructor_id_number: 'ID-987654321',
                acc_legal_name: 'Global Accreditation Council Inc.',
                issue_date: '2026-01-15',
                issue_date_formatted: 'January 15, 2026',
                verification_code: 'INS-VER-XYZ789ABC',
                expiry_date: '2027-01-15',
                instructor_photo: instructorPhoto,
                training_center_logo: trainingCenterLogo,
                acc_logo: accLogo,
                qr_code: qrCode,
            };
        }

        // Default
        else {
            data = {
                student_name: 'John Smith',
                course_name: 'Sample Course',
                date: 'January 15, 2026',
            };
        }

        // Strip ACC-only example data when accessed from the Group Admin dashboard
        if (isGroupAdmin) {
            ACC_ONLY_VARS.forEach(key => delete data[key]);
        }

        return data;
    }, [template?.template_type, isGroupAdmin]);

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
            const data = await templateAPI.getTemplateDetails(id);

            // Handle different response structures
            const templateData = data.template || data.data || data;
            setTemplate(templateData);
            if (templateData.orientation === 'portrait' || templateData.orientation === 'landscape') {
                setOrientation(templateData.orientation);
            }

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

    // Re-initialize canvas when orientation changes
    useEffect(() => {
        if (!loading && template && canvasRef.current) {
            if (canvas.current) {
                canvas.current.dispose();
                canvas.current = null;
            }
            initializeCanvas();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [orientation]);

    const initializeCanvas = () => {
        if (!wrapperRef.current) return;

        // Calculate dimensions to fit in view based on orientation
        const { width: targetWidth, height: targetHeight } = getPageDimensions();

        // Get available space in wrapper
        const padding = 64; // 2rem padding on each side
        const availableWidth = wrapperRef.current.clientWidth - padding;
        const availableHeight = wrapperRef.current.clientHeight - padding;

        // Calculate scale
        const scaleX = availableWidth / targetWidth;
        const scaleY = availableHeight / targetHeight;
        // Use different max scale for portrait vs landscape to provide better zoom
        const maxScale = orientation === 'portrait' ? 1.0 : 0.9;
        const scale = Math.min(scaleX, scaleY, maxScale); // Limit max scale based on orientation

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

        // Refresh variable displays to ensure example data is shown
        setTimeout(() => {
            refreshVariableDisplays();
        }, 200);

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

                // Scale image to fit canvas (page size based on orientation)
                const { width: canvasWidth, height: canvasHeight } = getPageDimensions();

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

    // Helper function to get display text (example data for variables, actual text for static)
    const getDisplayText = (variableName, isStatic, originalText) => {
        if (isStatic) {
            return originalText || '';
        }
        // If it's a variable, return example data
        if (variableName && exampleData[variableName]) {
            return exampleData[variableName];
        }
        // Fallback to original text if variable not found
        return originalText || '';
    };

    // Helper function to extract variable name from {{variable}} format
    const extractVariableName = (text) => {
        if (!text) return null;
        const match = text.match(/\{\{(\w+)\}\}/);
        return match ? match[1] : null;
    };

    // Refresh all variable displays to show example data
    const refreshVariableDisplays = () => {
        if (!canvas.current) return;
        const objects = canvas.current.getObjects();

        // Handle text elements
        const textObjects = objects.filter(obj => obj.type === 'text');
        textObjects.forEach(obj => {
            if (obj.variable && !obj.isStatic) {
                // Update display text to show example data
                const exampleText = exampleData[obj.variable] || `{{${obj.variable}}}`;
                if (obj.text !== exampleText) {
                    obj.set('text', exampleText);
                }
            }
        });

        // Handle image elements (placeholders)
        const imageObjects = objects.filter(obj => obj.elementType === 'image' && obj.variable);

        // Group image objects by variable
        const imageObjectsByVariable = {};
        imageObjects.forEach(obj => {
            if (obj.variable) {
                if (!imageObjectsByVariable[obj.variable]) {
                    imageObjectsByVariable[obj.variable] = [];
                }
                imageObjectsByVariable[obj.variable].push(obj);
            }
        });

        // Process each variable
        Object.keys(imageObjectsByVariable).forEach(variable => {
            const objectsForVariable = imageObjectsByVariable[variable];
            const exampleImagePath = exampleData[variable];

            if (!exampleImagePath) return;

            // Find the first placeholder rectangle to get position/dimensions
            const placeholderRect = objectsForVariable.find(obj => obj.type === 'rect');

            if (placeholderRect) {
                // Remove ALL objects for this variable (both rects and images)
                objectsForVariable.forEach(obj => {
                    canvas.current.remove(obj);
                });

                // Create and add the actual image
                fabric.Image.fromURL(exampleImagePath, (img) => {
                    if (!img) {
                        console.error('Failed to load image:', exampleImagePath);
                        return;
                    }

                    // Get the existing placeholder's dimensions and position
                    const existingWidth = placeholderRect.getScaledWidth();
                    const existingHeight = placeholderRect.getScaledHeight();
                    const existingLeft = placeholderRect.left;
                    const existingTop = placeholderRect.top;

                    // Set the new image with the same dimensions and position
                    img.set({
                        scaleX: existingWidth / img.width,
                        scaleY: existingHeight / img.height,
                        originX: 'left',
                        originY: 'top',
                        left: existingLeft,
                        top: existingTop,
                        selectable: true,
                        evented: true,
                    });
                    img.variable = variable;
                    img.elementType = 'image';
                    img.setControlsVisibility({
                        mt: true, mb: true, ml: true, mr: true,
                        bl: true, br: true, tl: true, tr: true
                    });

                    // Add the image
                    canvas.current.add(img);
                    canvas.current.setActiveObject(img);
                    canvas.current.renderAll();
                    updatePlaceholdersList();
                });
            }
        });

        canvas.current.renderAll();
    };

    const loadTemplateConfig = (config) => {
        if (!canvas.current) return;

        const { width: pageWidth, height: pageHeight } = getPageDimensions();

        // Track processed variables to prevent duplicates
        const processedVariables = new Set();

        config.forEach(item => {
            const variableName = extractVariableName(item.variable || item.text);
            const isImageItem = item.element_type === 'image' || (variableName && IMAGE_PLACEHOLDER_VARS.includes(variableName));

            if (isImageItem && variableName) {
                // Skip if this variable has already been processed
                if (processedVariables.has(variableName)) {
                    return;
                }
                processedVariables.add(variableName);

                // Image placeholder: position and size (width/height can be normalized 0-1 or pixels)
                const w = item.width != null ? (item.width <= 2 ? item.width * pageWidth : item.width) : 120;
                const h = item.height != null ? (item.height <= 2 ? item.height * pageHeight : item.height) : 80;
                const leftPos = (item.x || 0) * pageWidth;
                const topPos = (item.y || 0) * pageHeight;
                const rect = new fabric.Rect({
                    left: leftPos,
                    top: topPos,
                    width: w,
                    height: h,
                    fill: '#f0f4f8',
                    stroke: '#94a3b8',
                    strokeWidth: 2,
                    strokeDashArray: [6, 4],
                    originX: 'left',
                    originY: 'top',
                });
                rect.variable = variableName;
                rect.elementType = 'image';
                rect.setControlsVisibility({
                    mt: true, mb: true, ml: true, mr: true,
                    bl: true, br: true, tl: true, tr: true
                });
                canvas.current.add(rect);
                return;
            }

            // Text element
            const isStatic = !variableName;
            const displayText = isStatic
                ? (item.variable || item.text || '')
                : (exampleData[variableName] || `{{${variableName}}}`);

            const textAlign = item.text_align || 'left';
            const originX = textAlign === 'center' ? 'center' : textAlign === 'right' ? 'right' : 'left';

            let leftPos = (item.x || 0) * pageWidth;
            if (textAlign === 'center') leftPos = (item.x || 0) * pageWidth;
            else if (textAlign === 'right') leftPos = (item.x || 0) * pageWidth;

            const text = new fabric.Text(displayText, {
                left: leftPos,
                top: (item.y || 0) * pageHeight,
                fontSize: item.font_size || 24,
                fill: item.color || '#000000',
                fontFamily: item.font_family || 'Arial',
                textAlign: textAlign,
                originX: originX,
                originY: 'top',
                fontWeight: item.font_weight || 'normal',
                lockScalingX: true,
                lockScalingY: true,
            });

            text.setControlsVisibility({
                mt: false, mb: false, ml: false, mr: false,
                bl: false, br: false, tl: false, tr: false
            });

            if (variableName) {
                text.variable = variableName;
                text.isStatic = false;
            } else {
                text.isStatic = true;
            }

            canvas.current.add(text);
        });

        canvas.current.renderAll();
        updatePlaceholdersList();
    };

    // Actions
    const addPlaceholder = (variableName, isCustomText = false, customTextContent = 'Custom Text') => {
        if (!canvas.current) return;

        const { width: pageWidth, height: pageHeight } = getPageDimensions();

        // Image placeholders (logo, QR): load and display actual image, not placeholder rect
        if (variableName && IMAGE_PLACEHOLDER_VARS.includes(variableName)) {
            // Get the image path from exampleData (which has the actual asset paths)
            const imagePath = exampleData[variableName];

            if (imagePath) {
                // Load and add the actual image from assets
                fabric.Image.fromURL(imagePath, (img) => {
                    if (!img) {
                        console.error('Failed to load image:', imagePath);
                        return;
                    }

                    const defaultWidth = 120;
                    const defaultHeight = 80;

                    img.set({
                        scaleX: defaultWidth / img.width,
                        scaleY: defaultHeight / img.height,
                        originX: 'left',
                        originY: 'top',
                        left: pageWidth / 2 - defaultWidth / 2,
                        top: pageHeight / 2 - defaultHeight / 2,
                        selectable: true,
                        evented: true,
                    });
                    img.variable = variableName;
                    img.elementType = 'image';
                    img.setControlsVisibility({
                        mt: true, mb: true, ml: true, mr: true,
                        bl: true, br: true, tl: true, tr: true
                    });
                    canvas.current.add(img);
                    canvas.current.setActiveObject(img);
                    canvas.current.renderAll();
                    updatePlaceholdersList();
                });
                return;
            }

            // If no image path, add placeholder rectangle
            const defaultWidth = 120;
            const defaultHeight = 80;
            const rect = new fabric.Rect({
                left: pageWidth / 2 - defaultWidth / 2,
                top: pageHeight / 2 - defaultHeight / 2,
                width: defaultWidth,
                height: defaultHeight,
                fill: '#f0f4f8',
                stroke: '#94a3b8',
                strokeWidth: 2,
                strokeDashArray: [6, 4],
                originX: 'left',
                originY: 'top',
            });
            rect.variable = variableName;
            rect.elementType = 'image';
            rect.setControlsVisibility({
                mt: true, mb: true, ml: true, mr: true,
                bl: true, br: true, tl: true, tr: true
            });
            canvas.current.add(rect);
            canvas.current.setActiveObject(rect);
            canvas.current.renderAll();
            updatePlaceholdersList();
            return;
        }

        // Use example data for display if it's a variable, otherwise use custom text
        const displayContent = isCustomText
            ? customTextContent
            : (exampleData[variableName] || `{{${variableName}}}`);

        const text = new fabric.Text(displayContent, {
            left: pageWidth / 2,
            top: pageHeight / 2,
            fontSize: 24,
            fill: '#000000',
            fontFamily: 'Arial',
            textAlign: 'left',
            originX: 'left',
            originY: 'top',
            fontWeight: 'normal',
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
            text.text = displayContent;
        } else {
            text.variable = variableName;
            text.isStatic = false;
        }

        canvas.current.add(text);
        canvas.current.setActiveObject(text);
        canvas.current.renderAll();
        updatePlaceholdersList();
    };

    const updatePlaceholdersList = () => {
        if (!canvas.current) return;
        const { width: pageWidth, height: pageHeight } = getPageDimensions();
        const objects = canvas.current.getObjects();
        const clamp = (num, min, max) => Math.min(Math.max(num, min), max);

        const list = objects.map(obj => {
            if (obj.elementType === 'image' && obj.variable) {
                const tl = obj.getPointByOrigin('left', 'top');
                const w = obj.getScaledWidth();
                const h = obj.getScaledHeight();
                return {
                    element_type: 'image',
                    variable: `{{${obj.variable}}}`,
                    text: `{{${obj.variable}}}`,
                    x: clamp(tl.x / pageWidth, 0, 1),
                    y: clamp(tl.y / pageHeight, 0, 1),
                    width: clamp(w / pageWidth, 0.01, 1),
                    height: clamp(h / pageHeight, 0.01, 1),
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
            } catch (e) {
                console.warn('Color conversion failed', e);
            }

            let textForSave = obj.text;
            if (obj.variable && !obj.isStatic) {
                textForSave = `{{${obj.variable}}}`;
            }

            let xPos = tl.x / pageWidth;
            if (obj.textAlign === 'center' && obj.originX === 'center') {
                xPos = obj.left / pageWidth;
            } else if (obj.textAlign === 'right' && obj.originX === 'right') {
                xPos = obj.left / pageWidth;
            }

            return {
                variable: obj.variable || null,
                text: textForSave,
                isStatic: !!obj.isStatic,
                x: clamp(xPos, 0, 1),
                y: clamp(tl.y / pageHeight, 0, 1),
                fontFamily: obj.fontFamily || 'Arial',
                fontSize: obj.fontSize || 24,
                color: fill,
                fontWeight: obj.fontWeight || 'normal',
                text_align: obj.textAlign || 'left',
            };
        }).filter(Boolean);

        setPlaceholders(list);
    };

    const handlePropertyChange = (prop, value) => {
        const activeObj = canvas.current?.getActiveObject();
        if (!activeObj) return;

        if (prop === 'text') {
            // If it's a static text, allow editing
            if (activeObj.isStatic) {
                activeObj.set('text', value);
            } else {
                // For variables, if user tries to edit, we should update the example data display
                // But we keep the variable reference
                // Actually, for variables, we might want to prevent direct editing of the text
                // Or allow it but show a warning. For now, let's allow it but keep the variable
                activeObj.set('text', value);
            }
        } else if (prop === 'textAlign') {
            // When changing text alignment, preserve visual position
            const currentLeft = activeObj.left;
            const currentOriginX = activeObj.originX;
            const currentTextAlign = activeObj.textAlign || 'left';

            // Calculate the actual left edge position regardless of current origin
            let actualLeftEdge = currentLeft;
            if (currentOriginX === 'center') {
                // If currently centered, calculate left edge
                const textWidth = activeObj.getScaledWidth();
                actualLeftEdge = currentLeft - (textWidth / 2);
            } else if (currentOriginX === 'right') {
                // If currently right-aligned, calculate left edge
                const textWidth = activeObj.getScaledWidth();
                actualLeftEdge = currentLeft - textWidth;
            }

            // Set new alignment
            activeObj.set('textAlign', value);

            // Update originX and adjust left position to preserve visual position
            if (value === 'center') {
                activeObj.set('originX', 'center');
                const textWidth = activeObj.getScaledWidth();
                activeObj.set('left', actualLeftEdge + (textWidth / 2));
            } else if (value === 'right') {
                activeObj.set('originX', 'right');
                const textWidth = activeObj.getScaledWidth();
                activeObj.set('left', actualLeftEdge + textWidth);
            } else {
                activeObj.set('originX', 'left');
                activeObj.set('left', actualLeftEdge);
            }
        } else if (prop === 'fontWeight') {
            activeObj.set('fontWeight', value);
        } else if (prop === 'fontSize') {
            const val = Number(value);
            if (!isNaN(val) && val > 0) {
                activeObj.set(prop, val);
            }
        } else if (activeObj.elementType === 'image' && (prop === 'width' || prop === 'height')) {
            const val = Number(value);
            if (!isNaN(val) && val > 0) {
                activeObj.set(prop, val);
            }
        } else {
            activeObj.set(prop, value);
        }

        canvas.current?.renderAll();
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

            const response = await templateAPI.uploadBackgroundImage(template.id, formData);
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

    // Generate HTML template from canvas
    const generateTemplateHTML = () => {
        if (!canvas.current) return '';

        const { width: canvasWidth, height: canvasHeight } = getPageDimensions();

        // Get background image URL - try multiple sources
        let bgImageUrl = template?.background_image_url || '';
        const bgImage = canvas.current.backgroundImage;
        if (bgImage) {
            // Try to get URL from fabric image object
            if (bgImage._element) {
                if (bgImage._element.src) {
                    bgImageUrl = bgImage._element.src;
                } else if (bgImage._element.toDataURL) {
                    // If it's a canvas element, we might need to use data URL
                    // But prefer the original URL if available
                    bgImageUrl = bgImageUrl || bgImage._element.toDataURL();
                }
            }
            // Also check if fabric has stored the original URL
            if (!bgImageUrl && bgImage.src) {
                bgImageUrl = bgImage.src;
            }
        }

        const allObjects = canvas.current.getObjects();
        const textObjects = allObjects.filter(obj => obj.type === 'text');
        const imageObjects = allObjects.filter(obj => obj.elementType === 'image' && obj.variable);

        // Generate HTML
        let html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Certificate Template</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 0;
        }
        .certificate-container {
            position: relative;
            width: ${canvasWidth}px;
            height: ${canvasHeight}px;
            margin: 0 auto;
            background-color: #ffffff;
            ${bgImageUrl ? `background-image: url('${bgImageUrl}');` : ''}
            background-size: 100% 100%;
            background-position: 0 0;
            background-repeat: no-repeat;
            overflow: hidden;
        }
        .text-element {
            position: absolute;
            white-space: nowrap;
        }
        .image-element {
            position: absolute;
            object-fit: contain;
        }
    </style>
</head>
<body>
    <div class="certificate-container">`;

        // Add image elements (logo, QR placeholders) — backend replaces {{variable}} with image URL
        imageObjects.forEach(obj => {
            const left = obj.left;
            const top = obj.top;
            const w = obj.getScaledWidth();
            const h = obj.getScaledHeight();
            const variable = `{{${obj.variable}}}`;
            html += `
        <img class="image-element" src="${variable}" alt="" style="left:${Math.round(left)}px;top:${Math.round(top)}px;width:${Math.round(w)}px;height:${Math.round(h)}px;" data-variable="${variable}" />`;
        });

        // Add text elements
        textObjects.forEach(obj => {
            // Get text alignment
            const textAlign = obj.textAlign || 'left';

            // Calculate position and transform based on alignment
            let left = obj.left;
            let transform = '';
            let width = 'auto';

            if (textAlign === 'center') {
                // For center alignment, obj.left is the center point when originX is 'center'
                // Use transform to center the text
                transform = 'translateX(-50%)';
            } else if (textAlign === 'right') {
                // For right alignment, obj.left is the right edge when originX is 'right'
                // No transform needed, text-align: right will handle it
            }

            const top = obj.top;

            // Get text content - preserve variables in {{variable}} format
            let textContent = obj.text || '';
            if (obj.variable && !textContent.includes('{{')) {
                textContent = `{{${obj.variable}}}`;
            }

            // Get color
            let color = obj.fill || '#000000';
            if (typeof color === 'string' && !color.startsWith('#')) {
                try {
                    const fabricColor = new fabric.Color(color);
                    color = '#' + fabricColor.toHex();
                } catch (e) {
                    color = '#000000';
                }
            }

            // Get font family and weight
            const fontFamily = obj.fontFamily || 'Arial';
            const fontSize = obj.fontSize || 24;
            const fontWeight = obj.fontWeight || 'normal';

            // Escape HTML in text content but preserve {{variable}} format
            // We need to escape everything except the {{ }} brackets
            const escapedText = textContent
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#039;');

            // Escape single quotes in font family name for CSS
            const escapedFontFamily = fontFamily.replace(/'/g, "\\'");

            html += `
        <div class="text-element" style="
            left: ${Math.round(left)}px;
            top: ${Math.round(top)}px;
            font-family: '${escapedFontFamily}', Arial, sans-serif;
            font-size: ${fontSize}px;
            font-weight: ${fontWeight};
            color: ${color};
            text-align: ${textAlign};
            ${transform ? `transform: ${transform};` : ''}
            ${width !== 'auto' ? `width: ${width};` : ''}
        ">${escapedText}</div>`;
        });

        html += `
    </div>
</body>
</html>`;

        return html;
    };

    const handleSave = async () => {
        setSavingConfig(true);
        try {
            const config = placeholders.map(p => {
                const base = { variable: p.text, x: p.x, y: p.y };
                if (p.element_type === 'image') {
                    return { ...base, element_type: 'image', width: p.width, height: p.height };
                }
                return {
                    ...base,
                    font_family: p.fontFamily,
                    font_size: p.fontSize,
                    color: p.color,
                    font_weight: p.fontWeight || 'normal',
                    text_align: p.text_align || 'left',
                };
            });

            // Generate HTML template
            const templateHtml = generateTemplateHTML();

            console.log('Sending template update with payload:', {
                id: template.id,
                config_json_length: config.length,
                html_structure_length: templateHtml?.length,
                html_preview: templateHtml?.substring(0, 100) + '...'
            });

            // Update template configuration with fonts
            await templateAPI.updateTemplate(template.id, {
                config_json: config,
                template_html: templateHtml,
                orientation,
            });

            alert('Configuration saved successfully!');
            navigate(templateAPI.backRoute);
        } catch (err) {
            console.error('Save failed:', err);
            alert('Failed to save configuration');
        } finally {
            setSavingConfig(false);
        }
    };

    const handleOrientationChange = (value) => {
        if (value === 'landscape' || value === 'portrait') {
            setOrientation(value);
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
        textAlign: activeObj.textAlign || 'left'
    }) : null;

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
                onClick={() => navigate(templateAPI.backRoute)}
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
                        onClick={() => navigate(templateAPI.backRoute)}
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
                    <SidebarSection title="Background" defaultOpen={true}>
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
                    </SidebarSection>

                    {/* Dynamic Elements Section */}
                    <SidebarSection title="Dynamic Elements" defaultOpen={true}>
                        <div className="grid grid-cols-1 gap-2">
                            {availablePlaceholders.map(field => {
                                const isImage = IMAGE_PLACEHOLDER_VARS.includes(field.variable);
                                return (
                                    <button
                                        key={field.variable}
                                        onClick={() => addPlaceholder(field.variable)}
                                        className="tool-btn"
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

                    {/* Static Elements Section */}
                    <SidebarSection title="Elements" defaultOpen={true}>
                        <div className="grid grid-cols-1 gap-2">
                            <button
                                onClick={() => addPlaceholder(null, true)}
                                className="tool-btn"
                            >
                                <div className="p-1 bg-purple-50 text-purple-600 rounded">
                                    <Type size={14} />
                                </div>
                                Custom Text
                            </button>
                            {/* Add Dynamic Element Titles as Static Elements */}
                            {availablePlaceholders.map(field => (
                                <button
                                    key={`static-${field.variable}`}
                                    onClick={() => addPlaceholder(null, true, field.label)}
                                    className="tool-btn"
                                >
                                    <div className="p-1 bg-gray-50 text-gray-600 rounded">
                                        <Type size={14} />
                                    </div>
                                    {field.label} (Title)
                                </button>
                            ))}
                        </div>
                    </SidebarSection>
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
                            <div className="mr-4 flex items-center gap-2">
                                <span className="text-xs text-gray-600">Orientation</span>
                                <select
                                    className="property-select w-36"
                                    value={orientation}
                                    onChange={(e) => handleOrientationChange(e.target.value)}
                                >
                                    <option value="landscape">Landscape</option>
                                    <option value="portrait">Portrait</option>
                                </select>
                            </div>
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
                            activeProperties.elementType === 'image' ? (
                                <>
                                    <div className="property-group">
                                        <label className="property-label">Type</label>
                                        <p className="text-sm text-gray-600 flex items-center gap-2">
                                            <ImageIcon size={18} className="text-blue-600" />
                                            Image placeholder
                                        </p>
                                    </div>
                                    <div className="property-group">
                                        <label className="property-label">Variable</label>
                                        <p className="text-sm font-mono text-blue-600">{`{{${activeProperties.variable}}}`}</p>
                                        <p className="text-xs text-gray-500 mt-1">Backend will replace with image URL.</p>
                                    </div>
                                    <div className="property-group">
                                        <label className="property-label">Width (px)</label>
                                        <input
                                            type="number"
                                            className="property-input"
                                            value={activeProperties.width}
                                            onChange={(e) => handlePropertyChange('width', Number(e.target.value))}
                                            min="20"
                                            max="800"
                                        />
                                    </div>
                                    <div className="property-group">
                                        <label className="property-label">Height (px)</label>
                                        <input
                                            type="number"
                                            className="property-input"
                                            value={activeProperties.height}
                                            onChange={(e) => handlePropertyChange('height', Number(e.target.value))}
                                            min="20"
                                            max="800"
                                        />
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="property-group">
                                        <label className="property-label">
                                            {activeProperties.isStatic ? 'Text Content' : 'Dynamic Field (Example)'}
                                        </label>
                                        {!activeProperties.isStatic && (
                                            <p className="text-xs text-gray-500 mb-1">
                                                Showing example data: {activeProperties.text}
                                            </p>
                                        )}
                                        <input
                                            type="text"
                                            className="property-input"
                                            value={activeProperties.text}
                                            onChange={(e) => handlePropertyChange('text', e.target.value)}
                                            readOnly={!activeProperties.isStatic}
                                            title={!activeProperties.isStatic ? 'This is example data for preview. The actual value will be replaced when generating certificates.' : ''}
                                        />
                                        {!activeProperties.isStatic && (
                                            <p className="text-xs text-blue-600 mt-1">
                                                Variable: {activeObj?.variable ? `{{${activeObj.variable}}}` : 'N/A'}
                                            </p>
                                        )}
                                    </div>

                                    <div className="property-group">
                                        <label className="property-label">Text Alignment</label>
                                        <select
                                            className="property-select"
                                            value={activeProperties.textAlign}
                                            onChange={(e) => handlePropertyChange('textAlign', e.target.value)}
                                        >
                                            <option value="left">Left</option>
                                            <option value="center">Center</option>
                                            <option value="right">Right</option>
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
                                        <label className="property-label">Font Weight</label>
                                        <button
                                            onClick={() => handlePropertyChange('fontWeight', activeProperties.fontWeight === 'bold' ? 'normal' : 'bold')}
                                            className={`w-full p-2 rounded-lg border transition-colors flex items-center justify-center gap-2 ${activeProperties.fontWeight === 'bold'
                                                ? 'bg-blue-50 border-blue-300 text-blue-700'
                                                : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
                                                }`}
                                        >
                                            <Bold size={18} />
                                            <span className="font-medium">{activeProperties.fontWeight === 'bold' ? 'Bold' : 'Normal'}</span>
                                        </button>
                                    </div>
                                </>
                            )
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
