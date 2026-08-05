<!-- aiviron:managed:start -->
## Shared Aiviron environment

This repository uses the project harness in `.ai/`. Claude must operate that harness automatically; the user should only need to describe work normally. Read `.ai/README.md` before repository-changing work.

If an active task exists, resume it when it matches the user's request, then compile its context for claude. For a new repository-changing request, internally create the task with objective and acceptance criteria, record a focused plan, and compile context before inspecting implementation files.

Treat compiled context as a closed scope. Inspect and edit only listed repository files. Expand deliberately with `npx aiviron context add --file <path> --reason <why>` before using another file. Before completion or handoff, check scope, run relevant verification, and persist criteria, plan progress, evidence, decisions, failures, and next actions.

For documentation tasks, use `aiviron docs plan|init|check` and context purpose `document`. Replace authoring prompts with verified knowledge and preserve human-owned docs. Never persist private reasoning, transcripts, authentication, or permissions.
<!-- aiviron:managed:end -->
