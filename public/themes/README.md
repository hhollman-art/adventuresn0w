# Theme art (AI-generated)

Place PNG files here after running:

```bash
npm run generate:theme-art
```

Requires `OPENAI_API_KEY` in `.env.local`. Each theme gets `{theme-id}-banner.png` and `{theme-id}-sign.png`.
The app falls back to SVG scenes when files are missing.
