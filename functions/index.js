const {onSchedule} = require("firebase-functions/v2/scheduler");
const admin = require("firebase-admin");

admin.initializeApp();

const{getUsersforSync} = require("./services/firestore-readers");
const{importtoREDCap} = require("./services/REDCap_Service");

exports.redcapSync = onSchedule(
    {
        schedule: "0 2 * * *",
        timeZone: "America/New_York"
    },
    async ()=>{
        try{
            const users = await getUsersforSync();
            if (users.length===0)
            {
                console.log("REDCap Sync: No users to sync");
                return;
            }

            const importedCount = await importtoREDCap(users);
            console.log(`REDCap sync completed: ${importedCount} records`)
        } catch (error) {
            console.error("REDCap sync error:", error);
        }
    }
);
