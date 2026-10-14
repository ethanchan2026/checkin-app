# React + TypeScript + Vite

## 部署与邮件提醒

构建命令为 `npm run build`，静态资源在 `dist`。Vercel 应从 GitHub 仓库部署，保留根目录 `api/send-reminder.ts`；仅上传 `dist` 不包含邮件接口。

Vercel 服务端环境变量：`SUPABASE_URL`、`SUPABASE_ANON_KEY`、`RESEND_API_KEY`、`SENDER_EMAIL`。发件邮箱必须属于 Resend 已验证域名，密钥不得使用 `VITE_` 前缀。修改环境变量后重新部署。

新资料提醒通过 `/api/send-reminder` 验证 Supabase 登录及资料归属后，只发送给已验证的当前用户邮箱。Resend 在 24 小时内按资料编号去重。反馈建议是唯一使用 EmailJS 的邮件。

每日提醒继续由 GitHub Actions 每小时执行 `scripts/daily-reminder.js`，需配置仓库 Secrets：`SUPABASE_URL`、`SUPABASE_SERVICE_ROLE_KEY`、`RESEND_API_KEY`、`SENDER_EMAIL`。这些 Secrets 与 Vercel 环境变量需分别配置。提醒按用户时区的整点小时触发，不保证精确到分钟；已提前完成的关卡不会再次提醒。同一邮箱同一天的重复发送由 Resend 去重。

日历显示到考试日期（未设置时显示未来 21 天）。当天完成至少 3 项并上传图片后可提前完成未来关卡，普通打卡 20 XP，提前打卡 50 XP。资料编辑支持标题、科目、图片、复习/补打卡类型、次数和星标；保留既有复习历史。

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend enabling type-aware lint rules by installing `oxlint-tsgolint` and editing `.oxlintrc.json`:

```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "plugins": ["react", "typescript", "oxc"],
  "options": {
    "typeAware": true
  },
  "rules": {
    "react/rules-of-hooks": "error",
    "react/only-export-components": ["warn", { "allowConstantExport": true }]
  }
}
```

See the [Oxlint rules documentation](https://oxc.rs/docs/guide/usage/linter/rules) for the full list of rules and categories.
