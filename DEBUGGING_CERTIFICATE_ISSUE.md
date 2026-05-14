# 🔍 Debugging Certificate Download Issue

## Step 1: Test Event Data

Run this command to check the event data:

```bash
cd backend
node test-certificate-download.js 69a355ec4d8749df6b1c51a8
```

This will show you:
- ✅ If the event exists
- ✅ Event status
- ✅ Location data
- ✅ Citizen data
- ✅ Verification/approval data
- ✅ Any potential issues

**Share the output with me!**

---

## Step 2: Add Test Endpoint (Temporary)

Add this to your `backend/server.js` file (temporarily for testing):

```javascript
// Add near the top with other requires
const testCertificateRouter = require('./test-certificate-endpoint');

// Add after other routes
app.use('/api', testCertificateRouter);
```

Then restart your server and try:
```
http://localhost:5000/api/test-certificate/69a355ec4d8749df6b1c51a8
```

This bypasses authentication and uses a simpler PDF generation to isolate the issue.

---

## Step 3: Check Server Console

When you try to download the certificate, look for these messages in your server console:

### Success Messages:
```
📄 Downloading certificate for event: ...
✅ Event found: birth Status: completed
📋 Generating PDF certificate: ...
📝 Rendering approval chain...
✅ Approval chain rendered
✍️ Rendering signatures...
✅ Signatures rendered
✅ Certificate PDF generation complete
```

### Error Messages:
```
❌ Event not found: ...
⚠️ Payment required for citizen
⚠️ Event not completed/approved: ...
❌ Error rendering approval chain: ...
❌ Error rendering signatures: ...
❌ Download certificate error: ...
```

**Share the exact error messages you see!**

---

## Step 4: Check Browser Console

Open your browser's Developer Tools (F12) and check:

1. **Network Tab:**
   - Look for the request to `/api/certificates/.../download`
   - Check the response status code (200, 404, 500, etc.)
   - Check the response body

2. **Console Tab:**
   - Look for any JavaScript errors
   - Check for error messages

**Share any errors you see!**

---

## Common Issues and Quick Fixes

### Issue 1: Event Status Not Approved
**Symptom:** "Certificate not yet available"
**Fix:** Event status must be 'completed' or 'approved'

```javascript
// Check event status in MongoDB
db.vitalevents.findOne({ _id: ObjectId("69a355ec4d8749df6b1c51a8") })

// Update if needed
db.vitalevents.updateOne(
  { _id: ObjectId("69a355ec4d8749df6b1c51a8") },
  { $set: { status: "completed" } }
)
```

### Issue 2: Payment Required
**Symptom:** "Payment Required: Please pay the certificate fee"
**Fix:** Update payment status

```javascript
db.vitalevents.updateOne(
  { _id: ObjectId("69a355ec4d8749df6b1c51a8") },
  { $set: { "certificate.paymentStatus": "paid" } }
)
```

### Issue 3: Missing Citizen Data
**Symptom:** Error when rendering citizen information
**Fix:** Check if citizen field is populated

```javascript
// Check if citizen exists
db.vitalevents.findOne({ _id: ObjectId("69a355ec4d8749df6b1c51a8") }, { citizen: 1 })
```

### Issue 4: PDFKit Error
**Symptom:** Error in PDF generation
**Fix:** Check if pdfkit is installed

```bash
cd backend
npm install pdfkit
```

---

## Quick Test Commands

### Test 1: Check if event exists
```bash
cd backend
node -e "require('dotenv').config(); const mongoose = require('mongoose'); const VitalEvent = require('./models/VitalEvent'); mongoose.connect(process.env.MONGODB_URI).then(async () => { const event = await VitalEvent.findById('69a355ec4d8749df6b1c51a8'); console.log('Event found:', !!event); if(event) console.log('Status:', event.status); process.exit(); });"
```

### Test 2: Check server is running
```bash
curl http://localhost:5000/api/health
```

### Test 3: Check authentication
```bash
# Replace TOKEN with your actual JWT token
curl -H "Authorization: Bearer TOKEN" http://localhost:5000/api/certificates/69a355ec4d8749df6b1c51a8/download
```

---

## What to Share

Please share:

1. **Output from test-certificate-download.js**
   ```
   Run: node backend/test-certificate-download.js 69a355ec4d8749df6b1c51a8
   ```

2. **Server console output** when you try to download

3. **Browser console errors** (F12 → Console tab)

4. **Network request details** (F12 → Network tab)

5. **Event status** from database:
   ```javascript
   db.vitalevents.findOne({ _id: ObjectId("69a355ec4d8749df6b1c51a8") }, { status: 1, "certificate.paymentStatus": 1 })
   ```

---

## Temporary Workaround

If you need certificates immediately, you can temporarily disable payment check:

In `backend/controllers/certificateController.js`, comment out the payment check:

```javascript
// --- PAYMENT VERIFICATION ---
// Enforce payment for citizens
// if (req.user.role === 'citizen') {
//   if (!event.certificate || event.certificate.paymentStatus !== 'paid') {
//     console.log('⚠️ Payment required for citizen');
//     return res.status(402).json({
//       status: 'error',
//       message: 'Payment Required: Please pay the certificate fee to download.',
//       payment_required: true
//     });
//   }
// }
```

**Remember to re-enable this in production!**

---

## Next Steps

1. Run the test script and share output
2. Try the test endpoint
3. Check server console for error messages
4. Share the exact error you're seeing

Once I see the actual error, I can provide a specific fix!
