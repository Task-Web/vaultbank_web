# Quick Start Guide for Future Agents

## Your Mission

Continue building the VaultBank Banking Clone by implementing features from `feature_list.json`. This is a multi-session autonomous development process.

## Immediate Actions (Start Here)

### 1. Setup Environment (First Time)
```bash
./init.sh
```

This will:
- Install all dependencies
- Start backend and frontend servers
- Display access URLs

### 2. Verify Everything Works
- Backend: http://localhost:8000
- Frontend: http://localhost:5173
- API Docs: http://localhost:8000/docs
- State UI: http://localhost:8000/state-manage

### 3. Start Implementing Features

Open `feature_list.json` and work through features IN ORDER:
1. Find the first feature with `"passes": false`
2. Implement it
3. Test it thoroughly
4. Change `"passes": false` to `"passes": true`
5. Commit your progress
6. Move to next feature

## Critical Rules

### ✅ DO:
- Work on ONE feature at a time
- Test thoroughly before marking as passing
- Commit often with descriptive messages
- Follow the existing code structure
- Use Chakra UI components
- Match VaultBank banking visual design
- Test state persistence across sessions

### ❌ DON'T:
- Remove features from feature_list.json
- Edit feature descriptions or steps
- Skip testing
- Implement multiple features at once
- Forget to commit progress
- Break the /state-manage route (it's required!)

## Feature Priority Order

Features in `feature_list.json` are organized by development phases:

### Phase 1: Foundation (Features 1-40)
- Setup and navigation
- State management
- Basic layout structure
- Dashboard

### Phase 2: Core Banking (Features 41-120)
- Account details
- Transfers
- Bill pay
- Credit cards
- Transaction management

### Phase 3: Advanced Features (Features 121-170)
- Loans
- Investments
- Statements
- Security features

### Phase 4: Polish & Style (Features 171-202)
- Visual design verification
- Responsive design
- Micro-interactions
- Final testing

## Key Technology Details

### Frontend Stack
- React 18 with React Router v6
- Chakra UI (custom VaultBank theme)
- Tailwind CSS for utilities
- Vite for building

### Backend Stack
- Python 3.11+ with FastAPI
- Cookie-scoped in-memory state
- REST API + convenience endpoints
- MCP at `/mcp`

### Design System
```javascript
// VaultBank Blue Theme
primary: '#00539F'
primaryDark: '#003B6E'
primaryLight: '#E6F0F9'
success: '#38A169'
error: '#E53E3E'

// Typography
font: 'Inter, sans-serif'
```

## State Management

The app uses cookie-scoped state. All data operations:

```javascript
// Read state
GET /api/state

// Merge into state (preferred for updates)
PATCH /api/state
{ "data": { "accounts": [...] } }

// Replace entire state
PUT /api/state
{ "data": {...}, "note": "reason" }

// Reset state
DELETE /api/state
```

## Required Routes

These routes MUST exist and be functional:
- `/` - Dashboard
- `/accounts/:id` - Account details
- `/transfers` - Transfer page
- `/bill-pay` - Bill pay center
- `/credit-cards` - Credit card management
- `/loans` - Loan management
- `/investments` - Investment accounts
- `/state-manage` - State management (REQUIRED - never remove!)

## Commit Message Format

```bash
# For single features
git commit -m "Implement [feature description]"

# For multiple related features
git commit -m "Implement [feature group]
- Feature 1
- Feature 2
- Feature 3"

# Always include attribution
🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
```

## Testing Checklist

Before marking a feature as passing:
- [ ] Feature works as described
- [ ] No console errors
- [ ] State updates correctly
- [ ] UI looks good (VaultBank-style)
- [ ] Works on refresh (state persists)
- [ ] Tested with user cookie

## When Your Session Ends

1. Commit all work
2. Update `claude-progress.txt` with:
   - What you implemented
   - Current status
   - Any issues encountered
3. Leave environment in clean state
4. Next agent will continue from where you left off

## Quick Reference Commands

```bash
# Start/stop services
./init.sh          # Start
./init.sh stop     # Stop

# Git operations
git status         # Check status
git add .          # Stage changes
git commit -m "msg" # Commit
git log --oneline  # View history

# Backend (if running manually)
cd backend
source venv/bin/activate
uvicorn app.main:app --reload

# Frontend (if running manually)
cd frontend
npm run dev
```

## Common Issues

### Services already running
```bash
./init.sh
# Will show status and URLs without restarting
```

### Need fresh start
```bash
./init.sh stop
./init.sh
```

### State not persisting
- Check browser cookies for `user_id`
- Verify backend is setting cookies correctly
- Check CORS configuration

### Port conflicts
- Backend uses 8000
- Frontend uses 5173
- Kill processes with: `lsof -ti :PORT | xargs kill`

## Success Criteria

You're done when ALL features in `feature_list.json` have `"passes": true`

At that point:
- All 202 features work end-to-end
- UI matches VaultBank banking visual design
- State persists correctly
- No console errors
- MCP tools work
- /state-manage is functional

## Need Help?

Check these files:
- `feature_list.json` - Your task list
- `API.md` - API documentation
- `STATE.md` - State structure reference
- `claude-progress.txt` - Previous agent notes
- `/state-manage` - Live state inspector

---

**Remember**: Quality over speed. Production-ready is the goal. 🚀
