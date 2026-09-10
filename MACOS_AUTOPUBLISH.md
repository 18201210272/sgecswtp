# macOS：Obsidian 自动发布

文章源目录：

`/Users/taotao/Documents/Obsidian Vault-2026年7月15日/02-写作研究/01-发布文章`

## 发布规则

- 目录中的 `.md` 文件会同步到网站并自动发布。
- 文件名以 `未命名` 或 `Untitled` 开头时不会发布。
- Front matter 中设置 `draft: true` 时不会发布，并会从网站文章源中移除。
- 保存文章后等待 60 秒；期间没有继续修改，才会开始构建并推送。
- 网络或 GitHub 暂时不可用时，每 5 分钟自动重试。

## 常用命令

```bash
npm run obsidian:sync
npm run obsidian:publish
npm run obsidian:watch
npm run obsidian:auto-install
npm run obsidian:auto-remove
```

自动发布日志：

`~/Library/Logs/sgecswtp-site/autopublish.log`

错误日志：

`~/Library/Logs/sgecswtp-site/autopublish-error.log`

如需临时保留文章但不公开，在文章开头的 Front matter 中加入：

```yaml
draft: true
```
