# Certificate Designer - Backend Implementation Guide

## Overview

This document outlines the changes made to the Certificate Designer frontend and provides implementation guidance for backend developers.

---

## 1. Orientation Support

### New Template Field

The `orientation` field has been added to the template model.

**Field Details:**
- **Field Name:** `orientation`
- **Type:** `string`
- **Allowed Values:** `"landscape"` or `"portrait"`
- **Required:** Yes (default: `"landscape"`)

### API Payload

When saving/updating a template, the `orientation` field should be included in the payload:

```json
{
  "template_id": "123",
  "template_type": "instructor",
  "orientation": "landscape",
  "config_json": { ... },
  "template_html": "..."
}
```

### Page Dimensions

The designer now uses dynamic page dimensions based on orientation:

| Orientation | Width (px) | Height (px) |
|-------------|------------|-------------|
| Landscape   | 1200       | 848         |
| Portrait    | 848        | 1200        |

**Note:** All element positions in `config_json` are stored as normalized coordinates (0-1 range), so they work correctly regardless of orientation.

---

## 2. Dynamic Template Variables

### Variable Naming Convention

All dynamic variables use double curly braces: `{{variable_name}}`

### Template Type Specific Variables

#### 2.1 Course Certificate (`template_type === 'course'`)

| Variable | Type | Description | Example Value |
|----------|------|-------------|---------------|
| `{{training_center_logo}}` | Image | Training center logo | `"https://example.com/logos/tc123.png"` |
| `{{acc_logo}}` | Image | ACC logo | `"https://example.com/logos/acc.png"` |
| `{{qr_code}}` | Image | QR code (encoded verification URL) | `"https://example.com/qrc/cert456.png"` |

#### 2.2 Training Center Certificate (`template_type === 'training_center'`)

| Variable | Type | Description | Example Value |
|----------|------|-------------|---------------|
| `{{training_center_logo}}` | Image | Training center logo | `"https://example.com/logos/tc123.png"` |
| `{{acc_logo}}` | Image | ACC logo | `"https://example.com/logos/acc.png"` |
| `{{qr_code}}` | Image | QR code (encoded verification URL) | `"https://example.com/qrc/cert789.png"` |

#### 2.3 Instructor Certificate (`template_type === 'instructor'`)

| Variable | Type | Description | Example Value |
|----------|------|-------------|---------------|
| `{{expiry_date}}` | Date | Certificate expiry date | `"2027-01-15"` |
| `{{training_center_logo}}` | Image | Training center logo | `"https://example.com/logos/tc123.png"` |
| `{{acc_logo}}` | Image | ACC logo | `"https://example.com/logos/acc.png"` |
| `{{qr_code}}` | Image | QR code (encoded verification URL) | `"https://example.com/qrc/cert101.png"` |

---

## 3. Image Placeholder Elements

### Important Change

The following variables are now treated as **image placeholders** in the designer, not text:

- `{{training_center_logo}}`
- `{{acc_logo}}`
- `{{qr_code}}`

### Element Type in config_json

When these image placeholders are placed on the canvas, they are saved with `type: "image"`:

```json
{
  "id": "element_123",
  "type": "image",
  "variable": "{{training_center_logo}}",
  "x": 0.1,
  "y": 0.1,
  "width": 0.2,
  "height": 0.15,
  "font_family": null,
  "font_size": null,
  "color": null,
  "font_weight": null,
  "text_align": null
}
```

### Rendering Behavior

When rendering the certificate:

1. **Text variables** (e.g., `{{expiry_date}}`) → Render as text elements
2. **Image variables** (e.g., `{{training_center_logo}}`) → Render as `<img>` elements

---

## 4. config_json Structure

### Element Properties

All elements in `config_json` share the following structure:

```json
{
  "elements": [
    {
      "id": "unique_element_id",
      "type": "text" | "image",
      "variable": "{{variable_name}}",
      "x": 0.5,
      "y": 0.5,
      "width": 0.2,
      "height": 0.1,
      "font_family": "Arial",
      "font_size": 24,
      "color": "#000000",
      "font_weight": "bold",
      "text_align": "center"
    }
  ]
}
```

### Property Descriptions

| Property | Type | Description | Text Element | Image Element |
|----------|------|-------------|--------------|---------------|
| `id` | string | Unique element identifier | ✅ Required | ✅ Required |
| `type` | string | Element type: `"text"` or `"image"` | `"text"` | `"image"` |
| `variable` | string | Template variable name | ✅ Required | ✅ Required |
| `x` | number | Horizontal position (0-1, normalized) | ✅ Required | ✅ Required |
| `y` | number | Vertical position (0-1, normalized) | ✅ Required | ✅ Required |
| `width` | number | Width (0-1, normalized) | Optional | ✅ Required |
| `height` | number | Height (0-1, normalized) | Optional | ✅ Required |
| `font_family` | string | Font family | Optional | `null` |
| `font_size` | number | Font size in pixels | Optional | `null` |
| `color` | string | Text color (hex) | Optional | `null` |
| `font_weight` | string | Font weight (normal, bold, etc.) | Optional | `null` |
| `text_align` | string | Text alignment (left, center, right) | Optional | `null` |

---

## 5. Rendering Implementation

### Pseudo-Code Example

```javascript
// Render certificate from template
function renderCertificate(template, data) {
  const { orientation, template_html, config_json } = template;
  const { width, height } = getPageDimensions(orientation);
  
  // Parse config_json
  const elements = JSON.parse(config_json).elements;
  
  // Build data object for template variables
  const templateData = buildTemplateData(data);
  
  // Process each element
  elements.forEach(element => {
    const { type, variable, x, y, width, height, ...props } = element;
    
    // Calculate actual pixel positions
    const actualX = x * width;
    const actualY = y * height;
    const actualWidth = width ? width * width : null;
    const actualHeight = height ? height * height : null;
    
    if (type === 'image') {
      // Render image element
      const imageUrl = templateData[variable];
      renderImageElement({
        src: imageUrl,
        x: actualX,
        y: actualY,
        width: actualWidth,
        height: actualHeight
      });
    } else if (type === 'text') {
      // Render text element
      const textContent = templateData[variable] || '';
      renderTextElement({
        text: textContent,
        x: actualX,
        y: actualY,
        fontFamily: props.font_family,
        fontSize: props.font_size,
        color: props.color,
        fontWeight: props.font_weight,
        textAlign: props.text_align
      });
    }
  });
  
  // Generate final HTML/PDF
  return generateFinalDocument();
}

// Build template data from certificate data
function buildTemplateData(certificateData) {
  return {
    // Text variables
    '{{expiry_date}}': certificateData.expiry_date,
    '{{instructor_name}}': certificateData.instructor_name,
    '{{course_name}}': certificateData.course_name,
    // ... other text variables
    
    // Image variables
    '{{training_center_logo}}': certificateData.training_center_logo_url,
    '{{acc_logo}}': certificateData.acc_logo_url,
    '{{qr_code}}': certificateData.qr_code_url
  };
}

// Get page dimensions based on orientation
function getPageDimensions(orientation) {
  const dimensions = {
    landscape: { width: 1200, height: 848 },
    portrait: { width: 848, height: 1200 }
  };
  return dimensions[orientation] || dimensions.landscape;
}
```

---

## 6. Data Structure for Certificate Generation

### Example Certificate Data Object

```json
{
  "certificate_id": "CERT-001",
  "template_type": "instructor",
  "orientation": "landscape",
  
  // Text data
  "instructor_name": "John Doe",
  "expiry_date": "2027-01-15",
  "certificate_number": "ACC-INST-2024-001",
  "issue_date": "2024-01-15",
  
  // Image data (URLs or file identifiers)
  "training_center_logo_url": "https://cdn.example.com/logos/tc-123.png",
  "acc_logo_url": "https://cdn.example.com/logos/acc-official.png",
  "qr_code_url": "https://cdn.example.com/qrc/verify-cert-001.png"
}
```

---

## 7. API Endpoints

### Update Template

**Endpoint:** `PUT /api/templates/{template_id}`

**Request Body:**
```json
{
  "template_type": "instructor",
  "orientation": "landscape",
  "config_json": "{\"elements\":[...]}",
  "template_html": "<html>...</html>"
}
```

### Generate Certificate

**Endpoint:** `POST /api/certificates/generate`

**Request Body:**
```json
{
  "template_id": "123",
  "data": {
    "instructor_name": "John Doe",
    "expiry_date": "2027-01-15",
    "training_center_logo_url": "https://...",
    "acc_logo_url": "https://...",
    "qr_code_url": "https://..."
  }
}
```

**Response:**
```json
{
  "certificate_id": "CERT-001",
  "pdf_url": "https://...",
  "preview_url": "https://..."
}
```

---

## 8. Validation Rules

### Template Validation

1. **Orientation:** Must be either `"landscape"` or `"portrait"`
2. **config_json:** Must be valid JSON with an `elements` array
3. **Elements:** Each element must have:
   - `id` (unique)
   - `type` (`"text"` or `"image"`)
   - `variable` (valid template variable)
   - `x`, `y` (between 0 and 1)
   - For image elements: `width`, `height` (between 0 and 1)

### Variable Validation

| Variable | Required For | Type | Format |
|----------|--------------|------|--------|
| `{{expiry_date}}` | instructor | Date | ISO 8601 (YYYY-MM-DD) |
| `{{training_center_logo}}` | all | Image URL | Valid URL or file ID |
| `{{acc_logo}}` | all | Image URL | Valid URL or file ID |
| `{{qr_code}}` | all | Image URL | Valid URL or file ID |

---

## 9. Migration Notes

### Database Schema Update

Add the `orientation` column to the templates table:

```sql
ALTER TABLE templates ADD COLUMN orientation VARCHAR(10) DEFAULT 'landscape';
ALTER TABLE templates ADD CONSTRAINT chk_orientation 
  CHECK (orientation IN ('landscape', 'portrait'));
```

### Existing Templates

- All existing templates should default to `"landscape"` orientation
- No changes needed to existing `config_json` structures
- Image placeholders can be added to existing templates without breaking compatibility

---

## 10. Testing Checklist

- [ ] Template saves with correct orientation
- [ ] Orientation change updates page dimensions
- [ ] Image placeholders render as `<img>` elements
- [ ] Text variables render as text elements
- [ ] QR code images display correctly
- [ ] Logo images display correctly
- [ ] Normalized coordinates work for both orientations
- [ ] Certificate generation produces correct PDF output
- [ ] All template types (course, training_center, instructor) work correctly

---

## 11. Support & Questions

For questions or clarification on this implementation, please contact the frontend development team.

**Document Version:** 1.0  
**Last Updated:** 2026-02-22  
**Related Feature:** Certificate Designer - Orientation & Image Placeholders
