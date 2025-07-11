# Copy This When Starting a New Session

## Prompt to Use:

I'm working on the Meta Ads Agency Platform project. Please read the following files to understand the complete context:

**MANDATORY FILES TO READ (IN THIS ORDER)**:

1. **Project Rules & Guidelines**:
   - `/Users/jaimeortiz/Visual Studio/Meta Ads/meta-ads-platform/.clinerules/.clinerules.md` (XML rules - MUST FOLLOW)
   - `/Users/jaimeortiz/Visual Studio/Meta Ads/meta-ads-platform/.clinerules/rules.md` (Project-specific rules)

2. **Current Development Status**:
   - `/Users/jaimeortiz/Visual Studio/Meta Ads/meta-ads-platform/DEVELOPMENT_PLAN.md` (Check "Current Focus" section)
   - `/Users/jaimeortiz/Visual Studio/Meta Ads/meta-ads-platform/memory-bank/activeContext.md` (Latest work status)
   - `/Users/jaimeortiz/Visual Studio/Meta Ads/meta-ads-platform/memory-bank/progress.md` (What's completed)

3. **Project Context**:
   - `/Users/jaimeortiz/Visual Studio/Meta Ads/meta-ads-platform/CLAUDE.md` (Project overview)
   - `/Users/jaimeortiz/Visual Studio/Meta Ads/meta-ads-platform/memory-bank/projectbrief.md` (Core requirements)
   - `/Users/jaimeortiz/Visual Studio/Meta Ads/meta-ads-platform/memory-bank/systemPatterns.md` (Architecture)
   - `/Users/jaimeortiz/Visual Studio/Meta Ads/meta-ads-platform/memory-bank/techContext.md` (Tech stack)
   - `/Users/jaimeortiz/Visual Studio/Meta Ads/meta-ads-platform/memory-bank/productContext.md` (Business context)

**Quick Status Check**:
```bash
# Check current phase and tasks
cd /Users/jaimeortiz/Visual Studio/Meta Ads/meta-ads-platform
grep -A 30 "Current Focus" DEVELOPMENT_PLAN.md
cat memory-bank/activeContext.md | head -20

# Check what's next
grep -A 20 "Next Actions" memory-bank/progress.md
```

**CRITICAL RULES TO REMEMBER**:
1. Read `.clinerules/.clinerules.md` for mandatory rules (TEST001-004, CS001-009, etc.)
2. Read `.clinerules/rules.md` for Meta Ads specific rules (MA001-005, AC001-005, etc.)
3. Check DEVELOPMENT_PLAN.md for current phase checklist items
4. Update memory bank files after ANY significant work

Current task: [DESCRIBE WHAT YOU WANT TO DO]

Please acknowledge that you've:
1. Read the current phase from DEVELOPMENT_PLAN.md
2. Understood the rules from both .clinerules files
3. Checked the latest status in memory-bank/activeContext.md

---

# 🚀 DYNAMIC SESSION STARTUP - Meta Ads Platform

## ⚠️ THIS IS A REFERENCE GUIDE - ALWAYS READ THE ACTUAL FILES

### 📋 Dynamic Information Sources

**For Current Tasks**:
```bash
# ALWAYS check these for what to work on:
grep -A 50 "Current Focus" DEVELOPMENT_PLAN.md
grep -A 30 "CURRENT FOCUS" DEVELOPMENT_PLAN.md
grep -A 20 "Next Actions" memory-bank/progress.md
cat memory-bank/activeContext.md
```

**For Rules & Standards**:
```bash
# MANDATORY - These files contain the rules you MUST follow:
cat .clinerules/.clinerules.md    # XML format rules (CS001-009, TEST001-004, etc.)
cat .clinerules/rules.md          # Project-specific rules (Direct API, British English, etc.)
```

**For Project Context**:
```bash
# Understand the project:
cat CLAUDE.md                     # Overview and key decisions
cat memory-bank/projectbrief.md   # Core requirements
cat memory-bank/systemPatterns.md # Architecture patterns
```

### 🎯 How to Find Current Work Dynamically

1. **Check Development Plan**:
   ```bash
   # Find current phase
   grep -B5 -A50 "CURRENT FOCUS" DEVELOPMENT_PLAN.md
   
   # Find unchecked items in current phase
   grep -A100 "CURRENT FOCUS" DEVELOPMENT_PLAN.md | grep "\[ \]"
   ```

2. **Check Active Context**:
   ```bash
   # See what was just worked on
   cat memory-bank/activeContext.md | grep -A20 "Recent Changes"
   
   # See current status
   cat memory-bank/activeContext.md | grep -A10 "Current Work Status"
   ```

3. **Check Progress**:
   ```bash
   # See immediate next steps
   cat memory-bank/progress.md | grep -A20 "Next Actions"
   
   # See what's left to build
   cat memory-bank/progress.md | grep -A50 "What's Left"
   ```

### 🔍 Key Commands for Dynamic Discovery

```bash
# Find all TODO items in current phase
current_phase=$(grep -A1 "Current Focus" DEVELOPMENT_PLAN.md | tail -1 | cut -d: -f1)
grep -A200 "$current_phase" DEVELOPMENT_PLAN.md | grep "\[ \]" | head -20

# Check test status
cd frontend && npm test -- --listTests | wc -l

# Find latest changes
ls -lt memory-bank/*.md | head -5

# Search for specific rules
grep -n "NEVER" .clinerules/rules.md
grep -n "CRITICAL" .clinerules/.clinerules.md
```

### 📐 Critical Architectural Rules (Always Check Latest)

```bash
# Find Direct API pattern rules
grep -A5 "Direct API" .clinerules/rules.md
grep -A5 "NEVER store campaign" CLAUDE.md

# Find British English requirements
grep -i "british" .clinerules/rules.md

# Find testing requirements
grep "TEST00" .clinerules/.clinerules.md
```

### 🚨 Rule References (ALWAYS CHECK THE FILES)

**From `.clinerules/.clinerules.md`**:
- CRITICAL principles (priority 1-6)
- Coding rules (CS001-CS009)
- Testing requirements (TEST001-TEST004)
- Git rules (EH001-EH003)
- File operation rules (FO001-FO002)

**From `.clinerules/rules.md`**:
- Meta Ads specific (MA001-MA005)
- Architecture constraints (AC001-AC005)
- Database rules (DB001-DB004)
- API design (API001-API004)
- Security requirements (SEC001-SEC005)

### 📝 Memory Bank Update Triggers

```bash
# Check which files need updating
find memory-bank -name "*.md" -mtime +1 -exec echo "May need update: {}" \;

# Files to update based on work type:
# - activeContext.md → ALWAYS after any work
# - progress.md → After completing tasks
# - systemPatterns.md → New patterns/architecture
# - techContext.md → New tools/dependencies
# - projectbrief.md → Requirement changes
```

### 🎨 Dynamic UI Task Discovery

```bash
# Find UI-related tasks
grep -i "ui\|component\|design\|screenshot" DEVELOPMENT_PLAN.md | grep "\[ \]"

# Check current UI components
ls frontend/components/**/*.tsx | wc -l

# Find components needing work
grep -r "TODO\|FIXME" frontend/components/
```

### ⚡ Smart Session Start

```bash
#!/bin/bash
# Run this to get oriented quickly

echo "=== CURRENT PHASE ==="
grep -A3 "Current Focus" DEVELOPMENT_PLAN.md

echo -e "\n=== NEXT 5 TASKS ==="
grep -A100 "CURRENT FOCUS" DEVELOPMENT_PLAN.md | grep "\[ \]" | head -5

echo -e "\n=== RECENT CHANGES ==="
cat memory-bank/activeContext.md | grep -A10 "Recent Changes"

echo -e "\n=== CRITICAL RULES ==="
grep "CRITICAL\|NEVER" .clinerules/rules.md | head -10

echo -e "\n=== TEST STATUS ==="
cd frontend && npm test 2>&1 | grep -E "(PASS|FAIL|Test Suites)"
```

---

**REMEMBER**: This file is a GUIDE. Always read the actual referenced files for current information. The development plan, memory bank, and rules files contain the real-time truth about what needs to be done and how to do it.