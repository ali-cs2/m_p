const fs = require("fs");
const path = require("path");

const outputPath = path.join(__dirname, "..", "js", "config.js");
const url = process.env.SUPABASE_URL || "";
const anonKey = process.env.SUPABASE_ANON_KEY || "";

const config = `window.MOSUL_MEMORY_CONFIG = {
  SUPABASE_URL: ${JSON.stringify(url)},
  SUPABASE_ANON_KEY: ${JSON.stringify(anonKey)}
};
`;

fs.writeFileSync(outputPath, config, "utf8");
console.log("تم إنشاء js/config.js لإعدادات التشغيل.");
