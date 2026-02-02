const fetch = require("node-fetch");
const admin = require("firebase-admin");

if (!admin.apps.length) {
    admin.initializeApp();
}

const db = admin.firestore();

let cachedConfig = null;

async function loadREDCapConfig(){
    if (cachedConfig)
    {
        return cachedConfig;
    }

    const docRef = db.doc("config/redcap");
    const snap = await docRef.get();

    if (!snap.exists)
    {
        throw new Error("REDCap config document not found in Firestore");
    }

    const {apiToken, apiUrl} = snap.data();
    if (!apiUrl||!apiToken)
    {
        throw new Error("REDCap config is missing token or url");
    }

    cachedConfig={
        apiUrl,
        apiToken
    };
    return cachedConfig;
}

function buildREDCapRecord({userID, phonenum, balanceTrackScore, fallFearScore})
{
    if (!userID)
    {
        throw new Error ("Missing record id");
    }
    if (typeof phonenum !=="string"){
        throw new Error ("Phone number must be a string");
    }
    if (!Number.isInteger(balanceTrackScore) || !Number.isInteger(fallFearScore))
    {
        throw new Error ("Scores must be an integer")
    }

    return{
        record_id: userID,
        b_track_score: balanceTrackScore,
        phone_number: phonenum,
        ff_score: fallFearScore
    };
}

async function exportFromREDCap() {
    const {apiToken, apiUrl} = await loadREDCapConfig();

    const body = new URLSearchParams({
        token: apiToken,
        content: "record",
        format: "json",
        type: "flat",
        fields:[
            "record_id",
            "b_track_score",
            "phone_number",
            "ff_score"
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
        phonenum: String(r.phone_number||""),
        balanceTrackScore: parseInt(r.b_track_score, 10),
        fallFearScore: parseInt(r.ff_score, 10),
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

    if (typeof parsed ==="number")
    {
        return parsed;
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