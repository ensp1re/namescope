<!-- aiviron:managed:start -->
# AI working environment for nametagged

This is the shared project harness for codex, claude. The user works normally in an AI coding application; agents operate the Aiviron lifecycle themselves. Do not ask the user to manually run task, plan, context, verification, checkpoint, or completion commands. Use `npx aiviron` internally and consult `npx aiviron --help` or `npx aiviron task --help` when command details are needed.

## Agent contract

For repository-changing work:

1. Convert the user's request into an objective and observable acceptance criteria.
2. Resume `.ai/state/current.json` when it represents the same unfinished task; otherwise start a task and record a focused plan.
3. Compile bounded context before inspecting implementation files. Treat its repository file list as a closed scope.
4. Do not inspect or edit files outside that scope. If another file is required, run `npx aiviron context add --file <path> --reason <why>` before using it.
5. Implement the plan, run `npx aiviron context check`, and capture relevant verification with `npx aiviron verify`.
6. Record completed criteria and plan steps. Complete only when the checks pass; otherwise leave a useful checkpoint for the next session or agent.

Reusable project knowledge lives in `docs/ai/` with provenance in `.ai/knowledge/manifest.json`. For documentation work, run `npx aiviron docs plan`, initialize missing files with `npx aiviron docs init`, compile source evidence with purpose `document`, and replace every `aiviron:authoring-needed` prompt with verified knowledge. Run `npx aiviron docs check` before completion. Preserve human-owned documents and expand the active task scope before changing knowledge files.

Keep one writing agent per worktree. Persist objective progress, decisions, failures, evidence, and bounded next actions—not private reasoning, transcripts, authentication, or previous permissions.

Local indexes, context packets, receipts, and mutable task state live in `.ai/state/` and are excluded from Git. Stable environment files and project knowledge may be committed so every agent discovers the same project contract.
<!-- aiviron:managed:end -->
