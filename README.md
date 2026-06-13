# WTP - 静能生慧

个人工作生活体会归档页，部署目标域名：

```text
sgecswtp.top
```

## 写文章

最简单的日常流程：

```powershell
cd "D:\Nutstore\0.2026年-代办工作\work-life-reflections-promo\website"
npm run new:post -- -Title "文章标题" -Category "工作" -Summary "首页副标题" -Open
```

写完后发布：

```powershell
npm run publish
```

`publish` 会自动执行：生成网页、提交 git、推送 GitHub。GitHub Pages 会在推送后自动更新。

文章放在：

```text
content/posts/
```

每篇文章都是一个 Markdown 文件，开头必须有这段信息：

```markdown
---
title: 文章标题
date: 2026-06-13
category: 工作
summary: 首页副标题，可留空
keywords: 搜索关键词
---

这里写正文。
```

新建文章可以运行：

```powershell
npm run new -- "文章标题"
```

更推荐使用新版命令，因为可以直接指定分类和摘要：

```powershell
npm run new:post -- -Title "文章标题" -Category "读书" -Summary "一句话摘要" -Keywords "关键词1 关键词2" -Open
```

生成网站：

```powershell
npm run build
```

## Obsidian 工作流

推荐把 Obsidian 文章目录作为写作入口：

```text
D:\Nutstore\Obsidian Vault\posts
```

网站实际读取的是这个目录：

```text
D:\Nutstore\0.2026年-代办工作\work-life-reflections-promo\website\content\posts
```

注意：不要同步 `website\posts`。这个目录是自动生成的 HTML 页面，不是文章源文件。

第一次使用时，把网站现有文章复制到 Obsidian：

```powershell
npm run obsidian:init
```

之后在 Obsidian 写完文章后，回到网站目录运行：

```powershell
npm run obsidian:publish
```

这个命令会自动完成：

1. 从 Obsidian 复制新增或修改过的 `.md` 文章
2. 重新生成网站 HTML
3. 提交并推送到 GitHub

如果只想同步和本地生成，不发布：

```powershell
npm run obsidian:sync
```

同步脚本不会自动删除任何一边的文件，避免误删文章。需要删除文章时，请同时删除 Obsidian `posts` 和网站目录 `content/posts/` 里的同名 Markdown，再运行 `npm run publish`。

## Codex 工作流

以后你可以直接对 Codex 说：

```text
帮我新增一篇文章，标题是《...》，分类是工作，内容如下：...
```

我会把它写到 `content/posts/`，运行 `npm run build`，再提交/推送。

## GitHub Pages

如果使用自动发布，推荐设置：

- Source: GitHub Actions
- Custom domain: `sgecswtp.top`

DNS 需要在域名服务商处添加：

```text
A     @     185.199.108.153
A     @     185.199.109.153
A     @     185.199.110.153
A     @     185.199.111.153
CNAME www   18201210272.github.io
```
