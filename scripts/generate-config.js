const fs = require("fs");
const path = require("path");

const outputPath = path.join(__dirname, "..", "js", "config.js");
const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const anonKey =
  process.env.SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "";

if ((!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) && url && anonKey) {
  console.warn("تنبيه: تم استخدام متغيرات NEXT_PUBLIC_* كبديل لإعدادات Supabase أثناء البناء.");
}

if (!url || !anonKey) {
  console.warn("تحذير: سيتم إنشاء js/config.js بقيم فارغة، وستعمل المنصة بالحفظ المحلي فقط.");
}

const config = `window.MOSUL_MEMORY_CONFIG = {
SUPABASE_URL: ${JSON.stringify(url)},
SUPABASE_ANON_KEY: ${JSON.stringify(anonKey)}
};
`;

fs.writeFileSync(outputPath, config, "utf8");
console.log("تم إنشاء js/config.js لإعدادات التشغيل.");
