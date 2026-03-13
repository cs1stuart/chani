# GitHub Push Guide - ChatVia

GitHub par code push karne ka complete tareeka (large files ki wajah se push fail ho raha tha).

---

## Step 1: Terminal kholo

Cursor mein `Ctrl + `` (backtick) dabao ya **Terminal → New Terminal** se kholo.

---

## Step 2: Project folder mein jao

```powershell
cd c:\webDev\chatvia
```

---

## Step 3: Git se large folders hatao

Ye commands run karo – **files delete nahi hongi**, sirf Git tracking se hataayengi:

```powershell
git rm -r --cached frontend/dist
```

```powershell
git rm -r --cached backend/uploads
```

Agar koi error aaye (jaise "path not found"), us command ko skip karo aur next chalao.

---

## Step 4: Changes stage karo

```powershell
git add .
```

---

## Step 5: Commit karo

```powershell
git commit -m "Remove dist and uploads from tracking"
```

---

## Step 6: Push karo

```powershell
git push origin feature/call-logs
```

---

## Agar ab bhi push fail ho (history mein large files hon)

Agar upar wale steps ke baad bhi same error aaye, matlab purane commits mein ye files hain. Tab **Option B** use karo:

### Option B: Clean branch banao

```powershell
# 1. main branch par jao
git checkout main

# 2. Latest main pull karo
git pull origin main

# 3. Naya branch banao
git checkout -b feature/call-logs-clean

# 4. Apne purane branch se SIRF source code copy karo (dist/uploads ke bina)
git checkout feature/call-logs -- .
git rm -r --cached frontend/dist
git rm -r --cached backend/uploads
git add .
git commit -m "Feature: call logs, login celebration, light theme"

# 5. Push karo
git push origin feature/call-logs-clean
```

Agar `main` nahi hai, `master` use karo:
```powershell
git checkout master
git pull origin master
```

---

## Option C: BFG / git filter-repo (advanced)

Agar tumhein purana commit history preserve karni hai (saari history saaf karke push karni hai):

1. **git-filter-repo** install karo: https://github.com/newren/git-filter-repo
2. Phir ye command:
   ```powershell
   git filter-repo --path frontend/dist --invert-paths
   git filter-repo --path backend/uploads --invert-paths
   ```
3. Force push: `git push --force origin feature/call-logs`

---

## Summary – ek line mein

**Sabse simple tareeka:** Step 3 → 4 → 5 → 6 follow karo. Agar phir bhi fail ho, **Option B** use karo.

---

## Aage ke liye

- `frontend/dist` – Electron build output, build karne par khud ban jata hai
- `backend/uploads` – User uploaded files, repo mein nahi honi chahiye

Ye dono `.gitignore` mein add kar diye gaye hain taake aage se add na hon.
