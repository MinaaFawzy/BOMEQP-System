# InstructorsScreen Optimization

## Overview
Optimized the `InstructorsScreen` component to reduce the number of API calls by utilizing the `statistics` object returned from the main data endpoint.

## Changes Made

### 1. **Removed Redundant API Calls**
- Removed the `fetchStats` function which previously made 3 separate API calls to fetch counts for different statuses.
- Removed the `fetchStats()` invocation from the main `useEffect` hook.

### 2. **Efficient Data Utilization**
- Updated `loadData` function to parse the `statistics` object from the API response.
- Now updates the `stats` state (total, active, pending, returned) directly from the list response.

### 3. **Performance Impact**
- Reduced initial load API calls from **4** (1 list + 3 stats) to **1** (single list call with included stats).
- Improved component rendering performance and reduced network traffic.

## Data Structure
The component now expects the API response to include a `statistics` object with the following structure:
```json
{
  "data": [...],
  ...
  "statistics": {
    "approved": 10,
    "pending": 5,
    "returned": 2,
    "total": 17
  }
}
```
If `total` is missing from statistics, it is calculated as the sum of approved, pending, and returned counts.
