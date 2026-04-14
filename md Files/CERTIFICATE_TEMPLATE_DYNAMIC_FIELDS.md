# Certificate template dynamic fields

This document describes the shared **training provider** placeholders and how they behave for **course** and **instructor** certificate templates.

## Overview

ACC users design certificate HTML using placeholders such as `{{training_provider_name}}`. At PDF generation time, the backend replaces each `{{key}}` with real data from the training center, optional training class, and related records.

The following four fields are available for **both** course-completion certificates and instructor-authorization certificates:

| Placeholder | Description |
|-------------|-------------|
| `training_provider_name` | Training provider name (from the training center profile). |
| `training_provider_phone` | Training center phone number. |
| `delivery_method` | For **course** certs: derived from linked training class `location` and `location_details` (joined with ` — `). For **instructor** certs: usually empty (no class context). |
| `training_center_same_as_training_provider` | `Yes` or `No`, comparing training provider name with `training_center_name` on the certificate payload. |

## Backend implementation

### Placeholder definitions

- **File:** `app/Support/CertificateCoursePlaceholders.php`
- **Methods:**
  - `sharedTrainingProviderPlaceholders()` — the four fields above (shared documentation).
  - `definitions()` — full list for **course** templates (shared + trainee, course, logos, QR, etc.).
  - `instructorDefinitions()` — full list for **instructor** templates (shared + instructor, course, ACC, expiry, logos, QR, etc.).

### PDF generation

- **File:** `app/Services/CertificateGenerationService.php`
- **`appendCourseCertificateDynamicFields(TrainingCenter $trainingCenter, ?TrainingClass $trainingClass, array $data)`**  
  Merges the four dynamic keys into `$data`. When `$trainingClass` is `null`, `delivery_method` is empty.
- **`normalizeTemplateData()`** also maps `training_provider_name` from `training_center_name` when only the latter is present, and `training_provider_phone` from `training_center_phone` if added later.

**Course certificates (training center issuance)**  
- **File:** `app/Http/Controllers/API/TrainingCenter/CertificateController.php`  
- After building the base `$certificateData`, the controller calls `appendCourseCertificateDynamicFields($trainingCenter, $trainingClass, $certificateData)` for both single issue and bulk class generation.

**Instructor certificates**  
- **`generateInstructorCertificate()`** loads the instructor’s `trainingCenter`, then calls `appendCourseCertificateDynamicFields($trainingCenter, null, $data)`.  
- If the instructor has no training center, the four keys are set to empty strings so templates still render.

## ACC API

### List placeholders (for designers / front-end)

```http
GET /api/acc/certificate-templates/placeholders?template_type=course
GET /api/acc/certificate-templates/placeholders?template_type=instructor
```

**Response (shape):**

```json
{
  "template_type": "course",
  "placeholders": [
    { "key": "training_provider_name", "label": "...", "description": "..." }
  ]
}
```

- `template_type` defaults to `course` if omitted.
- Only `course` and `instructor` are supported.

### Template detail (includes placeholders)

```http
GET /api/acc/certificate-templates/{id}
```

When the template belongs to the authenticated ACC:

- If `template_type` is `course`, the response includes `available_placeholders` (same as `definitions()`).
- If `template_type` is `instructor`, the response includes `available_placeholders` (same as `instructorDefinitions()`).

**Note:** `GET /acc/certificate-templates/{id}` is scoped to the current ACC’s templates.

## Using placeholders in HTML

Use double curly braces in `template_html` (and card HTML if applicable):

```html
<p>Provider: {{training_provider_name}} — {{training_provider_phone}}</p>
<p>Delivery: {{delivery_method}}</p>
<p>TC same as provider: {{training_center_same_as_training_provider}}</p>
```

Images (logos, QR) must use the existing patterns, e.g. `<img src="{{training_center_logo}}">`.

## Related files

| Area | Path |
|------|------|
| Placeholder lists | `app/Support/CertificateCoursePlaceholders.php` |
| Generation & merging | `app/Services/CertificateGenerationService.php` |
| Training center issue | `app/Http/Controllers/API/TrainingCenter/CertificateController.php` |
| ACC template API + placeholders route | `app/Http/Controllers/API/ACC/CertificateTemplateController.php` |
| Routes | `routes/api.php` (`certificate-templates/placeholders` before `certificate-templates` resource) |

## Future improvements (optional)

- Add a dedicated `delivery_method` (or mode) column on `training_classes` if you need explicit values (e.g. Online / Classroom) instead of deriving from location text.
- Rename `CertificateCoursePlaceholders` to a neutral name (e.g. `CertificateTemplatePlaceholders`) if you want the class name to reflect instructor templates too; current name is kept for backward compatibility with existing imports.
