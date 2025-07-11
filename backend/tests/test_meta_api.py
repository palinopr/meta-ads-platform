"""
Comprehensive test suite for Meta API service
Ensures 90%+ test coverage for backend functionality
"""

import pytest
import asyncio
import json
from unittest.mock import Mock, patch, AsyncMock
from fastapi.testclient import TestClient
from fastapi import HTTPException

from services.meta_api import MetaAPIService
from api.meta import router
from main import app

# Test fixtures
@pytest.fixture
def meta_api_service():
    """Create a MetaAPIService instance for testing"""
    return MetaAPIService(access_token="test_token_123")

@pytest.fixture
def client():
    """Create a test client for the FastAPI app"""
    return TestClient(app)

@pytest.fixture
def mock_meta_response():
    """Mock response from Meta API"""
    return {
        "data": [
            {
                "id": "123456789",
                "name": "Test Campaign",
                "status": "ACTIVE",
                "objective": "CONVERSIONS",
                "daily_budget": "5000",
                "created_time": "2024-01-01T00:00:00+0000"
            }
        ],
        "paging": {
            "cursors": {
                "before": "before_cursor",
                "after": "after_cursor"
            }
        }
    }

@pytest.fixture
def mock_insights_response():
    """Mock insights response from Meta API"""
    return {
        "data": [
            {
                "date_start": "2024-01-01",
                "date_stop": "2024-01-01",
                "impressions": "1000",
                "clicks": "50",
                "spend": "25.50",
                "ctr": "5.0",
                "cpc": "0.51",
                "actions": [
                    {
                        "action_type": "purchase",
                        "value": "10"
                    }
                ],
                "action_values": [
                    {
                        "action_type": "purchase",
                        "value": "255.00"
                    }
                ]
            }
        ]
    }

class TestMetaAPIService:
    """Test suite for MetaAPIService class"""
    
    def test_initialization(self):
        """Test MetaAPIService initialization"""
        service = MetaAPIService(access_token="test_token")
        assert service.access_token == "test_token"
        assert service.app_id is not None
        assert service.app_secret is not None
    
    def test_initialization_without_token(self):
        """Test MetaAPIService initialization without token"""
        with patch.dict('os.environ', {'META_ACCESS_TOKEN': 'env_token'}):
            service = MetaAPIService()
            assert service.access_token == "env_token"
    
    @patch('services.meta_api.requests.get')
    def test_get_ad_accounts_success(self, mock_get, meta_api_service, mock_meta_response):
        """Test successful ad accounts retrieval"""
        mock_get.return_value.status_code = 200
        mock_get.return_value.json.return_value = mock_meta_response
        
        result = meta_api_service.get_ad_accounts()
        
        assert result['success'] is True
        assert len(result['data']) == 1
        assert result['data'][0]['id'] == "123456789"
        mock_get.assert_called_once()
    
    @patch('services.meta_api.requests.get')
    def test_get_ad_accounts_api_error(self, mock_get, meta_api_service):
        """Test ad accounts retrieval with API error"""
        mock_get.return_value.status_code = 400
        mock_get.return_value.json.return_value = {
            "error": {
                "message": "Invalid access token",
                "code": 190
            }
        }
        
        result = meta_api_service.get_ad_accounts()
        
        assert result['success'] is False
        assert 'Invalid access token' in result['error']
    
    @patch('services.meta_api.requests.get')
    def test_get_campaigns_success(self, mock_get, meta_api_service, mock_meta_response):
        """Test successful campaigns retrieval"""
        mock_get.return_value.status_code = 200
        mock_get.return_value.json.return_value = mock_meta_response
        
        result = meta_api_service.get_campaigns("123456789")
        
        assert result['success'] is True
        assert len(result['data']) == 1
        assert result['data'][0]['name'] == "Test Campaign"
    
    @patch('services.meta_api.requests.get')
    def test_get_campaigns_with_pagination(self, mock_get, meta_api_service):
        """Test campaigns retrieval with pagination"""
        # First page
        first_response = {
            "data": [{"id": "1", "name": "Campaign 1"}],
            "paging": {"next": "next_url", "cursors": {"after": "cursor1"}}
        }
        # Second page
        second_response = {
            "data": [{"id": "2", "name": "Campaign 2"}],
            "paging": {"cursors": {"after": "cursor2"}}
        }
        
        mock_get.side_effect = [
            Mock(status_code=200, json=lambda: first_response),
            Mock(status_code=200, json=lambda: second_response)
        ]
        
        result = meta_api_service.get_campaigns("123456789", limit=1)
        
        assert result['success'] is True
        assert len(result['data']) == 2
        assert mock_get.call_count == 2
    
    @patch('services.meta_api.requests.get')
    def test_get_campaign_insights_success(self, mock_get, meta_api_service, mock_insights_response):
        """Test successful campaign insights retrieval"""
        mock_get.return_value.status_code = 200
        mock_get.return_value.json.return_value = mock_insights_response
        
        result = meta_api_service.get_campaign_insights("123456789")
        
        assert result['success'] is True
        assert len(result['data']) == 1
        assert result['data'][0]['impressions'] == "1000"
        assert result['data'][0]['spend'] == "25.50"
    
    @patch('services.meta_api.requests.get')
    def test_get_campaign_insights_with_date_range(self, mock_get, meta_api_service, mock_insights_response):
        """Test campaign insights with custom date range"""
        mock_get.return_value.status_code = 200
        mock_get.return_value.json.return_value = mock_insights_response
        
        result = meta_api_service.get_campaign_insights(
            "123456789",
            date_range={'since': '2024-01-01', 'until': '2024-01-31'}
        )
        
        assert result['success'] is True
        # Verify that date range parameters were included in the request
        call_args = mock_get.call_args
        assert 'time_range' in call_args[1]['params']
    
    @patch('services.meta_api.requests.get')
    def test_rate_limiting_handling(self, mock_get, meta_api_service):
        """Test handling of rate limiting responses"""
        mock_get.return_value.status_code = 429
        mock_get.return_value.headers = {'X-App-Usage': '{"call_count": 100, "total_cputime": 100, "total_time": 100}'}
        mock_get.return_value.json.return_value = {
            "error": {
                "message": "Application request limit reached",
                "code": 4
            }
        }
        
        result = meta_api_service.get_ad_accounts()
        
        assert result['success'] is False
        assert 'rate limit' in result['error'].lower()
    
    def test_invalid_access_token(self):
        """Test behavior with invalid access token"""
        service = MetaAPIService(access_token="")
        
        with pytest.raises(ValueError, match="Access token is required"):
            service.get_ad_accounts()
    
    @patch('services.meta_api.requests.get')
    def test_network_timeout_handling(self, mock_get, meta_api_service):
        """Test handling of network timeouts"""
        import requests
        mock_get.side_effect = requests.Timeout("Request timed out")
        
        result = meta_api_service.get_ad_accounts()
        
        assert result['success'] is False
        assert 'timeout' in result['error'].lower()
    
    @patch('services.meta_api.requests.get')
    def test_connection_error_handling(self, mock_get, meta_api_service):
        """Test handling of connection errors"""
        import requests
        mock_get.side_effect = requests.ConnectionError("Connection failed")
        
        result = meta_api_service.get_ad_accounts()
        
        assert result['success'] is False
        assert 'connection' in result['error'].lower()

class TestMetaAPIEndpoints:
    """Test suite for Meta API endpoints"""
    
    @patch('api.meta.get_current_user')
    @patch('api.meta.MetaAPIService')
    def test_get_accounts_endpoint_success(self, mock_service_class, mock_get_user, client):
        """Test successful accounts endpoint"""
        # Mock user
        mock_user = Mock()
        mock_user.meta_access_token = "test_token"
        mock_get_user.return_value = mock_user
        
        # Mock service
        mock_service = Mock()
        mock_service.get_ad_accounts.return_value = {
            'success': True,
            'data': [{'id': '123', 'name': 'Test Account'}]
        }
        mock_service_class.return_value = mock_service
        
        response = client.get("/api/meta/accounts", headers={"Authorization": "Bearer test_token"})
        
        assert response.status_code == 200
        data = response.json()
        assert data['success'] is True
        assert len(data['data']) == 1
    
    @patch('api.meta.get_current_user')
    def test_get_accounts_no_token(self, mock_get_user, client):
        """Test accounts endpoint without Meta token"""
        mock_user = Mock()
        mock_user.meta_access_token = None
        mock_get_user.return_value = mock_user
        
        response = client.get("/api/meta/accounts", headers={"Authorization": "Bearer test_token"})
        
        assert response.status_code == 400
        assert "No Meta access token found" in response.json()['detail']
    
    @patch('api.meta.get_current_user')
    @patch('api.meta.MetaAPIService')
    def test_get_campaigns_endpoint_success(self, mock_service_class, mock_get_user, client):
        """Test successful campaigns endpoint"""
        mock_user = Mock()
        mock_user.meta_access_token = "test_token"
        mock_get_user.return_value = mock_user
        
        mock_service = Mock()
        mock_service.get_campaigns.return_value = {
            'success': True,
            'data': [{'id': '123', 'name': 'Test Campaign'}]
        }
        mock_service_class.return_value = mock_service
        
        response = client.get("/api/meta/campaigns/123456789", headers={"Authorization": "Bearer test_token"})
        
        assert response.status_code == 200
        data = response.json()
        assert data['success'] is True
    
    @patch('api.meta.get_current_user')
    @patch('api.meta.MetaAPIService')
    def test_get_insights_endpoint_success(self, mock_service_class, mock_get_user, client):
        """Test successful insights endpoint"""
        mock_user = Mock()
        mock_user.meta_access_token = "test_token"
        mock_get_user.return_value = mock_user
        
        mock_service = Mock()
        mock_service.get_campaign_insights.return_value = {
            'success': True,
            'data': [{'impressions': '1000', 'clicks': '50'}]
        }
        mock_service_class.return_value = mock_service
        
        response = client.get("/api/meta/insights/123456789", headers={"Authorization": "Bearer test_token"})
        
        assert response.status_code == 200
        data = response.json()
        assert data['success'] is True
    
    def test_unauthorized_access(self, client):
        """Test unauthorized access to protected endpoints"""
        response = client.get("/api/meta/accounts")
        
        assert response.status_code == 401

class TestDataValidation:
    """Test suite for data validation and transformation"""
    
    def test_campaign_data_transformation(self, meta_api_service):
        """Test campaign data transformation"""
        raw_data = {
            "id": "123456789",
            "name": "Test Campaign",
            "status": "ACTIVE",
            "daily_budget": "5000",
            "created_time": "2024-01-01T00:00:00+0000"
        }
        
        transformed = meta_api_service._transform_campaign_data(raw_data)
        
        assert transformed['id'] == "123456789"
        assert transformed['name'] == "Test Campaign"
        assert transformed['status'] == "ACTIVE"
        assert transformed['daily_budget'] == 50.00  # Converted from cents
    
    def test_insights_data_aggregation(self, meta_api_service):
        """Test insights data aggregation"""
        insights_data = [
            {
                "impressions": "1000",
                "clicks": "50",
                "spend": "25.50"
            },
            {
                "impressions": "2000",
                "clicks": "100",
                "spend": "50.00"
            }
        ]
        
        aggregated = meta_api_service._aggregate_insights(insights_data)
        
        assert aggregated['total_impressions'] == 3000
        assert aggregated['total_clicks'] == 150
        assert aggregated['total_spend'] == 75.50
        assert aggregated['average_ctr'] == 5.0  # (150/3000) * 100

class TestErrorHandling:
    """Test suite for error handling scenarios"""
    
    @patch('services.meta_api.requests.get')
    def test_malformed_json_response(self, mock_get, meta_api_service):
        """Test handling of malformed JSON responses"""
        mock_get.return_value.status_code = 200
        mock_get.return_value.json.side_effect = json.JSONDecodeError("Invalid JSON", "", 0)
        mock_get.return_value.text = "Invalid response"
        
        result = meta_api_service.get_ad_accounts()
        
        assert result['success'] is False
        assert 'json' in result['error'].lower()
    
    @patch('services.meta_api.requests.get')
    def test_unexpected_response_structure(self, mock_get, meta_api_service):
        """Test handling of unexpected response structure"""
        mock_get.return_value.status_code = 200
        mock_get.return_value.json.return_value = {"unexpected": "structure"}
        
        result = meta_api_service.get_ad_accounts()
        
        assert result['success'] is True
        assert result['data'] == []  # Should handle gracefully
    
    def test_invalid_account_id_format(self, meta_api_service):
        """Test validation of account ID format"""
        with pytest.raises(ValueError, match="Invalid account ID format"):
            meta_api_service.get_campaigns("invalid_id")

class TestPerformanceOptimization:
    """Test suite for performance optimization features"""
    
    @patch('services.meta_api.requests.get')
    def test_batch_request_optimization(self, mock_get, meta_api_service):
        """Test batch request optimization"""
        mock_get.return_value.status_code = 200
        mock_get.return_value.json.return_value = {"data": []}
        
        account_ids = ["123", "456", "789"]
        result = meta_api_service.get_batch_insights(account_ids)
        
        # Should make fewer API calls than individual requests
        assert mock_get.call_count <= len(account_ids)
        assert result['success'] is True
    
    @patch('services.meta_api.time.sleep')
    @patch('services.meta_api.requests.get')
    def test_retry_mechanism(self, mock_get, mock_sleep, meta_api_service):
        """Test retry mechanism for failed requests"""
        # First call fails, second succeeds
        mock_get.side_effect = [
            Mock(status_code=500, json=lambda: {"error": "Server error"}),
            Mock(status_code=200, json=lambda: {"data": []})
        ]
        
        result = meta_api_service.get_ad_accounts()
        
        assert result['success'] is True
        assert mock_get.call_count == 2
        mock_sleep.assert_called_once()

# Integration tests
class TestIntegration:
    """Integration test suite"""
    
    @pytest.mark.integration
    @pytest.mark.skipif(not pytest.config.getoption("--integration"), reason="Integration tests disabled")
    def test_real_meta_api_connection(self):
        """Test real Meta API connection (requires valid token)"""
        import os
        token = os.getenv('META_TEST_TOKEN')
        
        if not token:
            pytest.skip("META_TEST_TOKEN not set")
        
        service = MetaAPIService(access_token=token)
        result = service.get_ad_accounts()
        
        assert result['success'] is True
        assert 'data' in result

# Async tests
class TestAsyncOperations:
    """Test suite for async operations"""
    
    @pytest.mark.asyncio
    async def test_async_batch_processing(self, meta_api_service):
        """Test async batch processing of multiple accounts"""
        with patch.object(meta_api_service, '_async_get_account_data', new_callable=AsyncMock) as mock_async:
            mock_async.return_value = {"success": True, "data": []}
            
            account_ids = ["123", "456", "789"]
            results = await meta_api_service.async_get_multiple_accounts(account_ids)
            
            assert len(results) == 3
            assert mock_async.call_count == 3

# Performance benchmarks
class TestPerformance:
    """Performance benchmark tests"""
    
    @pytest.mark.benchmark
    def test_campaign_parsing_performance(self, benchmark, meta_api_service):
        """Benchmark campaign data parsing performance"""
        large_dataset = [
            {
                "id": f"campaign_{i}",
                "name": f"Campaign {i}",
                "status": "ACTIVE",
                "daily_budget": "5000"
            }
            for i in range(1000)
        ]
        
        def parse_campaigns():
            return meta_api_service._transform_campaigns_batch(large_dataset)
        
        result = benchmark(parse_campaigns)
        assert len(result) == 1000

if __name__ == "__main__":
    pytest.main(["-v", "--cov=services", "--cov=api", "--cov-report=html"])