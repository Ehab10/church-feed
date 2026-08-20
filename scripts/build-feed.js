// Reads every Markdown file in /posts, builds an RSS 2.0 feed, writes feed.xml
// to the repo root. Run via: node scripts/build-feed.js
// Reads config from env vars (set by the GitHub Action) with sane local defaults.

const fs = require("fs");
const path = require("path");
const matter = require("gray-matter");
const { marked } = require("marked");

const POSTS_DIR = path.join(__dirname, "..", "posts");
const OUTPUT_FILE = path.join(__dirname, "..", "feed.xml");

const SITE_URL = (process.env.SITE_URL || "https://example.github.io/church-feed").replace(/\/+$/, "");
const FEED_TITLE = process.env.FEED_TITLE || "Church Announcements";
const FEED_DESCRIPTION = process.env.FEED_DESCRIPTION || "Latest announcements and posts.";
const FEED_LANGUAGE = process.env.FEED_LANGUAGE || "en";

const IMAGE_MIME = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".webp": "image/webp",
};

function escapeXml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function readPosts() {
  if (!fs.existsSync(POSTS_DIR)) return [];

  const files = fs
    .readdirSync(POSTS_DIR)
    .filter((f) => f.toLowerCase().endsWith(".md"));

  const posts = files.map((file) => {
    const raw = fs.readFileSync(path.join(POSTS_DIR, file), "utf8");
    const { data, content } = matter(raw);
    const slug = file.replace(/\.md$/i, "");

    const date = data.date ? new Date(data.date) : new Date();
    const imageUrl = data.image ? `${SITE_URL}/images/${data.image}` : null;

    return {
      slug,
      title: data.title || null,
      date: isNaN(date.getTime()) ? new Date() : date,
      link: data.link || null,
      image: data.image || null,
      imageUrl,
      body: content.trim(),
    };
  });

  return posts
    .filter(Boolean)
    .sort((a, b) => b.date - a.date);
}

function buildItemXml(post) {
  const htmlBody = marked.parse(post.body || "");
  const imageTag = post.imageUrl
    ? `<p><img src="${escapeXml(post.imageUrl)}" alt="${escapeXml(post.title || "")}" /></p>`
    : "";
  const descriptionHtml = `${imageTag}${htmlBody}`;

  const ext = post.image ? path.extname(post.image).toLowerCase() : null;
  const mime = ext && IMAGE_MIME[ext] ? IMAGE_MIME[ext] : null;

  const enclosure =
    post.imageUrl && mime
      ? `<enclosure url="${escapeXml(post.imageUrl)}" type="${mime}" length="0" />`
      : "";

  const titleTag = post.title ? `<title>${escapeXml(post.title)}</title>` : "";
  const linkTag = post.link ? `<link>${escapeXml(post.link)}</link>` : "";

  return `
    <item>
      ${titleTag}
      ${linkTag}
      <guid isPermaLink="false">${escapeXml(post.slug)}</guid>
      <pubDate>${post.date.toUTCString()}</pubDate>
      <description><![CDATA[${descriptionHtml}]]></description>
      ${enclosure}
    </item>`.trim();
}

function buildFeedXml(posts) {
  const items = posts.map(buildItemXml).join("\n    ");
  const lastBuildDate = new Date().toUTCString();

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(FEED_TITLE)}</title>
    <link>${escapeXml(SITE_URL)}</link>
    <description>${escapeXml(FEED_DESCRIPTION)}</description>
    <language>${escapeXml(FEED_LANGUAGE)}</language>
    <lastBuildDate>${lastBuildDate}</lastBuildDate>
    <atom:link href="${escapeXml(SITE_URL)}/feed.xml" rel="self" type="application/rss+xml" />
    ${items}
  </channel>
</rss>
`;
}

function main() {
  const posts = readPosts();
  const xml = buildFeedXml(posts);
  fs.writeFileSync(OUTPUT_FILE, xml, "utf8");
  console.log(`Wrote ${OUTPUT_FILE} with ${posts.length} post(s).`);
}

main();
