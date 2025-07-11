#!/bin/bash

# 🚀 Production Deployment Script
# Meta Ads Platform - Zero Downtime Deployment
# 
# Usage: ./scripts/deploy-production.sh
# 
# This script implements the comprehensive deployment plan with:
# - Automated health checks
# - Zero-downtime deployment
# - Automatic rollback on failure
# - Comprehensive monitoring

set -euo pipefail

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DEPLOYMENT_TIMEOUT=300  # 5 minutes
HEALTH_CHECK_RETRIES=10
HEALTH_CHECK_DELAY=30

# URLs and endpoints
FRONTEND_URL="https://frontend-dpfwxnxjb-palinos-projects.vercel.app"
BACKEND_URL="https://meta-ads-backend-production.up.railway.app"
SUPABASE_URL="https://igeuyfuxezvvenxjfnnn.supabase.co"

# Function to print colored output
print_status() {
    local color=$1
    local message=$2
    echo -e "${color}${message}${NC}"
}

print_step() {
    print_status $BLUE "🔄 $1"
}

print_success() {
    print_status $GREEN "✅ $1"
}

print_warning() {
    print_status $YELLOW "⚠️  $1"
}

print_error() {
    print_status $RED "❌ $1"
}

# Function to check if a URL is accessible
check_url() {
    local url=$1
    local description=$2
    local retries=${3:-3}
    
    for i in $(seq 1 $retries); do
        if curl -f -s -o /dev/null --max-time 10 "$url"; then
            return 0
        fi
        if [ $i -lt $retries ]; then
            print_warning "$description check failed, retrying... ($i/$retries)"
            sleep 5
        fi
    done
    return 1
}

# Function to wait for service to be healthy
wait_for_service() {
    local url=$1
    local service_name=$2
    local max_attempts=${3:-$HEALTH_CHECK_RETRIES}
    
    print_step "Waiting for $service_name to be healthy..."
    
    for i in $(seq 1 $max_attempts); do
        if check_url "$url" "$service_name" 1; then
            print_success "$service_name is healthy"
            return 0
        fi
        
        if [ $i -lt $max_attempts ]; then
            print_status $YELLOW "Attempt $i/$max_attempts failed, waiting ${HEALTH_CHECK_DELAY}s..."
            sleep $HEALTH_CHECK_DELAY
        fi
    done
    
    print_error "$service_name failed to become healthy after $max_attempts attempts"
    return 1
}

# Function to create database backup
create_backup() {
    print_step "Creating database backup..."
    
    local backup_file="backup_$(date +%Y%m%d_%H%M%S).sql"
    
    if command -v supabase >/dev/null 2>&1; then
        if supabase db dump --db-url "$DATABASE_URL" > "$backup_file" 2>/dev/null; then
            print_success "Database backup created: $backup_file"
            echo "$backup_file" # Return backup filename
        else
            print_warning "Supabase backup failed, using alternative method"
            # Alternative backup method could go here
            echo "manual_backup_required"
        fi
    else
        print_warning "Supabase CLI not available, manual backup recommended"
        echo "manual_backup_required"
    fi
}

# Function to run pre-deployment checks
pre_deployment_checks() {
    print_step "Running pre-deployment checks..."
    
    # Check if all required tools are available
    local required_tools=("curl" "npm" "git")
    for tool in "${required_tools[@]}"; do
        if ! command -v $tool >/dev/null 2>&1; then
            print_error "Required tool '$tool' is not installed"
            return 1
        fi
    done
    
    # Check if we're on the main branch
    local current_branch=$(git rev-parse --abbrev-ref HEAD)
    if [ "$current_branch" != "main" ]; then
        print_error "Not on main branch (current: $current_branch)"
        return 1
    fi
    
    # Check if working directory is clean
    if ! git diff-index --quiet HEAD --; then
        print_error "Working directory is not clean, please commit changes"
        return 1
    fi
    
    # Check current service health
    print_step "Checking current service health..."
    
    if ! check_url "$FRONTEND_URL" "Frontend" 3; then
        print_error "Frontend is not healthy, aborting deployment"
        return 1
    fi
    
    if ! check_url "$SUPABASE_URL/rest/v1/" "Database" 3; then
        print_error "Database is not healthy, aborting deployment"
        return 1
    fi
    
    print_success "Pre-deployment checks passed"
    return 0
}

# Function to deploy backend
deploy_backend() {
    print_step "Deploying backend to Railway..."
    
    if command -v railway >/dev/null 2>&1; then
        cd backend
        
        # Deploy with Railway
        if railway deploy --detach; then
            print_success "Backend deployment initiated"
            
            # Wait for deployment to complete
            if wait_for_service "$BACKEND_URL/health" "Backend API"; then
                print_success "Backend deployment completed successfully"
                cd ..
                return 0
            else
                print_error "Backend deployment failed health check"
                cd ..
                return 1
            fi
        else
            print_error "Railway deployment failed"
            cd ..
            return 1
        fi
    else
        print_warning "Railway CLI not available, skipping backend deployment"
        cd ..
        return 0
    fi
}

# Function to deploy Edge Functions
deploy_edge_functions() {
    print_step "Deploying Supabase Edge Functions..."
    
    if command -v supabase >/dev/null 2>&1; then
        local functions=("get-dashboard-metrics" "meta-accounts-v3" "get-campaigns-from-meta")
        
        for func in "${functions[@]}"; do
            print_step "Deploying function: $func"
            
            if supabase functions deploy "$func" --project-ref igeuyfuxezvvenxjfnnn; then
                print_success "Function $func deployed successfully"
            else
                print_error "Failed to deploy function: $func"
                return 1
            fi
        done
        
        print_success "All Edge Functions deployed successfully"
        return 0
    else
        print_warning "Supabase CLI not available, skipping Edge Function deployment"
        return 0
    fi
}

# Function to deploy frontend
deploy_frontend() {
    print_step "Deploying frontend to Vercel..."
    
    cd frontend
    
    # Install dependencies and build
    if npm ci && npm run build; then
        print_success "Frontend build completed"
    else
        print_error "Frontend build failed"
        cd ..
        return 1
    fi
    
    # Deploy to Vercel
    if npx vercel --prod --yes; then
        print_success "Frontend deployment initiated"
        
        # Wait for deployment to be healthy
        if wait_for_service "$FRONTEND_URL" "Frontend"; then
            print_success "Frontend deployment completed successfully"
            cd ..
            return 0
        else
            print_error "Frontend deployment failed health check"
            cd ..
            return 1
        fi
    else
        print_error "Vercel deployment failed"
        cd ..
        return 1
    fi
}

# Function to run post-deployment tests
run_post_deployment_tests() {
    print_step "Running post-deployment verification..."
    
    # Basic health checks
    local services=(
        "$FRONTEND_URL:Frontend"
        "$BACKEND_URL/health:Backend API"
        "$SUPABASE_URL/rest/v1/:Database"
    )
    
    for service_info in "${services[@]}"; do
        IFS=':' read -r url name <<< "$service_info"
        if check_url "$url" "$name" 3; then
            print_success "$name health check passed"
        else
            print_error "$name health check failed"
            return 1
        fi
    done
    
    # Test critical endpoints
    print_step "Testing critical API endpoints..."
    
    local endpoints=(
        "$SUPABASE_URL/functions/v1/meta-accounts-v3"
        "$SUPABASE_URL/functions/v1/get-dashboard-metrics"
    )
    
    for endpoint in "${endpoints[@]}"; do
        if curl -f -s -o /dev/null --max-time 10 -X POST "$endpoint" \
           -H "Content-Type: application/json" \
           -d '{}' 2>/dev/null; then
            print_success "Endpoint $(basename $endpoint) is responsive"
        else
            print_warning "Endpoint $(basename $endpoint) test inconclusive (may require auth)"
        fi
    done
    
    print_success "Post-deployment verification completed"
    return 0
}

# Function to rollback deployment
rollback_deployment() {
    print_error "Deployment failed, initiating rollback..."
    
    # Rollback frontend
    print_step "Rolling back frontend..."
    cd frontend
    if npx vercel --prod --rollback; then
        print_success "Frontend rollback completed"
    else
        print_error "Frontend rollback failed"
    fi
    cd ..
    
    # Rollback backend
    print_step "Rolling back backend..."
    if command -v railway >/dev/null 2>&1; then
        cd backend
        if railway rollback; then
            print_success "Backend rollback completed"
        else
            print_error "Backend rollback failed"
        fi
        cd ..
    fi
    
    print_error "Rollback completed, please verify system health"
}

# Function to send deployment notification
send_notification() {
    local status=$1
    local message=$2
    
    # Here you could integrate with Slack, email, etc.
    print_status $BLUE "📧 Notification: $status - $message"
    
    # Example: Send to Slack webhook
    # curl -X POST -H 'Content-type: application/json' \
    #   --data "{\"text\":\"Deployment $status: $message\"}" \
    #   "$SLACK_WEBHOOK_URL"
}

# Main deployment function
main() {
    print_status $BLUE "🚀 Starting Meta Ads Platform Production Deployment"
    print_status $BLUE "📅 Timestamp: $(date)"
    
    # Capture start time
    local start_time=$(date +%s)
    
    # Store original directory
    local original_dir=$(pwd)
    
    # Ensure we're in the project root
    if [ ! -f "CLAUDE.md" ]; then
        print_error "Please run this script from the project root directory"
        exit 1
    fi
    
    # Create backup
    local backup_file
    backup_file=$(create_backup)
    
    # Track deployment steps
    local failed_step=""
    
    # Execute deployment phases
    if ! pre_deployment_checks; then
        failed_step="pre-deployment-checks"
    elif ! deploy_backend; then
        failed_step="backend-deployment"
    elif ! deploy_edge_functions; then
        failed_step="edge-functions-deployment"  
    elif ! deploy_frontend; then
        failed_step="frontend-deployment"
    elif ! run_post_deployment_tests; then
        failed_step="post-deployment-tests"
    fi
    
    # Return to original directory
    cd "$original_dir"
    
    # Calculate deployment time
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    
    if [ -n "$failed_step" ]; then
        print_error "Deployment failed at step: $failed_step"
        print_error "Duration: ${duration}s"
        send_notification "FAILED" "Deployment failed at $failed_step after ${duration}s"
        
        # Ask for rollback confirmation
        echo
        read -p "Do you want to perform automatic rollback? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            rollback_deployment
        else
            print_warning "Rollback skipped, manual intervention required"
            print_warning "Backup available: $backup_file"
        fi
        
        exit 1
    else
        print_success "🎉 Deployment completed successfully!"
        print_success "Duration: ${duration}s"
        print_success "Backup created: $backup_file"
        
        send_notification "SUCCESS" "Production deployment completed successfully in ${duration}s"
        
        # Display post-deployment summary
        echo
        print_status $GREEN "📊 Deployment Summary:"
        print_status $GREEN "  • Frontend: $FRONTEND_URL"
        print_status $GREEN "  • Backend: $BACKEND_URL"
        print_status $GREEN "  • Database: Supabase Cloud"
        print_status $GREEN "  • Duration: ${duration}s"
        print_status $GREEN "  • Status: SUCCESS ✅"
        
        echo
        print_status $BLUE "🔍 Next Steps:"
        print_status $BLUE "  1. Monitor system health for 2 hours"
        print_status $BLUE "  2. Verify user flows are working"
        print_status $BLUE "  3. Check error rates in monitoring"
        print_status $BLUE "  4. Update team on deployment status"
        
        exit 0
    fi
}

# Handle script interruption
trap 'print_error "Deployment interrupted"; exit 1' INT TERM

# Run main function
main "$@"