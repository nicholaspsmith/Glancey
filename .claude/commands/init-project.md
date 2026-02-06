---
name: init-project
description: Initialize glancey in this project - sets up CLAUDE.md, post-commit hook, and /glancey command
---

Run the `init_project` tool now to set up glancey in this project. This will:

1. Create or update **CLAUDE.md** with glancey usage instructions
2. Install a **post-commit hook** that warns when commits bypass the `commit` tool
3. Add a **/glancey slash command** for quick reminders to use glancey tools
