const bodyParser = require("body-parser");
const fs = require("fs");
const cors = require("cors");
const https = require("https");

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = "./content.json";
const REMOTE_JSON_URL = "https://raw.githubusercontent.com/profedani1/ubacarona/main/content.json";

// Middleware
app.use(cors());
@@ -49,8 +51,6 @@ app.put("/api/meta", (req, res) => {
}
});

// === Your existing endpoints remain unchanged below ===

// Register passenger
app.post("/api/passengers", (req, res) => {
const { name } = req.body;
@@ -283,7 +283,7 @@ app.put("/api/trip", (req, res) => {
saveData(data);
res.json({ success: true, message: "Trip information updated." });
});
 

// Reset entire trip
app.post("/api/reset", (req, res) => {
const data = loadData();
@@ -296,7 +296,34 @@ app.post("/api/reset", (req, res) => {
res.json({ success: true, message: "Trip, passengers, and drivers have been reset." });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
// ✅ Start server after syncing from GitHub
function syncContentFromGitHub(callback) {
  console.log("⏳ Syncing content.json from GitHub...");
  https.get(REMOTE_JSON_URL, (res) => {
    if (res.statusCode !== 200) {
      console.error(`⚠️ Failed to fetch content.json: ${res.statusCode}`);
      return callback();
    }

    let rawData = "";
    res.on("data", chunk => rawData += chunk);
    res.on("end", () => {
      try {
        fs.writeFileSync(DATA_FILE, rawData);
        console.log("✅ content.json synced from GitHub.");
      } catch (err) {
        console.error("❌ Failed writing content.json:", err);
      }
      callback();
    });
  }).on("error", (err) => {
    console.error("❌ Fetch error:", err);
    callback();
  });
}

syncContentFromGitHub(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
  });
});
