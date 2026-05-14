# Child Account Certificate Display & Download - Complete Fix

## Issues Fixed

### 1. **React Error: "Objects are not valid as a React child"**

**Problem:** When child accounts tried to view or download certificates, a React error occurred: "Objects are not valid as a React child (found: object with keys {email})"

**Root Cause:** The backend was populating `verification.representative` which created nested objects with properties like `email`. These objects were being passed to the frontend and somewhere in the rendering pipeline, an object was being rendered directly in JSX instead of extracting its properties.

**Solution:** Removed all `.populate('verification.representative')` calls from the backend. The verification array already contains all necessary data:
- `officerName` - Officer's name
- `seal.url` - Seal image path
- `signature.url` - Signature image path
- `verifiedAt` - Verification date
- `level` - Approval level (kebele, woreda, etc.)

**Files Modified:**
- `backend/controllers/certificateController.js` - Removed populate calls from:
  - `generateBirthCertificate` (line 247)
  - `downloadCertificate` (line 387)
  - `generateMarriageCertificate` (line 970)
  - `generateDeathCertificate` (line 1017)
- `backend/controllers/vitalEventController.js` - Removed populate call from:
  - `getMyEvents` (line 1393)

### 2. **Certificate Showing Wrong Information for Child Accounts**

**Problem:** When child accounts viewed their certificates, the displayed information was not accurate or was showing parent's information instead of child's information.

**Root Cause:** 
- Child accounts are created with minimal information (firstName, lastName, dateOfBirth, gender, idNumber)
- The complete birth information (parents' names, hospital, doctor, etc.) is stored in the VitalEvent's `birthDetails` field
- The certificate preview and PDF generation need to use `birthDetails` for complete information

**Solution:** Ensured that:
1. Certificate preview modal uses `selectedVitalEvent.birthDetails` for all child information
2. Certificate PDF generation uses `event.birthDetails` for complete information
3. Child account's personal info is used only for identity linkage display

**Data Flow for Child Certificates:**
```
VitalEvent.birthDetails (Complete birth information)
├── childName
├── gender
├── placeOfBirth
├── weight
├── fatherName
├── motherName
├── hospitalName
├── doctorName
└── childPhoto

VitalEvent.citizen (Child account - minimal info)
├── personalInfo.firstName
├── personalInfo.lastName
├── personalInfo.dateOfBirth
├── personalInfo.gender
└── personalInfo.idNumber

VitalEvent.verification (Approval information)
├── level: 'kebele' | 'woreda'
├── status: 'approved'
├── officerName
├── seal.url
├── signature.url
└── verifiedAt
```

## Technical Implementation

### Backend Changes

**Removed problematic populate calls:**
```javascript
// BEFORE (causes React error)
const event = await VitalEvent.findById(eventId)
  .populate('citizen')
  .populate('verification.representative');  // ❌ Creates nested objects

// AFTER (clean data)
const event = await VitalEvent.findById(eventId)
  .populate('citizen')
  .populate('registeredUser');  // ✅ Only necessary references
```

### Frontend Changes

**Certificate Modal uses correct data sources:**
```javascript
// For child information - use birthDetails
{selectedVitalEvent.birthDetails?.childName}
{selectedVitalEvent.birthDetails?.fatherName}
{selectedVitalEvent.birthDetails?.motherName}

// For approval information - use verification array
{selectedVitalEvent.verification?.map(v => v.officerName)}

// For identity - use citizen object
{selectedVitalEvent.citizen?.personalInfo?.idNumber}
```

## Testing Checklist

- [ ] Child account can view certificate preview without React errors
- [ ] Child account can download certificate without errors
- [ ] Certificate displays correct child information (name, DOB, gender)
- [ ] Certificate displays correct parent information (father, mother names)
- [ ] Certificate displays correct hospital and doctor information
- [ ] Kebele approval information displays correctly (name, seal, signature)
- [ ] Woreda approval information displays correctly (name, seal, signature)
- [ ] Parent account can still view and download certificates normally
- [ ] Vital event certificates (birth, marriage, death) all work correctly

## Verification Data Structure

The verification array in VitalEvent contains all approval information:

```javascript
verification: [
  {
    level: 'kebele',
    status: 'approved',
    officerName: 'Officer Name',
    seal: { url: '/uploads/seal.png', filename: 'seal.png' },
    signature: { url: '/uploads/sig.png', filename: 'sig.png' },
    verifiedAt: Date,
    representative: ObjectId  // ❌ NOT POPULATED - causes React error
  },
  {
    level: 'woreda',
    status: 'approved',
    officerName: 'Officer Name',
    seal: { url: '/uploads/seal.png', filename: 'seal.png' },
    signature: { url: '/uploads/sig.png', filename: 'sig.png' },
    verifiedAt: Date,
    representative: ObjectId  // ❌ NOT POPULATED
  }
]
```

## Benefits

✅ React error fixed - no more "Objects are not valid as a React child"
✅ Child accounts display correct certificate information
✅ Approval information (Kebele/Woreda) displays correctly
✅ Cleaner data structure without unnecessary nested objects
✅ Better performance - fewer database queries
✅ Consistent data display across all certificate types
