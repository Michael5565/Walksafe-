# Security Specification for WalkSafe

## Data Invariants
1. A check must belong to a valid company and vehicle.
2. Only authenticated users can submit check results.
3. Push tokens must be associated with a valid company ID to prevent cross-company notifications.

## The Dirty Dozen (Payloads to Block)
1. **Shadow Field Injection**: `{"id": "v1", "companyId": "c1", "registration": "AB12", "isVerified": true}` -> Should fail `isValidVehicle` strict key check.
2. **Identity Spoofing**: Submitting a check with `driverId` that doesn't match `request.auth.uid`.
3. **Cross-Company Access**: User from `companyA` trying to read `companyB` data.
4. **ID Poisoning**: Using a 2KB string as a `vehicleId`.
5. **State Shortcutting**: Closing a defect without a repair log.
6. **Immutable Field Change**: Changing `companyId` of a vehicle after creation.
7. **Unauthenticated Write**: Trying to register a push token without login.
8. **Malicious ID**: Using `../` or other injection characters in document IDs.
9. **Quota Attack**: Submitting 10,000 checks in a second (rate limiting should ideally be handled at app level, but rules can block some).
10. **Type Mismatch**: `{"year": "NOT_A_NUMBER"}` in vehicle data.
11. **Large Payload**: Sending a 2MB photo string directly in Firestore (Firestore limit is 1MB anyway).
12. **orphaned Record**: Creating a check for a non-existent vehicle (Hard within rules without `get()`, but logically prevented).
