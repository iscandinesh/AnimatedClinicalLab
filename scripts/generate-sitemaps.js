/**
 * Dynamic XML Sitemap Generator for Alpha Diagnostics Centre
 * This script dynamically compiles sitemap XML files. It can be run as a build hook
 * or adapted into a server-side route handler (e.g., Express, Next.js, or Vercel Serverless).
 */

const fs = require('fs');
const path = require('path');

const DOMAIN = 'https://www.alphadiagnosticscentre.com';
const CURRENT_DATE = new Date().toISOString().split('T')[0]; // Format: YYYY-MM-DD

// Define the site's architectural hierarchy
const sitemapData = {
  core: [
    { loc: '/', changefreq: 'daily', priority: 1.0 },
    { loc: '/about', changefreq: 'monthly', priority: 0.7 },
    { loc: '/contact', changefreq: 'monthly', priority: 0.7 },
    { loc: '/insights', changefreq: 'weekly', priority: 0.6 }
  ],
  locations: [
    { loc: '/erode', changefreq: 'weekly', priority: 0.9 },
    { loc: '/tiruppur', changefreq: 'weekly', priority: 0.9 },
    { loc: '/bhavani', changefreq: 'weekly', priority: 0.9 },
    { loc: '/perundurai', changefreq: 'weekly', priority: 0.9 }
  ],
  services: [
    { loc: '/services/biochemistry', changefreq: 'monthly', priority: 0.8 },
    { loc: '/services/hematology', changefreq: 'monthly', priority: 0.8 },
    { loc: '/services/immunology', changefreq: 'monthly', priority: 0.8 },
    { loc: '/services/microbiology', changefreq: 'monthly', priority: 0.8 },
    { loc: '/services/pcr-molecular', changefreq: 'monthly', priority: 0.8 },
    { loc: '/services/home-sample-collection', changefreq: 'monthly', priority: 0.8 }
  ],
  packages: [
    { loc: '/packages/basic-health-checkup', changefreq: 'weekly', priority: 0.9 },
    { loc: '/packages/master-health-checkup', changefreq: 'weekly', priority: 0.9 },
    { loc: '/packages/executive-health-checkup', changefreq: 'weekly', priority: 0.9 },
    { loc: '/packages/well-women-health-checkup', changefreq: 'weekly', priority: 0.9 },
    { loc: '/packages/cardiac-package', changefreq: 'weekly', priority: 0.9 },
    { loc: '/packages/diabetic-package', changefreq: 'weekly', priority: 0.9 }
  ]
};

// Helper: Escape XML special characters
function escapeXml(unsafe) {
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
      default: return c;
    }
  });
}

// Generator: Generate Single XML Sitemap Structure
function buildSitemapXml(urls) {
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
  
  urls.forEach(item => {
    const fullUrl = `${DOMAIN}${item.loc}`;
    xml += '    <url>\n';
    xml += `        <loc>${escapeXml(fullUrl)}</loc>\n`;
    xml += `        <lastmod>${CURRENT_DATE}</lastmod>\n`;
    xml += `        <changefreq>${item.changefreq}</changefreq>\n`;
    xml += `        <priority>${item.priority.toFixed(1)}</priority>\n`;
    xml += '    </url>\n';
  });

  xml += '</urlset>\n';
  return xml;
}

// Generator: Generate Sitemap Index
function buildSitemapIndexXml(categories) {
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
  
  categories.forEach(category => {
    const sitemapUrl = `${DOMAIN}/sitemap-${category}.xml`;
    xml += '    <sitemap>\n';
    xml += `        <loc>${escapeXml(sitemapUrl)}</loc>\n`;
    xml += `        <lastmod>${CURRENT_DATE}</lastmod>\n`;
    xml += '    </sitemap>\n';
  });

  xml += '</sitemapindex>\n';
  return xml;
}

// Main execution function
function main() {
  const outputDir = path.join(__dirname, '..', 'wwwroot');
  
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // 1. Generate the main Consolidated Sitemap (Highly Recommended for SEO speed)
  const allUrls = Object.values(sitemapData).flat();
  const consolidatedXml = buildSitemapXml(allUrls);
  fs.writeFileSync(path.join(outputDir, 'sitemap.xml'), consolidatedXml, 'utf8');
  console.log('✓ Consolidated sitemap.xml generated successfully in wwwroot');

  // 2. Generate Sub-Sitemaps for the Sitemap Index layout
  Object.entries(sitemapData).forEach(([category, urls]) => {
    const categoryXml = buildSitemapXml(urls);
    fs.writeFileSync(path.join(outputDir, `sitemap-${category}.xml`), categoryXml, 'utf8');
    console.log(`✓ Sub-sitemap sitemap-${category}.xml generated successfully in wwwroot`);
  });

  // 3. Generate the Sitemap Index file (sitemap-index.xml)
  const categories = Object.keys(sitemapData);
  const indexXml = buildSitemapIndexXml(categories);
  fs.writeFileSync(path.join(outputDir, 'sitemap-index.xml'), indexXml, 'utf8');
  console.log('✓ Sitemap Index sitemap-index.xml generated successfully in wwwroot');
}

// Run the script
main();
