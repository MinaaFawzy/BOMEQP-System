# Instructor Screens - Implementation Summary

## Overview
I've created a new screen for **Authorized Instructors** and updated the existing screen to focus on **Instructor Authorization Requests**.

## Files Created

### 1. AuthorizedInstructorsScreen
**Location:** `src/screens/ACCAdmin/AuthorizedInstructorsScreen/AuthorizedInstructorsScreen.jsx`

**Purpose:** Display all approved/authorized instructors

**Features:**
- ✅ Server-side search (by name, email, phone, training center)
- ✅ Pagination (15 items per page by default)
- ✅ DataTable with sortable columns
- ✅ Detailed view modal showing:
  - Instructor information
  - Training center details
  - Authorization details (commission %, authorization price)
  - Authorized courses list with course codes

**API Endpoint:** `GET /acc/instructors`
- Uses `accAPI.listAuthorizedInstructors(params)`
- Returns only approved instructors

**Columns Displayed:**
1. Instructor (with photo)
2. Email
3. Training Center
4. Commission %
5. Payment Status
6. Actions (View Details button)

### 2. InstructorsScreen (Updated)
**Location:** `src/screens/ACCAdmin/InstructorsScreen/InstructorsScreen.jsx`

**Changes Made:**
- ✅ Updated header title to "Instructor Authorization Requests"
- ✅ Updated subtitle to "Review and manage instructor authorization requests"
- ✅ Removed ID fields from detail modal
- ✅ Added Category and Sub-Category display
- ✅ Added Requested Courses section

**Purpose:** Manage instructor authorization requests (pending, approved, rejected, returned)

## Routing Setup

To integrate the new screen, add it to your ACC Admin routes:

```jsx
// In your routing file (e.g., App.jsx or routes.jsx)
import AuthorizedInstructorsScreen from './screens/ACCAdmin/AuthorizedInstructorsScreen/AuthorizedInstructorsScreen';
import InstructorsScreen from './screens/ACCAdmin/InstructorsScreen/InstructorsScreen';

// Add routes:
<Route path="/acc-admin/instructors" element={<AuthorizedInstructorsScreen />} />
<Route path="/acc-admin/instructor-requests" element={<InstructorsScreen />} />
```

## Navigation Menu Update

Update your sidebar/navigation menu to include both screens:

```jsx
{
  title: 'Instructors',
  icon: Users,
  path: '/acc-admin/instructors',
},
{
  title: 'Instructor Requests',
  icon: Clock,
  path: '/acc-admin/instructor-requests',
}
```

## API Integration

The new screen uses the existing API endpoint:
- **Endpoint:** `GET /acc/instructors`
- **Parameters:**
  - `search` (optional): Search by name, email, phone, or training center
  - `per_page` (optional): Items per page (default: 15)
  - `page` (optional): Page number (default: 1)

**Response Format:**
```json
{
  "instructors": [
    {
      "id": 1,
      "first_name": "John",
      "last_name": "Doe",
      "email": "john@example.com",
      "authorization": {
        "id": 1,
        "commission_percentage": "10.00",
        "authorization_price": "500.00",
        "payment_status": "paid"
      },
      "authorized_courses": [...],
      "training_center": {...}
    }
  ],
  "pagination": {
    "current_page": 1,
    "last_page": 5,
    "per_page": 15,
    "total": 75
  }
}
```

## Features Comparison

| Feature | Instructor Requests | Authorized Instructors |
|---------|-------------------|----------------------|
| **Purpose** | Manage authorization requests | View approved instructors |
| **Status Filters** | All, Pending, Active, Returned | N/A (all are approved) |
| **Actions** | Approve, Reject, Return | View Details only |
| **Search** | ✅ Server-side | ✅ Server-side |
| **Pagination** | ✅ Yes | ✅ Yes |
| **Detail View** | Full request details + courses | Instructor + authorization info |

## Next Steps

1. ✅ Add the new route to your routing configuration
2. ✅ Update the navigation menu
3. ✅ Test the search functionality
4. ✅ Test pagination
5. ✅ Verify the detail modal displays correctly

## Notes

- Both screens use the same `DataTable` and `Pagination` components
- Search is debounced (500ms) to reduce API calls
- The detail modal in AuthorizedInstructorsScreen shows authorized courses in a beautiful card layout
- Payment status badges use gradient colors (green for paid, yellow for pending)
