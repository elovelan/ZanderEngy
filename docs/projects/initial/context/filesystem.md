# Filesystem Structure Reference

The file layer is lean — only permanent knowledge:

```text
.engy/
  workspace.yaml              # repos, config, workspace metadata
  system/                     # living source of truth (current state)
    overview.md               # the map — links to all sections
    features/                 # BDD-style behavior docs
      authentication.md
      task-management.md
      notifications.md
    technical/                # architecture and infrastructure
      api.md
      database.md
      deployment.md
  specs/                      # pre-project thinking (proposed changes)
    initial/                  # vision spec — foundational reference, never becomes a project
      spec.md
      context/
        brainstorm.md
        review.md
    1_storage-layer/          # status: Active (project exists in SQLite)
      spec.md                 # references initial/ for context
      context/
        ...
    2_workspace-model/        # status: Draft
      spec.md                 # references initial/ for context
      context/
        ...
    3_interaction-model/      # status: Draft
      spec.md                 # references initial/ for context
      context/
        ...
  docs/                       # org knowledge (conventions, guides)
    coding-conventions.md
    api-style-guide.md
  memory/                     # promoted workspace + repo memories
    M500-jwt-rotation-pattern.md
    M501-api-error-convention.md
    M502-shared-lib-testing-pattern.md
```

No project directories. No task files. No archived project trees. The execution layer lives in SQLite, does its job, and gets cleaned up. The knowledge layer in `.engy/` stays small, focused, and meaningful.
