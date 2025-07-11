# Meta Ads Platform - Cline Rules

This file contains the comprehensive rules and guidelines for Cline AI assistant when working on the Meta Ads Agency Platform project.

## 🎯 Project-Specific Rules

### Agency Platform Guidelines
1. **Multi-Tenant First**: Every feature must consider multi-agency data isolation
2. **Direct API Pattern**: NEVER cache campaign data in database - always fetch from Meta API
3. **Security by Default**: All endpoints must have authentication and RLS policies
4. **British English**: Use British spelling throughout (e.g., "colour", "organisation", "authorisation")
5. **Dark Theme**: All new UI components must support dark theme from the start

### Tech Stack Requirements
- **Frontend**: Next.js 14 App Router, TypeScript (strict mode), Tailwind CSS, Shadcn/ui
- **Backend**: Supabase Edge Functions only (no traditional backend)
- **Database**: PostgreSQL with Row Level Security enabled on all tables
- **Testing**: Jest for unit tests, minimum 80% coverage on business logic

## 🚨 Critical Rules (From sams-main-clinerules.xml)

### CRITICAL PRINCIPLES
1. **Simplicity First** (Priority 1): Favour concise solutions that are straightforward and easy to understand
2. **Use Tools** (Priority 2): Prioritise using available tools over manual approaches
3. **Best Practices** (Priority 3): Follow language-specific best practices
4. **Verify Changes** (Priority 4): Verify all changes before stating a task is completed
5. **Context Management** (Priority 5): Start new task when context window exceeds 75% capacity
6. **British English** (Priority 6): Always use British English spelling in all outputs

### CODING RULES
- **CS001**: Avoid mock/placeholder code - implement actual functionality
- **CS002**: Ensure proper indentation and formatting in all code
- **CS003**: Complete testing and documentation after primary implementation
- **CS004**: Consolidate multiple edits to the same file into single operations
- **CS005**: Write tests first when you know the expected behaviour
- **CS006**: Variables should have sensible defaults but be configurable
- **CS007**: Split files over 800 lines into smaller modules
- **CS008**: Update development plan after completing milestones
- **CS009**: Do not include time estimates in development plans

### TESTING REQUIREMENTS
- **TEST001**: Create and run unit tests for all new features
- **TEST002**: Run existing test suite before marking task complete
- **TEST003**: Fix all failing tests before marking task complete

### GIT RULES
- **EH001**: For merge conflicts, copy file sideways, edit, then copy back
- **EH002**: NEVER perform git commit or git push operations

## 📋 Context Window Management

### MANDATORY MONITORING
When context window usage exceeds 75%:
1. Complete current logical step
2. Use `ask_followup_question` tool to offer creating a new task
3. Use `new_task` tool with comprehensive handoff instructions

### Task Handoff Requirements
When creating a new task, MUST include:
- **Project Context**: Overall goal, architectural decisions, tech stack
- **Implementation Details**: Files modified, functions created, patterns followed
- **Progress Tracking**: Checklist of completed/remaining items
- **User Preferences**: Coding style, specific approaches, priorities

## 🏗️ Meta Ads Platform Architecture Rules

### Database Constraints
1. **NEVER store campaign data** - Always fetch from Meta API
2. **Always use RLS** - Every table must have Row Level Security policies
3. **Agency isolation** - Use JWT claims for agency context
4. **Soft deletes** - Maintain audit trail, never hard delete

### API Design
1. **Edge Functions only** - No traditional backend services
2. **Stateless design** - For horizontal scaling
3. **Rate limiting** - Implement for all Meta API calls
4. **Error handling** - Always return user-friendly error messages

### Frontend Patterns
```typescript
// Component structure pattern
export interface ComponentProps {
  // Props with JSDoc comments
}

export function Component({ prop1, prop2 }: ComponentProps) {
  // Hooks at top
  // Early returns for edge cases
  // Main render
}

// Error handling pattern
try {
  const result = await riskyOperation()
  return { data: result, error: null }
} catch (error) {
  logger.error('Operation failed', { error, context })
  return { data: null, error: 'User-friendly message' }
}
```

## 🔐 Security Rules

### Authentication & Authorisation
1. **JWT with agency claims** - Include agency_id and role in JWT
2. **Middleware pattern** - Consistent authorisation across all routes
3. **Permission matrix** - Owner > Manager > Viewer
4. **API protection** - Every endpoint must check permissions

### Data Security
1. **Encrypt tokens** - Meta API tokens encrypted at rest
2. **Audit logging** - Log all data access and modifications
3. **Input validation** - Validate all inputs with Zod/Joi
4. **SQL injection** - Use parameterised queries only

## 🧪 Testing Requirements

### Test Coverage
- Unit Tests: 80% minimum coverage
- Integration Tests: All API endpoints
- E2E Tests: Critical user journeys
- Performance Tests: Before each release

### Test Patterns
```typescript
describe('Feature', () => {
  beforeEach(() => {
    // Setup
  })

  it('should handle happy path', async () => {
    // Arrange
    // Act  
    // Assert
  })

  it('should handle error case', async () => {
    // Test error scenarios
  })
})
```

## 📊 Performance Requirements

### Targets
- Initial page load: < 2s (3G network)
- Time to Interactive: < 3s
- API response time: < 200ms (p95)
- Database query time: < 50ms (p95)

### Optimisation Rules
1. **Code splitting** - Dynamic imports for heavy components
2. **Virtual scrolling** - For lists with 100+ items
3. **Image optimisation** - WebP format, lazy loading
4. **Caching strategy** - Smart TTL based on data type

## 🚀 Development Workflow

### Phase Implementation
1. Always check DEVELOPMENT_PLAN.md for current phase
2. Update checklist items as completed
3. Follow phase dependencies - don't skip ahead
4. Test each phase thoroughly before moving on

### Code Review Checklist
- [ ] TypeScript strict mode compliance
- [ ] RLS policies implemented
- [ ] Tests written and passing
- [ ] Error handling implemented
- [ ] Loading states added
- [ ] Dark theme supported
- [ ] British English spelling
- [ ] Documentation updated

## 🛑 Never Do These

1. ❌ **NEVER store campaign data in database**
2. ❌ **NEVER expose Meta API tokens to frontend**
3. ❌ **NEVER allow cross-agency data access**
4. ❌ **NEVER skip authorization checks**
5. ❌ **NEVER use synchronous blocking operations**
6. ❌ **NEVER commit or push to git**
7. ❌ **NEVER use American spelling**
8. ❌ **NEVER create files over 800 lines**

## 📝 Documentation Requirements

### Code Comments
- Use JSDoc for all exported functions
- Explain complex logic inline
- Document API endpoints with examples
- Add TODO comments with ticket references

### File Headers
```typescript
/**
 * @file ComponentName.tsx
 * @description Brief description of component purpose
 * @author Cline AI
 * @created 2024-01-11
 */
```

## 🔄 Task Completion Checklist

Before marking any task complete:
1. ✅ All tests passing
2. ✅ Code follows project conventions
3. ✅ TypeScript has no errors
4. ✅ British English spelling verified
5. ✅ Development plan updated
6. ✅ Documentation complete
7. ✅ Performance targets met
8. ✅ Security requirements satisfied

---

**Remember**: These rules ensure consistency, security, and quality across the Meta Ads Agency Platform. Always refer back to this file when making architectural decisions or implementing new features.