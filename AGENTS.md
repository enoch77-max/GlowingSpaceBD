# Project Instructions: GlowingSpaceBD

## Automated Zip Ingestion & Repository Sync Protocol
Whenever the user provides a path to a `.zip` file, drops a new archive, or asks to update/sync the project (even in a new conversation or session):
1. **Unpack & Merge**:
   - Extract the entire contents of the `.zip` archive into this project workspace.
   - Preserve existing local image assets under `public/img/` so product photos remain intact.
   - Remove any conflicting, obsolete framework files if the project architecture was upgraded or refactored.
2. **Git Tracking & Zero Exclusions**:
   - Do NOT add anything to `.gitignore` or create a `.gitignore` that hides project files.
   - Stage every file, directory, and asset with full folder hierarchy preserved.
3. **Commit & Push**:
   - Commit all additions, changes, and removals with a concise descriptive message.
   - Push directly to `main` on the remote repository: `https://github.com/enoch77-max/GlowingSpaceBD.git`.
4. **Report Back to User**:
   - Confirm the extract and push completed in simple, everyday English.
   - Return the clean repository link for the user's next Arena chat.
