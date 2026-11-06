---
name: doc-capture
description: Use when a step-by-step guide with annotated screenshots must be made from a web app, or an existing guide must be refreshed after the UI changed. Drives a sandbox browser from a steps.json file, annotates each shot, and assembles Markdown. Sandbox sites only.
---

# Doc capture

Turns a list of steps into a guide with annotated screenshots. The list is a file, so you can run it again when the UI changes.

## Step 0: sandbox check (stop if any item fails)

1. The user named the site, and it is a sandbox or test site. Never a production or customer site.
2. You use `mcp__playwright-sandbox__*` tools, not `mcp__playwright__*`. The sandbox server keeps no logins.
3. You sign in only with a test account. Do not use SSO or real credentials. If a page asks for them, stop and tell the user.
4. Every URL you open has the host the user named, plus the hosts of the app inside that site (for a Forge app: `atlassian-dev.net` and the vendor's own host). Do not follow links to any other host.
5. Never print or save the page URL of an embedded app. It can carry session tokens. Read only the part before `?` or `#`.
6. Blur the signed-in user's name, email and avatar in every screenshot, and check the image. Do the same for assignee and leader columns.

## Browser size

Always capture at 1920x1080 (1080p). The `playwright-sandbox` server starts with that viewport. Before the first screenshot, check the size. If it is different, run `browser_resize` to 1920x1080. Do not resize in the middle of a guide, because boxes and layouts change between sizes.

## Step 1: write `steps.json`

Keep it next to the guide. One object per step:

```json
{
  "site": "https://sandbox.example.net",
  "steps": [
    {
      "id": "01-open-plans",
      "do": {"navigate": "https://sandbox.example.net/plans"},
      "blur": ["[\\w.]+@[\\w.]+"],
      "annotate": [{"box": {"text": "Create plan"}, "n": 1}, {"cursor": {"text": "Create plan"}}],
      "text": "Select **Create plan**."
    }
  ]
}
```

- `do` is one of `navigate`, `click`, `type`. `click` and `type` take the element from the page snapshot.
- Write `text` as one instruction per sentence, in the active voice. Match each badge number to one instruction.
- Do not put secrets in the file. Do not put real names or emails in `text`.

## Step 2: capture

For each step, in order:

1. Run `do`.
2. Run the `blur` and `annotate` calls with `browser_evaluate`. See the `screenshot-annotate` skill for the API.
3. Run `browser_take_screenshot` with `filename` set to `<id>.png`. Look at the image. The server refuses paths outside the working directory, so use a relative filename or a path inside it. Move the files to the guide folder afterward.
4. Run `__ann.clear()`.

If a step fails, fix `steps.json` and run only that step again.

## Step 3: assemble

Write `guide.md`: a heading, then each step as its `text` followed by `![](<id>.png)`.

- For a flow or a sequence, add a Mermaid diagram next to the text. Save it as `x.mmd` and render it with `mmdc -i x.mmd -o x.png -p pp.json`. Put `{"args":["--no-sandbox"]}` in `pp.json` when the machine has no user namespaces. Set `PUPPETEER_EXECUTABLE_PATH` to a Chromium if `mmdc` cannot find one.
- Publishing to Confluence is a separate step. Ask the user first, because the page is public to its readers.

## Step 4: refresh

When the UI changes, run Steps 0 to 3 again with the same `steps.json`. Compare the new images with the old ones and tell the user which steps changed.

## Rules

- The guide says what you saw. If a step did not run on the sandbox, write that in the guide.
- Do not add AI attribution to the guide or to commits in personal repos.
