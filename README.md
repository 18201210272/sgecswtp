# WTP - 静能生慧

个人工作生活体会归档页，部署目标域名：

```text
sgecswtp.top
```

## 写文章

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

生成网站：

```powershell
npm run build
```

## Obsidian 工作流

把 Obsidian 的库目录指向这个网站仓库，或在 Obsidian 里打开 `content/posts/` 这个目录。写完 Markdown 后：

```powershell
npm run build
git add .
git commit -m "Update posts"
git push
```

如果你使用 Obsidian Git 插件，可以让它自动 commit/push。仓库里的 GitHub Actions 会在 `main` 分支更新后自动运行 `npm run build` 并发布 `_site/`。

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
