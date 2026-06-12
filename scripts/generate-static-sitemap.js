import fs from "fs";
import path from "path";

const DB_DIR = path.join(process.cwd(), "data");
const DB_FILE = path.join(DB_DIR, "db.json");
const DIST_DIR = path.join(process.cwd(), "dist");

try {
  // Ensure dist folder exists
  if (!fs.existsSync(DIST_DIR)) {
    fs.mkdirSync(DIST_DIR, { recursive: true });
  }

  let products = [];
  let categories = [
    { id: "script", label: "کد و اسکریپت", slug: "code" },
    { id: "template", label: "قالب و گرافیک", slug: "template" },
    { id: "book", label: "آموزش و کتاب", slug: "book" },
    { id: "video", label: "دوره و ویدیو", slug: "video" },
    { id: "other", label: "سایر فایل‌ها", slug: "other" }
  ];
  let siteTitle = "فروشگاه بزرگ فایل دیجیتال";

  // Attempt to read data/db.json
  if (fs.existsSync(DB_FILE)) {
    const raw = fs.readFileSync(DB_FILE, "utf-8");
    const data = JSON.parse(raw);
    if (data.products) products = data.products;
    if (data.categories) categories = data.categories;
    if (data.settings && data.settings.siteTitle) {
      siteTitle = data.settings.siteTitle;
    }
  }

  // Pick a generic production URL - they should ideally replace this or let it use a relative root
  // Since sitemaps require absolute URLs, we'll generate it with a placeholder that they can easily modify,
  // or we can detect the host, or provide standard relative mapping structure.
  const host = "https://yourdomain.com"; // Placeholder - can be modified

  const urls = [];

  // 1. Homepage
  urls.push(`  <url>
    <loc>${host}/</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>`);

  // 2. Categories
  categories.forEach((cat) => {
    if (cat.slug) {
      urls.push(`  <url>
    <loc>${host}/${cat.slug}</loc>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`);
    }
  });

  // 3. Products
  products.forEach((prod) => {
    const productSlug = prod.slug || prod.id;
    if (productSlug) {
      urls.push(`  <url>
    <loc>${host}/p/${productSlug}</loc>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>`);
    }
  });

  const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join("\n")}
</urlset>`;

  const targetPath = path.join(DIST_DIR, "sitemap.xml");
  fs.writeFileSync(targetPath, sitemapXml, "utf-8");
  console.log(`[Sitemap Generator] Static sitemap generated successfully at ${targetPath}`);

} catch (err) {
  console.error("[Sitemap Generator Error] Failed to generate static sitemap.xml:", err);
}
