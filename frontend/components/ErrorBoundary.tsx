/**
 * ErrorBoundary Component for Meta Ads Platform
 * 
 * React error boundary that catches JavaScript errors anywhere in the component tree,
 * logs them to Sentry with business context, and displays a fallback UI.
 * 
 * Business Impact: Prevents complete application crashes from impacting users,
 * maintains user experience during errors, and provides comprehensive error reporting.
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { captureUserError } from '../sentry.client.config';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  page: string;
  feature?: string;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Update state with error info
    this.setState({
      errorInfo,
    });

    // Capture error in Sentry with business context
    captureUserError(error, {
      page: this.props.page,
      action: 'component_error',
      businessImpact: 'high',
      additionalContext: {
        feature: this.props.feature,
        componentStack: errorInfo.componentStack,
        errorBoundary: true,
        errorInfo: {
          componentStack: errorInfo.componentStack,
        },
      },
    });

    // Call optional onError callback
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Log to console for development
    if (process.env.NODE_ENV === 'development') {
      console.error('ErrorBoundary caught an error:', error);
      console.error('Error info:', errorInfo);
    }
  }

  handleRetry = () => {
    // Reset the error state to retry rendering
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  handleReload = () => {
    // Reload the page as a last resort
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      // Render custom fallback UI if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Render default error UI
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
          <Card className="max-w-md w-full">
            <CardHeader className="text-center">
              <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <CardTitle className="text-xl font-semibold text-gray-900">
                Something went wrong
              </CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <p className="text-gray-600">
                We're sorry, but something unexpected happened. Our team has been notified and is working to fix this issue.
              </p>
              
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <div className="bg-red-50 border border-red-200 rounded-md p-3 text-left">
                  <h4 className="font-medium text-red-800 mb-2">Error Details (Development Only)</h4>
                  <pre className="text-sm text-red-700 overflow-x-auto">
                    {this.state.error.message}
                  </pre>
                </div>
              )}
              
              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  onClick={this.handleRetry}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  Try Again
                </Button>
                <Button
                  onClick={this.handleReload}
                  className="flex items-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  Reload Page
                </Button>
              </div>
              
              <p className="text-sm text-gray-500">
                If this problem persists, please contact support with the error details.
              </p>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

// Higher-order component for wrapping components with error boundary
export const withErrorBoundary = <P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps: Omit<ErrorBoundaryProps, 'children'>
) => {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  );

  // Set display name for debugging
  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;

  return WrappedComponent;
};

// Specific error boundary for dashboard components
export const DashboardErrorBoundary: React.FC<{ children: ReactNode }> = ({ children }) => (
  <ErrorBoundary
    page="dashboard"
    feature="analytics"
    fallback={
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center gap-2 text-red-800">
          <AlertTriangle className="w-5 h-5" />
          <span className="font-medium">Dashboard Error</span>
        </div>
        <p className="text-red-700 mt-2">
          Unable to load dashboard content. Please refresh the page or try again later.
        </p>
      </div>
    }
  >
    {children}
  </ErrorBoundary>
);

// Specific error boundary for campaign components
export const CampaignErrorBoundary: React.FC<{ children: ReactNode }> = ({ children }) => (
  <ErrorBoundary
    page="campaigns"
    feature="campaign-management"
    fallback={
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center gap-2 text-red-800">
          <AlertTriangle className="w-5 h-5" />
          <span className="font-medium">Campaign Error</span>
        </div>
        <p className="text-red-700 mt-2">
          Unable to load campaign data. Please check your Meta connection or try again later.
        </p>
      </div>
    }
  >
    {children}
  </ErrorBoundary>
);

// Specific error boundary for settings components
export const SettingsErrorBoundary: React.FC<{ children: ReactNode }> = ({ children }) => (
  <ErrorBoundary
    page="settings"
    feature="account-settings"
    fallback={
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center gap-2 text-red-800">
          <AlertTriangle className="w-5 h-5" />
          <span className="font-medium">Settings Error</span>
        </div>
        <p className="text-red-700 mt-2">
          Unable to load settings. Please refresh the page or contact support if the problem persists.
        </p>
      </div>
    }
  >
    {children}
  </ErrorBoundary>
);