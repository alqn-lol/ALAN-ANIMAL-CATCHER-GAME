# Alan Egg Catcher

Standalone browser mini-game extracted into its own project folder.

## What It Is
- A complete mini-game in plain HTML/CSS/JavaScript
- Catch normal and golden eggs for points
- Avoid rotten eggs (they reduce score and lives)
- 60-second timed run

## Run It
Option 1 (quickest):
- Double-click `index.html`

Option 2 (local server via Python):
```powershell
cd alan-egg-catcher
python -m http.server 4173
```
Then open http://localhost:4173

## Controls
- Move left: Left Arrow or A
- Move right: Right Arrow or D

## Project Files
- `index.html`
- `src/styles.css`
- `src/game.js`

## Publish This Folder To Its Own Repo
From inside this folder:
```powershell
git init
git add .
git commit -m "Initial standalone mini-game"
```
Then create an empty repo on GitHub and run:
```powershell
git branch -M main
git remote add origin <YOUR_GITHUB_REPO_URL>
git push -u origin main
```
