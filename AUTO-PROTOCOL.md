# 🤖 AUTOMATED PROTOCOL - CEO REFERENCE SYSTEM

## 🚨 TRIGGER: "read mandatory CEO reference"

When this phrase is detected, AUTOMATICALLY execute the following protocol:

### 📋 STEP 1: Read Core Files (In Order)
1. **Read MANDATORY-CEO-REFERENCE.md** first
2. **Read CLAUDE.md** for project context
3. **Read PROGRESS-LOG.md** for completed work
4. **Read MOMENTUM-TRACKER.md** for current velocity
5. **Read KNOWN-ISSUES.md** for blockers
6. **Read all other .md files** in the project

### 📝 STEP 2: Auto-Generate TODO List

Create TODO list with these MANDATORY items:

```typescript
// Auto-generated TODO structure
[
  // From MANDATORY-CEO-REFERENCE.md
  { id: "1", content: "[Feature from CEO reference]", status: "pending", priority: "high" },
  { id: "2", content: "[Next feature from CEO reference]", status: "pending", priority: "high" },
  
  // Documentation Updates (ALWAYS INCLUDE)
  { id: "X", content: "Update PROGRESS-LOG.md with completed work", status: "pending", priority: "medium" },
  { id: "X", content: "Update MOMENTUM-TRACKER.md with velocity", status: "pending", priority: "medium" },
  { id: "X", content: "Update KNOWN-ISSUES.md if needed", status: "pending", priority: "low" },
  
  // Deployment Tasks (ALWAYS INCLUDE)
  { id: "Y", content: "Git commit with business impact message", status: "pending", priority: "high" },
  { id: "Y", content: "Git push to GitHub", status: "pending", priority: "high" },
  { id: "Y", content: "Deploy to Vercel production", status: "pending", priority: "high" },
  { id: "Y", content: "Verify deployment at production URL", status: "pending", priority: "high" }
]
```

### 🎯 STEP 3: Execution Pattern

1. **Start with highest priority CEO features**
2. **Update documentation as you complete features**
3. **ALWAYS end with deployment sequence**:
   ```bash
   git add -A
   git commit -m "🚀 [Feature]: [Description]
   
   Business Impact:
   💰 [Revenue impact]
   🏢 [Customer value]
   📈 [Growth metric]"
   
   git push origin main
   cd frontend && npx vercel --prod
   ```

### 📊 STEP 4: Success Metrics

After deployment, ALWAYS:
1. **Provide production URL**
2. **Confirm feature is live**
3. **Update all .md files**
4. **Show completed TODO list**

### 🔄 STEP 5: Continuous Loop

This protocol creates a continuous improvement cycle:
- Read CEO priorities → Build features → Deploy → Document → Repeat

## 💡 Example Trigger Response:

When user says "read mandatory CEO reference", assistant will:

```
"I'll now execute the automated CEO protocol:

1. ✅ Reading MANDATORY-CEO-REFERENCE.md...
2. ✅ Reading all project documentation...
3. ✅ Creating TODO list with features and deployment tasks...
4. 🚀 Starting with highest priority feature...

[TODO list appears with all items]
```

## 🚨 IMPORTANT RULES:

1. **NEVER skip the deployment steps**
2. **ALWAYS update documentation**
3. **ALWAYS show production URL after deployment**
4. **ALWAYS use business impact in commit messages**
5. **ALWAYS verify feature works in production**

## 🎯 Goal:

Create a seamless flow from CEO priority → Implementation → Production → Documentation, ensuring nothing is missed and everything is tracked.