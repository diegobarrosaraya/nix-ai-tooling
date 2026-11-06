---
name: screenshot-annotate
description: Use when a screenshot of a web page needs red boxes, numbered badges, arrows, a click cursor or blurred private text, in the style of Snagit. Works through the playwright-sandbox MCP server, so it is for sandbox sites only.
---

# Screenshot annotate

Draws annotations inside the page, then a normal screenshot captures them. No image editing step.

## Requirements

- Use the `playwright-sandbox` MCP server (tools named `mcp__playwright-sandbox__*`). It loads `window.__ann` into every page. The `playwright` server does not have it.
- Use sandbox sites only. If the site is not a sandbox, stop and ask.

## Steps

1. Open the page and put it in the state you want to show.
2. Run `browser_evaluate` with a function that calls `window.__ann`.
3. Run `browser_take_screenshot` with a `filename`.
4. Run `browser_evaluate` with `() => __ann.clear()` before the next step.

## API

A target is a CSS selector, `{text: "visible text"}`, or an element. Each call scrolls the target to the center of the view.

| Call | Result |
|------|--------|
| `__ann.box(target, {n: 1})` | Red rounded rectangle. `n` adds a numbered badge. |
| `__ann.arrow(target, {from: "top-left", len: 90})` | Arrow that points at the target. `from` is `top-left`, `top-right`, `bottom-left`, `bottom-right`, `left`, `right`, `top` or `bottom`. |
| `__ann.cursor(target)` | Pointer icon on the control to click. |
| `__ann.blur(selector)` | Blur every element that matches. Returns the count. |
| `__ann.blurText(regexSource)` | Blur only matching text, for example `"[\\w.]+@[\\w.]+"` for email addresses. Returns the count. |
| `__ann.rect(target)` | Position of the target, for `steps.json`. |
| `__ann.clear()` | Remove all annotations and undo all blur. |

Example:

```js
() => {
  __ann.blurText("[\\w.]+@[\\w.]+");
  __ann.box({text: "Create box"}, {n: 1});
  __ann.cursor({text: "Create box"});
}
```

## Rules

- Blur private text before you draw anything else, then check the screenshot. Do not rely on cropping.
- Use one badge number per instruction in the step text. Number from 1 on each screenshot.
- Use at most 3 annotations on a screenshot. More is hard to read.
- Check each screenshot by eye. If a box is on the wrong element, fix the target and take it again.

## Limits

- The overlay is fixed to the view. Use viewport screenshots only, not `fullPage`.
- A `{text}` target must match the full visible text of one element. For a truncated label, use `{text: "Run data", startsWith: true}`. If it still fails, use a CSS selector or pass an element.
- `window.__ann` exists in every frame, but each frame has its own copy. Run the calls inside the frame that holds the target. With `browser_evaluate`, set `target` to `iframe >> internal:control=enter-frame >> body` (repeat the `iframe >> internal:control=enter-frame >>` part once per level). With `browser_run_code_unsafe`, pick the frame from `page.frames()`. Match a frame by the start of its URL, because the main page URL can contain the app host in its query string.
- The overlay scrolls a target into view only when it is off screen. Scroll the page first, then draw all annotations, so nothing moves under a box you already drew.
- Move the mouse to a blank area before the screenshot. A hovered row or tooltip shows up in the image.
- Use `pad: 8` for text-only targets, so the box border does not cover the first letter.
