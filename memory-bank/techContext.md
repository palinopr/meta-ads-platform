# Technical Context

## Session Management & Development Workflow
- **Session Startup Guide**: START_NEW_SESSION.md - Dynamic task discovery system
- **Rule Files**: .clinerules/.clinerules.md (XML rules) + .clinerules/rules.md (project rules)
- **Current Tasks**: Always check DEVELOPMENT_PLAN.md "Current Focus" section
- **Memory Bank Updates**: Required after any significant work or discovery

## Technologies Used

### Frontend Stack
- **Next.js 14**: App router, TypeScript, server components
- **React 18**: Hooks, context, functional components
- **Tailwind CSS**: Utility-first styling, responsive design
- **Shadcn/ui**: High-quality component library
- **Recharts**: Data visualization and chart components
- **Lucide React**: Consistent icon system

### Backend Infrastructure
- **Supabase**: PostgreSQL database with Edge Functions
- **Edge Functions**: TypeScript/Python serverless functions
- **Row Level Security**: Database-level security policies
- **Supabase Auth**: Authentication with OAuth providers

### API Integration
- **Facebook Marketing API v19.0**: Direct campaign data access
- **OAuth 2.0**: Facebook authentication for Meta API access
- **Real-time Data**: No caching, always fresh from Meta API

### Testing Infrastructure
- **Jest**: Testing framework with TypeScript support
- **React Testing Library**: Component testing utilities
- **@testing-library/jest-dom**: Custom Jest matchers
- **Recharts Mocking**: Established patterns for chart testing

## Development Setup

### Environment Configuration
```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://igeuyfuxezvvenxjfnnn.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Facebook/Meta  
FACEBOOK_APP_ID=1349075236218599
NEXT_PUBLIC_FACEBOOK_APP_ID=1349075236218599

# Authentication
NEXTAUTH_SECRET=ihtuAm6HBAOonQeYkO+FvjY8cxCABLSodMMUB8EqryI=
```

### Local Development Commands
```bash
# Frontend development
cd frontend
npm install
npm run dev        # Development server
npm run build      # Production build
npm run test       # Run test suite

# Testing
npm run test                    # Run all tests
npm run test -- --watch        # Watch mode
npm run test -- --coverage     # Coverage report
```

### Deployment Commands
```bash
# Standard deployment workflow (per .clinerules)
git add [files]
git commit -m "🚀 [Feature]: [Description]"
git push origin main
cd frontend && npx vercel --prod
```

## Technical Constraints

### Database Limitations
- **No Campaign Storage**: Must fetch directly from Meta API
- **RLS Policies**: All tables require user-based access control
- **Connection Limits**: Supabase connection pooling considerations

### Meta API Constraints
- **Rate Limiting**: 200 calls per hour per user per app
- **Token Expiration**: Facebook tokens expire, need refresh logic
- **Data Freshness**: Real-time calls for every request
- **Pagination**: Handle large account sets (200+ accounts)

### Performance Requirements
- **Dashboard Load**: < 2 seconds target
- **API Response**: < 500ms for Edge Functions
- **Bundle Size**: Optimise for fast initial load
- **Concurrent Users**: Support 100+ simultaneous users

## Dependencies & Versions

### Critical Frontend Dependencies
```json
{
  "@supabase/supabase-js": "^2.50.3",
  "@supabase/ssr": "^0.6.1", 
  "next": "14.2.5",
  "react": "^18",
  "tailwindcss": "^3.4.1",
  "recharts": "^2.10.4",
  "lucide-react": "^0.321.0"
}
```

### Testing Dependencies
```json
{
  "jest": "^29.7.0",
  "@testing-library/react": "^14.1.2",
  "@testing-library/jest-dom": "^6.1.6",
  "@types/jest": "^29.5.11",
  "jest-environment-jsdom": "^29.7.0"
}
```

### Development Dependencies
```json
{
  "typescript": "^5",
  "@types/node": "^20",
  "@types/react": "^18",
  "eslint": "^8",
  "eslint-config-next": "14.2.5"
}
```

## Tool Usage Patterns

### Testing Workflow
1. **Component Development**: Build component with proper TypeScript types
2. **Test Creation**: Use established Recharts mocking patterns
3. **Test Execution**: `npm run test` for validation
4. **Coverage Check**: Ensure comprehensive test coverage
5. **Deployment**: Follow .clinerules git workflow

### API Development Workflow
1. **Edge Function Creation**: TypeScript serverless functions
2. **Meta API Integration**: Direct API calls with error handling
3. **Response Formatting**: Consistent JSON response structure
4. **Deployment**: Supabase CLI deployment
5. **Testing**: Integration testing via frontend

### Component Development Workflow
1. **Shadcn/ui Base**: Start with established component patterns
2. **TypeScript Types**: Proper interface definitions
3. **Recharts Integration**: Use established chart patterns
4. **Testing**: Comprehensive test suite creation
5. **Documentation**: Update relevant memory bank files

### Database Schema Management
1. **Migration Creation**: SQL files in supabase/migrations/
2. **RLS Policies**: Always implement user-based access control
3. **Type Generation**: Update database.types.ts after schema changes
4. **Testing**: Verify policies in Supabase dashboard

## Performance Optimisation

### Frontend Optimisation
- **Code Splitting**: Next.js automatic route-based splitting
- **Image Optimisation**: Next.js Image component
- **Bundle Analysis**: Regular bundle size monitoring
- **Lazy Loading**: Component-level lazy loading where appropriate

### API Optimisation
- **Direct API Calls**: Eliminate database bottlenecks
- **Efficient Queries**: Minimal Meta API call overhead
- **Error Handling**: Graceful degradation for API failures
- **Caching Strategy**: Browser-level caching only, no server-side cache

### Database Optimisation
- **Minimal Storage**: Only essential data in database
- **Efficient Queries**: Optimised RLS policies
- **Connection Management**: Proper connection pooling
- **Index Strategy**: Appropriate indexes for user queries
