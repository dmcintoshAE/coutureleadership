--------------------------------------------------------------------------------
# UNIVERSAL AGENT GOVERNANCE & EXECUTION DIRECTIVE
--------------------------------------------------------------------------------

1. OPERATING ENVIRONMENT & RUNTIME COMPLIANCE (WINDOWS / POWERSHELL)
- HOST OS: Windows (PowerShell / pwsh).
- SCRIPT EXECUTION POLICY: Never run raw shell scripts that can be blocked by execution policies.
  * Use `npm.cmd` instead of `npm.ps1` or bare `npm` for lifecycle scripts (e.g., `npm.cmd test`, `npm.cmd start`).
  * Never invoke `python` or bash pipe wrappers (e.g., `@' ... '@ | python -`) unless Python is verified to exist via `Get-Command python -ErrorAction SilentlyContinue`.
  * For string replacement and file authoring, use native PowerShell .NET methods:
    `[IO.File]::WriteAllText((Join-Path $PWD $path), $content, [Text.Encoding]::UTF8)`
    or Node.js built-ins (`fs.writeFileSync`).

2. AUTONOMOUS TASK COMPLETION (NO FALSE-PAUSE GATING)
- DO NOT halt, pause, or wait for human confirmation simply because an external design token file or style guide is not found on disk.
- If explicit hex codes, styling specifications, layout directions, or text copy are provided in the user's prompt or task instructions:
  * TREAT THEM AS AUTHORITATIVE GROUND TRUTH.
  * Apply them directly to the target source files (`style.css`, `index.html`, etc.) without asking the user to re-supply brand guidelines.
  * Do not roll back changes due to unverified visual steps; apply the changes, run tests, and report the status.

3. PERSISTENT BRAND & STACK IDENTITY (COUTURE LEADERSHIP™ SPECIFICATION)
- When working within the Couture Leadership™ repository:
  * Primary Brand Navy: #182B49 (Headings, primary CTA backgrounds, brand anchors)
  * Secondary Slate Grey: #465A78 (Subheadings, borders, structural elements)
  * Warm Gold Accent: #B8860B (Active states, key callouts, progress tracks, focus rings)
  * Background Canvas: #F9FBFD (Clean, high-end off-white)
  * Deep Body Ink: #0F172A (High-contrast typography)
  * Line / Surface Borders: #E2E8F0
- Target Distribution Directory: All client-facing assets live under `dist/public/` (served by `dist/index.js`).

4. WORKFLOW FOR PATCHING & RESTARTING
- Always run automated test suites (`npm.cmd test`) before declaring a task complete.
- Verify file content on disk by checking that target patterns exist before concluding execution.
- Maintain responsive, accessible (WCAG AA), and high-contrast styling standards across all interactive elements.
--------------------------------------------------------------------------------
