import { useEffect, useState, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import fabric from '../../../utils/fabric-wrapper.js';
import { accAPI } from '../../../services/api';
import { ArrowLeft, Upload, Type, Trash2, Move, Save, Bold, ChevronDown, ChevronRight } from 'lucide-react';
import './CertificateDesignerScreen.css';

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
    // Removed useHeader hook as we are now standalone

    // State
    const [template, setTemplate] = useState(null);
    const [loading, setLoading] = useState(true);
    const [savingConfig, setSavingConfig] = useState(false);
    const [uploadingImage, setUploadingImage] = useState(false);
    const [placeholders, setPlaceholders] = useState([]);
    const [selectedPlaceholder, setSelectedPlaceholder] = useState(null);
    const [error, setError] = useState(null);

    // Dynamic Constants based on template type
    const availablePlaceholders = useMemo(() => {
        const templateType = template?.template_type || 'course';

        // Course Certificate Variables
        if (templateType === 'course') {
            return [
                { variable: 'student_name', label: 'Student Name' },
                { variable: 'course_name', label: 'Course Name' },
                { variable: 'date', label: 'Issue Date' },
                { variable: 'expiry_date', label: 'Expiry Date' },
                { variable: 'cert_id', label: 'Certificate ID' },
                { variable: 'verification_code', label: 'Verification Code' },
            ];
        }

        // Training Center Template Variables
        if (templateType === 'training_center') {
            return [
                { variable: 'training_center_name', label: 'Training Center Name' },
                { variable: 'training_center_legal_name', label: 'Training Center Legal Name' },
                { variable: 'training_center_email', label: 'Training Center Email' },
                { variable: 'training_center_country', label: 'Training Center Country' },
                { variable: 'training_center_city', label: 'Training Center City' },
                { variable: 'training_center_registration_number', label: 'Registration Number' },
                { variable: 'acc_name', label: 'ACC Name' },
                { variable: 'acc_legal_name', label: 'ACC Legal Name' },
                { variable: 'acc_registration_number', label: 'ACC Registration Number' },
                { variable: 'acc_country', label: 'ACC Country' },
                { variable: 'issue_date', label: 'Issue Date' },
                { variable: 'issue_date_formatted', label: 'Issue Date (Formatted)' },
                { variable: 'verification_code', label: 'Verification Code' },
            ];
        }

        // Instructor Template Variables
        if (templateType === 'instructor') {
            return [
                { variable: 'instructor_name', label: 'Instructor Full Name' },
                { variable: 'instructor_first_name', label: 'Instructor First Name' },
                { variable: 'instructor_last_name', label: 'Instructor Last Name' },
                { variable: 'instructor_email', label: 'Instructor Email' },
                { variable: 'instructor_id_number', label: 'Instructor ID Number' },
                { variable: 'instructor_country', label: 'Instructor Country' },
                { variable: 'instructor_city', label: 'Instructor City' },
                { variable: 'course_name', label: 'Course Name' },
                { variable: 'course_name_ar', label: 'Course Name (Arabic)' },
                { variable: 'course_code', label: 'Course Code' },
                { variable: 'acc_name', label: 'ACC Name' },
                { variable: 'acc_legal_name', label: 'ACC Legal Name' },
                { variable: 'acc_registration_number', label: 'ACC Registration Number' },
                { variable: 'acc_country', label: 'ACC Country' },
                { variable: 'issue_date', label: 'Issue Date' },
                { variable: 'issue_date_formatted', label: 'Issue Date (Formatted)' },
                { variable: 'verification_code', label: 'Verification Code' },
            ];
        }

        // Default to course
        return [
            { variable: 'student_name', label: 'Student Name' },
            { variable: 'course_name', label: 'Course Name' },
            { variable: 'date', label: 'Issue Date' },
        ];
    }, [template?.template_type]);

    // Example data for preview - shows actual data length and format
    const exampleData = useMemo(() => {
        const templateType = template?.template_type || 'course';

        // Course Certificate Example Data
        if (templateType === 'course') {
            return {
                student_name: 'John Smith',
                course_name: 'Advanced Business Management',
                date: 'January 15, 2026',
                expiry_date: 'January 15, 2027',
                cert_id: 'CERT-2026-EDOBM2KN',
                verification_code: 'ABC123XYZ789',
            };
        }

        // Training Center Example Data
        if (templateType === 'training_center') {
            return {
                training_center_name: 'Excellence Training Center',
                training_center_legal_name: 'Excellence Training Center LLC',
                training_center_email: 'info@excellencetraining.com',
                training_center_country: 'United States',
                training_center_city: 'New York',
                training_center_registration_number: 'TC-2024-001234',
                acc_name: 'Global Accreditation Council',
                acc_legal_name: 'Global Accreditation Council Inc.',
                acc_registration_number: 'ACC-2020-5678',
                acc_country: 'United States',
                issue_date: '2026-01-15',
                issue_date_formatted: 'January 15, 2026',
                verification_code: 'TC-VER-ABC123XYZ',
            };
        }

        // Instructor Example Data
        if (templateType === 'instructor') {
            return {
                instructor_name: 'Dr. Sarah Johnson',
                instructor_first_name: 'Sarah',
                instructor_last_name: 'Johnson',
                instructor_email: 'sarah.johnson@example.com',
                instructor_id_number: 'ID-987654321',
                instructor_country: 'United Kingdom',
                instructor_city: 'London',
                course_name: 'Advanced Project Management',
                course_name_ar: 'إدارة المشاريع المتقدمة',
                course_code: 'APM-301',
                acc_name: 'Global Accreditation Council',
                acc_legal_name: 'Global Accreditation Council Inc.',
                acc_registration_number: 'ACC-2020-5678',
                acc_country: 'United States',
                issue_date: '2026-01-15',
                issue_date_formatted: 'January 15, 2026',
                verification_code: 'INS-VER-XYZ789ABC',
            };
        }

        // Default
        return {
            student_name: 'John Smith',
            course_name: 'Sample Course',
            date: 'January 15, 2026',
        };
    }, [template?.template_type]);

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
        const objects = canvas.current.getObjects().filter(obj => obj.type === 'text');

        objects.forEach(obj => {
            if (obj.variable && !obj.isStatic) {
                // Update display text to show example data
                const exampleText = exampleData[obj.variable] || `{{${obj.variable}}}`;
                if (obj.text !== exampleText) {
                    obj.set('text', exampleText);
                }
            }
        });

        canvas.current.renderAll();
    };

    const loadTemplateConfig = (config) => {
        if (!canvas.current) return;

        config.forEach(item => {
            // Extract variable name if it's in {{variable}} format
            const variableName = extractVariableName(item.variable || item.text);
            const isStatic = !variableName;

            // Get display text (example data for variables)
            const displayText = isStatic
                ? (item.variable || item.text || '')
                : (exampleData[variableName] || `{{${variableName}}}`);

            // Get text alignment from config, default to 'left'
            const textAlign = item.text_align || 'left';
            // Set originX based on alignment for proper positioning
            const originX = textAlign === 'center' ? 'center' : textAlign === 'right' ? 'right' : 'left';

            // Calculate left position based on alignment
            let leftPos = (item.x || 0) * 1200;
            if (textAlign === 'center') {
                // For center alignment, the x position represents the center point
                leftPos = (item.x || 0) * 1200;
            } else if (textAlign === 'right') {
                // For right alignment, the x position represents the right edge
                leftPos = (item.x || 0) * 1200;
            }

            const text = new fabric.Text(displayText, {
                left: leftPos,
                top: (item.y || 0) * 848,
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

            // Disable scaling controls
            text.setControlsVisibility({
                mt: false, mb: false, ml: false, mr: false,
                bl: false, br: false, tl: false, tr: false
            });

            // Store variable name and static flag
            if (variableName) {
                text.variable = variableName;
                text.isStatic = false;
            } else {
                text.isStatic = true;
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
    const addPlaceholder = (variableName, isCustomText = false, customTextContent = 'Custom Text') => {
        if (!canvas.current) return;

        // Use example data for display if it's a variable, otherwise use custom text
        const displayContent = isCustomText
            ? customTextContent
            : (exampleData[variableName] || `{{${variableName}}}`);

        const text = new fabric.Text(displayContent, {
            left: 1200 / 2,
            top: 848 / 2,
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

            // For saving, convert variable back to {{variable}} format
            let textForSave = obj.text;
            if (obj.variable && !obj.isStatic) {
                textForSave = `{{${obj.variable}}}`;
            }

            // Get the actual position based on alignment
            let xPos = tl.x / 1200;
            // If centered, we need to get the center point
            if (obj.textAlign === 'center' && obj.originX === 'center') {
                xPos = obj.left / 1200;
            } else if (obj.textAlign === 'right' && obj.originX === 'right') {
                xPos = obj.left / 1200;
            }

            // Clamp values to ensure they are within 0-1 range and definitely not negative
            // Backend validation requires x >= 0
            const clamp = (num, min, max) => Math.min(Math.max(num, min), max);

            return {
                variable: obj.variable || null,
                text: textForSave, // Save in {{variable}} format for variables
                isStatic: !!obj.isStatic,
                x: clamp(xPos, 0, 1),
                y: clamp(tl.y / 848, 0, 1),
                fontFamily: obj.fontFamily || 'Arial',
                fontSize: obj.fontSize || 24,
                color: fill,
                fontWeight: obj.fontWeight || 'normal',
                text_align: obj.textAlign || 'left',
            };
        });

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
            // Validations for fontSize
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

    // Generate HTML template from canvas
    const generateTemplateHTML = () => {
        if (!canvas.current) return '';

        const canvasWidth = 1200;
        const canvasHeight = 848;

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

        // Get all text objects
        const textObjects = canvas.current.getObjects().filter(obj => obj.type === 'text');

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
    </style>
</head>
<body>
    <div class="certificate-container">`;

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
            const config = placeholders.map(p => ({
                // Send the exact text content as 'variable'
                // This covers both "{{student_name}}" and "Custom Text"
                variable: p.text,
                x: p.x,
                y: p.y,
                font_family: p.fontFamily,
                font_size: p.fontSize,
                color: p.color,
                font_weight: p.fontWeight || 'normal',
                text_align: p.text_align || 'left',
            }));

            // Generate HTML template
            const templateHtml = generateTemplateHTML();

            console.log('Sending template update with payload:', {
                id: template.id,
                config_json_length: config.length,
                html_structure_length: templateHtml?.length,
                html_preview: templateHtml?.substring(0, 100) + '...'
            });

            // Update template configuration with fonts
            await accAPI.updateTemplate(template.id, {
                config_json: config,
                template_html: templateHtml
            });

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
        fontWeight: activeObj.fontWeight || 'normal',
        text: activeObj.text,
        isStatic: activeObj.isStatic,
        textAlign: activeObj.textAlign || 'left'
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

                                {/* <div className="property-group">
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
                                </div> */}

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
