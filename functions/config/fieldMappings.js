// Maps Firestore field names to their corresponding REDCap field names.
// Update this file when field names change — no need to touch service files.
const FIELD_MAPPINGS = {
    btrack_score: "b_track_score",
    fear_falling_score: "ff_score",
    phoneNumber: "phone_number"
};

// Reverse mapping: REDCap field names -> Firestore field names
// Generated automatically so it never gets out of sync with FIELD_MAPPINGS
const REDCAP_TO_FIRESTORE = Object.fromEntries(
    Object.entries(FIELD_MAPPINGS).map(([firestore, redcap]) => [redcap, firestore])
);

module.exports = { FIELD_MAPPINGS, REDCAP_TO_FIRESTORE };