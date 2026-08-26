# भेटिन्छ v0.1 — Review Prototype

यो पहिलो review build हो। Working name **भेटिन्छ** राखिएको छ; branding पछि सजिलै बदल्न सकिने गरी config-based बनाइएको छ।

## Included
- Mobile-first, responsive, accessible public portal
- Search + Master Categories + Taxi Service सहित transport group
- “Need Journey” shortcuts
- Emergency Help (Nepal Police official source link + 100 call button)
- Paid Business Registration wizard: Business → Category → Plan → Payment/Review
- Supplier Portal preview + lead analytics structure
- Admin/Super Admin preview
- Google Apps Script backend with Google Sheets auto-setup
- Permission-based Admin controls
- Admin Active/Inactive by Super Admin
- Backend permission checks (UI-only security होइन)
- Audit Log
- Delete Request → Super Admin approval → Archive workflow
- Manpower demand sheet + separate review-ready architecture
- Paid plan and payment submission structure

## Preview locally
`index.html` खोल्दा Demo Mode मा UI/flow preview हुन्छ। `config.js` मा `DEMO_MODE: true` राखिएको छ।

## Google Apps Script setup
1. नयाँ Google Sheet बनाउनुहोस्।
2. Extensions → Apps Script खोल्नुहोस्।
3. `Code.gs` र `appsscript.json` राख्नुहोस्।
4. `setupSystem()` एक पटक run गर्नुहोस्।
5. यसले Settings, Admins, Sessions, Businesses, Categories, Plans, Payments, Emergency, Manpower, Audit आदि sheets बनाउँछ।
6. Bootstrap login: `superadmin / ChangeMe@123` (पहिलो login पछि तुरुन्त password-change workflow अर्को update मा finalize गर्नुपर्छ; production अघि hardening आवश्यक)।
7. Deploy → Web app → Execute as Me → access according to deployment policy.
8. `/exec` URL लाई `config.js` को `API_URL` मा राख्नुहोस् र `DEMO_MODE:false` गर्नुहोस्।

## Business Add Design
Public user ले `+ नयाँ व्यवसाय थप्नुहोस्` थिच्दा 4-step wizard खुल्छ:
1. Listing Type + Business/contact/location
2. Multiple categories
3. Paid plan
4. Payment reference + license/reference + declaration

Submission तुरुन्त public हुँदैन। Backend status `PENDING_REVIEW`; Admin/Super Admin review पछि मात्र `ACTIVE/VERIFIED` हुन्छ। Paid र Verified छुट्टाछुट्टै concept हुन्।

## Security model
- Super Admin is the authority for Admin creation/status/permission.
- Admin permissions are action-level (View/Add/Edit/Approve etc.).
- Backend re-checks permission for each protected action.
- Inactive Admin sessions are revoked.
- Admin permanent delete हुँदैन; Delete Request → Super Admin review → Archive.
- Every sensitive action creates Audit_Log record.
- Browser मा देखिएको data 100% copy रोक्न सम्भव हुँदैन; production मा least-privilege, masking, rate limits, export restrictions र server-side pagination थप्नुपर्छ।

## Paid version note
यो build मा plan selection र payment-reference workflow छ। Actual eSewa/Khalti/merchant API credentials नभएकाले live gateway intentionally hard-code गरिएको छैन। Production gateway अलग secure server-side verification बाट जोड्नुपर्छ।

## Emergency note
नेपाल प्रहरीको official contact directory link config मा राखिएको छ। All-Nepal contacts लाई Emergency_Contacts sheet मा source URL + last verified date सहित import/sync गर्ने module अर्को update मा थप्न सकिन्छ।

## Recommended next review items
- Logo/brand colors
- Full Nepali/English bilingual labels
- Exact master category taxonomy from Book1.xlsx + missing Nepal-specific categories
- Province/District/Municipality master data
- Supplier document upload to Drive
- Payment gateway
- Supplier password/OTP flow
- Super Admin change-password + new-device OTP
- Exact Admin permission editor UI
- Manpower legal verification workflow
- Emergency all-Nepal official contact import
