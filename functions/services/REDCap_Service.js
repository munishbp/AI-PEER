const fetch = require("node-fetch");
const { FIELD_MAPPINGS } = require("../config/fieldMappings");

// REDCap credentials come from Secret Manager via defineSecret() in index.js.
// the Functions runtime injects them into process.env at invocation time —
// they are not present when the module first loads, so read them lazily on
// each call (not at top-level). previously these lived in Firestore at
// config/redcap, which meant anyone with Firestore read access could grab
// a token that has full project-level REDCap rights.
async function loadREDCapConfig() {
    const apiUrl = process.env.REDCAP_API_URL;
    const apiToken = process.env.REDCAP_API_TOKEN;

    if (!apiUrl || !apiToken) {
        throw new Error("REDCap secrets not injected — check defineSecret() binding on redcapSync");
    }
    if (!apiUrl.startsWith("https://")) {
        throw new Error("REDCap apiUrl must be HTTPS");
    }

    return { apiUrl, apiToken };
}

function buildREDCapRecord({userID, phonenum, btrack_score, fear_falling_score, compliance_days_active, compliance_rate})
{
    if (!userID)
    {
        throw new Error ("Missing record id");
    }
    if (typeof phonenum !=="string"){
        throw new Error ("Phone number must be a string");
    }
    if (!Number.isInteger(btrack_score) || !Number.isInteger(fear_falling_score))
    {
        throw new Error ("Scores must be an integer");
    }

    const record = {
        record_id: userID,
        [FIELD_MAPPINGS.btrack_score]: btrack_score,
        [FIELD_MAPPINGS.phoneNumber]: phonenum,
        [FIELD_MAPPINGS.fear_falling_score]: fear_falling_score
    };

    if (Number.isInteger(compliance_days_active)) {
        record[FIELD_MAPPINGS.compliance_days_active] = compliance_days_active;
    }
    if (Number.isInteger(compliance_rate)) {
        record[FIELD_MAPPINGS.compliance_rate] = compliance_rate;
    }

    return record;
}

async function exportFromREDCap() {
    const {apiToken, apiUrl} = await loadREDCapConfig();
    console.log("[DEBUG] REDCap URL:", apiUrl);
    console.log("[DEBUG] Token length:", apiToken?.length);
    const body = new URLSearchParams({
        token: apiToken,
        content: "record",
        format: "json",
        type: "flat",
        fields:[
            "record_id",
            FIELD_MAPPINGS.btrack_score,
            FIELD_MAPPINGS.phoneNumber,
            FIELD_MAPPINGS.fear_falling_score
        ].join(",")
    });

    const response = await fetch(apiUrl,{
        method: "POST",
        headers:{
            "Content-type": "application/x-www-form-urlencoded"
        },
        body: body.toString()
    });

    const text = await response.text();
    if (!response.ok)
    {
        throw new Error (`REDCap export failed (${response.status})`);
    }

    let records;
    try {
        records = JSON.parse(text);
    } catch{
        throw new Error ("Invalid JSON returned from REDCap export");
    }

    return records.map(r=>({
        userID: r.record_id,
        phonenum: String(r[FIELD_MAPPINGS.phoneNumber]||""),
        btrack_score: parseInt(r[FIELD_MAPPINGS.btrack_score], 10) || null,
        fear_falling_score: parseInt(r[FIELD_MAPPINGS.fear_falling_score], 10)|| null,
        source:"redcap",
        synced_at: new Date().toISOString()
    }));
}

async function importToREDCap(rawRecords) {
    if (!Array.isArray(rawRecords))
    {
        throw new Error ("importToREDCap expects an array");
    }

    if (rawRecords.length==0)
    {
        return 0;
    }

    const records = rawRecords.map(buildREDCapRecord);
    const {apiToken, apiUrl} = await loadREDCapConfig();

    const body = new URLSearchParams({
        token: apiToken,
        content: "record",
        format: "json",
        type: "flat",
        overwriteBehavior: "overwrite",
        data: JSON.stringify(records)
    });

    const response = await fetch(apiUrl,{
        method: "POST",
        headers:{
            "Content-type": "application/x-www-form-urlencoded"
        },
        body: body.toString()
    });

    const text = await response.text();
    if (!response.ok)
    {
        throw new Error (`REDCap import failed (${response.status})`);
    }

    let parsed;
    try {
        parsed = JSON.parse(text);
    } catch{
        throw new Error ("Invalid JSON returned from REDCap import");
    }

    console.log("[DEBUG] REDCap import response:", JSON.stringify(parsed));

    if (typeof parsed ==="number")
    {
        return parsed;
    }
    if (parsed && typeof parsed.count === "number") {
        return parsed.count;
    }
    if (Array.isArray(parsed)) {
        return parsed.length;
    }
    throw new Error("Unexpected REDCap import response");
}


module.exports = {
  exportFromREDCap,
  importToREDCap
};