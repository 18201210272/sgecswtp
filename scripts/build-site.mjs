import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const contentDir = path.join(root, "content", "posts");
const postsDir = path.join(root, "posts");
const siteDir = path.join(root, "_site");
const sitePostsDir = path.join(siteDir, "posts");

fs.mkdirSync(postsDir, { recursive: true });
fs.rmSync(siteDir, { recursive: true, force: true });
fs.mkdirSync(sitePostsDir, { recursive: true });

const month = new Intl.DateTimeFormat("en", { month: "short", timeZone: "UTC" });

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function slugify(value) {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/[^\p{Letter}\p{Number}]+/gu, "-")
    .replace(/^-+|-+$/g, "");
}

function parseFrontMatter(source, filePath) {
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) {
    throw new Error(`${filePath} is missing YAML-style front matter.`);
  }

  const data = {};
  for (const line of match[1].split(/\r?\n/)) {
    if (!line.trim() || line.trim().startsWith("#")) continue;
    const separator = line.indexOf(":");
    if (separator === -1) continue;
    const key = line.slice(0, separator).trim();
    const raw = line.slice(separator + 1).trim();
    data[key] = raw.replace(/^["']|["']$/g, "");
  }

  return { data, body: match[2].trim() };
}

function inlineMarkdown(text) {
  let out = escapeHtml(text);
  out = out.replace(/`([^`]+)`/g, "<code>$1</code>");
  out = out.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  out = out.replace(/\*([^*]+)\*/g, "<em>$1</em>");
  out = out.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
  return out;
}

function markdownToHtml(markdown) {
  const lines = markdown.split(/\r?\n/);
  const html = [];
  let paragraph = [];
  let list = [];
  let inCode = false;
  let code = [];

  function flushParagraph() {
    if (!paragraph.length) return;
    html.push(`<p>${inlineMarkdown(paragraph.join(" "))}</p>`);
    paragraph = [];
  }

  function flushList() {
    if (!list.length) return;
    html.push(`<ul>${list.map((item) => `<li>${inlineMarkdown(item)}</li>`).join("")}</ul>`);
    list = [];
  }

  for (const line of lines) {
    if (line.trim().startsWith("```")) {
      if (inCode) {
        html.push(`<pre><code>${escapeHtml(code.join("\n"))}</code></pre>`);
        code = [];
        inCode = false;
      } else {
        flushParagraph();
        flushList();
        inCode = true;
      }
      continue;
    }

    if (inCode) {
      code.push(line);
      continue;
    }

    if (!line.trim()) {
      flushParagraph();
      flushList();
      continue;
    }

    const heading = line.match(/^(#{1,3})\s+(.+)$/);
    if (heading) {
      flushParagraph();
      flushList();
      const level = heading[1].length + 1;
      html.push(`<h${level}>${inlineMarkdown(heading[2])}</h${level}>`);
      continue;
    }

    const bullet = line.match(/^[-*]\s+(.+)$/);
    if (bullet) {
      flushParagraph();
      list.push(bullet[1]);
      continue;
    }

    const quote = line.match(/^>\s+(.+)$/);
    if (quote) {
      flushParagraph();
      flushList();
      html.push(`<blockquote>${inlineMarkdown(quote[1])}</blockquote>`);
      continue;
    }

    paragraph.push(line.trim());
  }

  flushParagraph();
  flushList();
  return html.join("\n");
}

function readPosts() {
  if (!fs.existsSync(contentDir)) return [];
  return fs
    .readdirSync(contentDir)
    .filter((name) => name.endsWith(".md"))
    .map((name) => {
      const filePath = path.join(contentDir, name);
      const source = fs.readFileSync(filePath, "utf8");
      const { data, body } = parseFrontMatter(source, filePath);
      const date = data.date;
      if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        throw new Error(`${name} needs date: YYYY-MM-DD`);
      }
      if (!data.title) throw new Error(`${name} needs title`);
      if (!data.category) throw new Error(`${name} needs category`);

      const slug = data.slug || slugify(path.basename(name, ".md"));
      const dateObj = new Date(`${date}T00:00:00Z`);
      const year = dateObj.getUTCFullYear();
      const displayDate = `${month.format(dateObj)} ${String(dateObj.getUTCDate()).padStart(2, "0")}`;
      const keywords = [year, displayDate, data.title, data.category, data.summary, data.keywords]
        .filter(Boolean)
        .join(" ");

      return {
        title: data.title,
        date,
        year,
        displayDate,
        category: data.category,
        summary: data.summary || "",
        keywords,
        slug,
        source: name,
        body,
        href: `posts/${slug}.html`,
      };
    })
    .sort((a, b) => b.date.localeCompare(a.date));
}

const css = `
      :root {
        --paper: #fbfaf7;
        --ink: #000000;
        --soft-ink: #666666;
        --line: #d8d1c5;
        --hover: #f0ece4;
        --max: 860px;
      }
      * { box-sizing: border-box; }
      html { scroll-behavior: smooth; }
      body {
        margin: 0;
        background: var(--paper);
        color: var(--ink);
        font-family: "Bree Serif", KaiTi, STKaiti, SimSun, serif;
      }
      a { color: inherit; text-decoration: none; }
      .page { width: min(var(--max), calc(100% - 40px)); margin: 0 auto; padding: 42px 0 80px; }
      .site-header {
        display: grid;
        grid-template-columns: 1fr auto;
        align-items: start;
        gap: 28px;
        border-bottom: 2px solid var(--ink);
        padding-bottom: 18px;
      }
      .brand {
        display: inline-block;
        font-family: "Bungee Shade", "Bree Serif", serif;
        font-size: clamp(36px, 7vw, 76px);
        line-height: 0.9;
        letter-spacing: 0;
      }
      .motto { margin: 8px 0 0; color: var(--soft-ink); font-size: 18px; line-height: 1.7; }
      .mark { width: 76px; height: 76px; margin-top: 6px; }
      .identity-card { display: flex; flex-direction: column; align-items: center; gap: 10px; margin-top: 6px; }
      .identity-card .mark { margin-top: 0; }
      .wtp-badge {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-width: 162px;
        height: 34px;
        border: 2px solid var(--ink);
        border-radius: 4px;
        background: #ffffff;
        padding: 0 12px;
        font-size: 15px;
        font-weight: 700;
        white-space: nowrap;
      }
      .wtp-code { font-family: "Bree Serif", serif; }
      .wtp-dash { margin: 0 4px; }
      .wtp-name { font-family: KaiTi, STKaiti, SimSun, serif; }
      .toolbar { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; margin: 28px 0 38px; }
      .search {
        flex: 1 1 260px;
        min-width: 0;
        height: 38px;
        border: 2px solid var(--ink);
        border-radius: 4px;
        background: #ffffff;
        color: var(--ink);
        padding: 0 12px;
        font: 17px "Bree Serif", KaiTi, STKaiti, serif;
      }
      .filter {
        height: 38px;
        border: 2px solid var(--ink);
        border-radius: 4px;
        background: #ffffff;
        color: var(--ink);
        padding: 0 16px;
        font: 700 15px "Bree Serif", KaiTi, STKaiti, serif;
        cursor: pointer;
      }
      .filter[aria-pressed="true"], .filter:hover, .search:focus { background: var(--hover); outline: none; }
      .year-section { margin: 0 0 32px; }
      .year { margin: 0 0 18px; font-size: 36px; line-height: 1; }
      .note-row {
        display: grid;
        grid-template-columns: 120px minmax(0, 1fr) 112px;
        gap: 16px;
        align-items: center;
        min-height: 42px;
        padding: 5px 0;
        border-bottom: 1px solid transparent;
      }
      .note-row:hover { border-bottom-color: var(--line); }
      .date { font-size: 18px; font-weight: 700; white-space: nowrap; }
      .title { font-size: 21px; line-height: 1.45; }
      .title small { color: var(--soft-ink); font-size: 0.78em; }
      .tag {
        justify-self: end;
        min-width: 96px;
        border: 2px solid var(--ink);
        border-radius: 4px;
        background: #ffffff;
        padding: 3px 12px 4px;
        text-align: center;
        font-size: 15px;
        font-weight: 700;
      }
      .empty { display: none; margin: 36px 0; color: var(--soft-ink); font-size: 20px; }
      .article-meta { margin: 32px 0 18px; color: var(--soft-ink); font-size: 17px; }
      .article-title { margin: 26px 0 12px; font-size: clamp(36px, 6vw, 64px); line-height: 1.08; }
      .article-summary { color: var(--soft-ink); font-size: 20px; line-height: 1.8; }
      .article-body { margin-top: 34px; font-size: 21px; line-height: 2; }
      .article-body h2, .article-body h3, .article-body h4 { margin: 34px 0 12px; line-height: 1.35; }
      .article-body p, .article-body ul, .article-body blockquote, .article-body pre { margin: 0 0 20px; }
      .article-body ul { padding-left: 1.35em; }
      .article-body blockquote { border-left: 4px solid var(--ink); padding-left: 18px; color: var(--soft-ink); }
      .article-body code { background: #ffffff; border: 1px solid var(--line); padding: 1px 5px; border-radius: 3px; }
      .article-body pre { background: #ffffff; border: 2px solid var(--ink); border-radius: 4px; padding: 16px; overflow: auto; line-height: 1.6; }
      .back-link { display: inline-block; margin-top: 38px; border: 2px solid var(--ink); border-radius: 4px; background: #ffffff; padding: 6px 14px 8px; font-weight: 700; }
      .site-footer { margin-top: 54px; border-top: 2px solid var(--ink); padding-top: 18px; color: var(--soft-ink); font-size: 16px; line-height: 1.8; }
      @media (max-width: 680px) {
        .page { width: min(100% - 28px, var(--max)); padding-top: 28px; }
        .site-header { grid-template-columns: 1fr; }
        .mark { width: 58px; height: 58px; }
        .identity-card { align-items: flex-start; }
        .note-row { grid-template-columns: 74px minmax(0, 1fr); gap: 10px; align-items: start; padding: 10px 0; }
        .date { font-size: 16px; }
        .title { font-size: 19px; }
        .tag { grid-column: 2; justify-self: start; min-width: 78px; font-size: 14px; }
        .article-body { font-size: 19px; }
      }
`;

function head(title, description) {
  return `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeHtml(description)}" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Bree+Serif&family=Bungee+Shade&display=swap" rel="stylesheet" />
    <style>${css}</style>
  </head>`;
}

function header(prefix = "") {
  return `<header class="site-header">
        <div>
          <a class="brand" href="${prefix}index.html">WORK LIFE NOTES</a>
          <p class="motto">把工作写成方法，把生活写成证据。</p>
        </div>
        <div class="identity-card" aria-label="WTP-静能生慧标识">
          <img class="mark" src="${prefix}assets/notebook-mark.svg" alt="" />
          <div class="wtp-badge" aria-hidden="true">
            <span class="wtp-code">WTP</span>
            <span class="wtp-dash">-</span>
            <span class="wtp-name">静能生慧</span>
          </div>
        </div>
      </header>`;
}

function indexPage(posts) {
  const categories = [...new Set(posts.map((post) => post.category))];
  const byYear = new Map();
  for (const post of posts) {
    if (!byYear.has(post.year)) byYear.set(post.year, []);
    byYear.get(post.year).push(post);
  }

  const filters = ["全部", ...categories]
    .map((category, index) => {
      const filter = index === 0 ? "all" : category;
      return `<button class="filter" type="button" data-filter="${escapeHtml(filter)}" aria-pressed="${index === 0}">${escapeHtml(category)}</button>`;
    })
    .join("\n        ");

  const sections = [...byYear.entries()]
    .map(([year, yearPosts]) => {
      const rows = yearPosts
        .map(
          (post) => `<article class="note-row" data-category="${escapeHtml(post.category)}" data-search="${escapeHtml(post.keywords)}">
          <time class="date">${escapeHtml(post.displayDate)}</time>
          <a class="title" href="${escapeHtml(post.href)}">${escapeHtml(post.title)}${post.summary ? ` <small>${escapeHtml(post.summary)}</small>` : ""}</a>
          <span class="tag">${escapeHtml(post.category)}</span>
        </article>`,
        )
        .join("\n        ");
      return `<section class="year-section" data-year="${year}">
        <h1 class="year">${year}</h1>
        ${rows}
      </section>`;
    })
    .join("\n\n      ");

  return `${head("Work Life Notes", "一个用于记录工作、生活、读书和复盘体会的个人归档网页。")}
  <body>
    <main class="page">
      ${header()}

      <nav class="toolbar" aria-label="文章筛选">
        <input class="search" id="search" type="search" placeholder="搜索标题、关键词或年份" />
        ${filters}
      </nav>

      ${sections}

      <p class="empty" id="empty">没有匹配的记录。</p>

      <footer class="site-footer">
        文章来源：<code>content/posts/*.md</code>。写完 Markdown 后运行 <code>npm run build</code> 更新网页。
      </footer>
    </main>

    <script>
      const search = document.querySelector("#search");
      const filters = Array.from(document.querySelectorAll(".filter"));
      const rows = Array.from(document.querySelectorAll(".note-row"));
      const sections = Array.from(document.querySelectorAll(".year-section"));
      const empty = document.querySelector("#empty");
      let active = "all";

      function applyFilters() {
        const term = search.value.trim().toLowerCase();
        let visibleCount = 0;
        rows.forEach((row) => {
          const categoryMatch = active === "all" || row.dataset.category === active;
          const searchMatch = !term || row.dataset.search.toLowerCase().includes(term);
          const visible = categoryMatch && searchMatch;
          row.hidden = !visible;
          if (visible) visibleCount += 1;
        });
        sections.forEach((section) => {
          const hasVisibleRows = Array.from(section.querySelectorAll(".note-row")).some((row) => !row.hidden);
          section.hidden = !hasVisibleRows;
        });
        empty.style.display = visibleCount === 0 ? "block" : "none";
      }
      filters.forEach((button) => {
        button.addEventListener("click", () => {
          active = button.dataset.filter;
          filters.forEach((item) => item.setAttribute("aria-pressed", String(item === button)));
          applyFilters();
        });
      });
      search.addEventListener("input", applyFilters);
    </script>
  </body>
</html>
`;
}

function articlePage(post) {
  return `${head(`${post.title} - Work Life Notes`, post.summary || post.title)}
  <body>
    <main class="page">
      ${header("../")}
      <div class="article-meta">${escapeHtml(post.displayDate)} · ${escapeHtml(post.category)}</div>
      <h1 class="article-title">${escapeHtml(post.title)}</h1>
      ${post.summary ? `<p class="article-summary">${escapeHtml(post.summary)}</p>` : ""}
      <article class="article-body">
${markdownToHtml(post.body)}
      </article>
      <a class="back-link" href="../index.html">返回首页</a>
    </main>
  </body>
</html>
`;
}

const posts = readPosts();
if (!posts.length) {
  throw new Error("No markdown posts found in content/posts.");
}

function copyDir(from, to) {
  if (!fs.existsSync(from)) return;
  fs.mkdirSync(to, { recursive: true });
  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    const source = path.join(from, entry.name);
    const target = path.join(to, entry.name);
    if (entry.isDirectory()) copyDir(source, target);
    else fs.copyFileSync(source, target);
  }
}

for (const post of posts) {
  const html = articlePage(post);
  fs.writeFileSync(path.join(postsDir, `${post.slug}.html`), html, "utf8");
  fs.writeFileSync(path.join(sitePostsDir, `${post.slug}.html`), html, "utf8");
}
const indexHtml = indexPage(posts);
fs.writeFileSync(path.join(root, "index.html"), indexHtml, "utf8");
fs.writeFileSync(path.join(siteDir, "index.html"), indexHtml, "utf8");
copyDir(path.join(root, "assets"), path.join(siteDir, "assets"));
for (const file of ["CNAME", ".nojekyll"]) {
  const source = path.join(root, file);
  if (fs.existsSync(source)) fs.copyFileSync(source, path.join(siteDir, file));
}
console.log(`Built ${posts.length} posts.`);
