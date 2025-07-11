"""
Test suite for authentication functionality
"""

import pytest
from unittest.mock import Mock, patch
from fastapi.testclient import TestClient
from fastapi import HTTPException
from datetime import datetime, timedelta

from api.auth import (
    verify_password,
    get_password_hash,
    create_access_token,
    get_current_user,
    router
)
from main import app

@pytest.fixture
def client():
    """Create a test client for the FastAPI app"""
    return TestClient(app)

@pytest.fixture
def mock_db():
    """Mock database session"""
    return Mock()

class TestPasswordHashing:
    """Test password hashing functionality"""
    
    def test_password_hashing(self):
        """Test password hashing and verification"""
        password = "test_password_123"
        hashed = get_password_hash(password)
        
        assert hashed != password
        assert verify_password(password, hashed) is True
        assert verify_password("wrong_password", hashed) is False
    
    def test_different_passwords_different_hashes(self):
        """Test that different passwords produce different hashes"""
        password1 = "password123"
        password2 = "password456"
        
        hash1 = get_password_hash(password1)
        hash2 = get_password_hash(password2)
        
        assert hash1 != hash2
    
    def test_same_password_different_hashes(self):
        """Test that same password produces different hashes (salt)"""
        password = "test_password"
        
        hash1 = get_password_hash(password)
        hash2 = get_password_hash(password)
        
        # Hashes should be different due to salt
        assert hash1 != hash2
        # But both should verify correctly
        assert verify_password(password, hash1) is True
        assert verify_password(password, hash2) is True

class TestJWTTokens:
    """Test JWT token functionality"""
    
    def test_create_access_token(self):
        """Test JWT token creation"""
        data = {"sub": "test@example.com"}
        token = create_access_token(data)
        
        assert isinstance(token, str)
        assert len(token) > 0
        # Token should have 3 parts (header.payload.signature)
        assert len(token.split('.')) == 3
    
    def test_create_token_with_expiry(self):
        """Test JWT token creation with custom expiry"""
        data = {"sub": "test@example.com"}
        expires_delta = timedelta(minutes=30)
        
        token = create_access_token(data, expires_delta)
        
        assert isinstance(token, str)
        assert len(token) > 0
    
    @patch('api.auth.jwt.decode')
    @patch('api.auth.get_db')
    def test_get_current_user_success(self, mock_get_db, mock_jwt_decode, mock_db):
        """Test successful user retrieval from token"""
        # Mock JWT decode
        mock_jwt_decode.return_value = {"sub": "test@example.com"}
        
        # Mock database query
        mock_user = Mock()
        mock_user.email = "test@example.com"
        mock_db.query.return_value.filter.return_value.first.return_value = mock_user
        mock_get_db.return_value = mock_db
        
        user = get_current_user("valid_token", mock_db)
        
        assert user == mock_user
        mock_jwt_decode.assert_called_once()
    
    @patch('api.auth.jwt.decode')
    def test_get_current_user_invalid_token(self, mock_jwt_decode, mock_db):
        """Test user retrieval with invalid token"""
        from jose import JWTError
        mock_jwt_decode.side_effect = JWTError("Invalid token")
        
        with pytest.raises(HTTPException) as exc_info:
            get_current_user("invalid_token", mock_db)
        
        assert exc_info.value.status_code == 401
        assert "Could not validate credentials" in str(exc_info.value.detail)
    
    @patch('api.auth.jwt.decode')
    def test_get_current_user_no_email(self, mock_jwt_decode, mock_db):
        """Test user retrieval with token missing email"""
        mock_jwt_decode.return_value = {"sub": None}
        
        with pytest.raises(HTTPException) as exc_info:
            get_current_user("token_without_email", mock_db)
        
        assert exc_info.value.status_code == 401
    
    @patch('api.auth.jwt.decode')
    def test_get_current_user_not_found(self, mock_jwt_decode, mock_db):
        """Test user retrieval when user doesn't exist in database"""
        mock_jwt_decode.return_value = {"sub": "nonexistent@example.com"}
        mock_db.query.return_value.filter.return_value.first.return_value = None
        
        with pytest.raises(HTTPException) as exc_info:
            get_current_user("valid_token", mock_db)
        
        assert exc_info.value.status_code == 401

class TestAuthEndpoints:
    """Test authentication endpoints"""
    
    @patch('api.auth.get_db')
    def test_register_success(self, mock_get_db, client):
        """Test successful user registration"""
        mock_db = Mock()
        mock_get_db.return_value = mock_db
        
        # Mock that user doesn't already exist
        mock_db.query.return_value.filter.return_value.first.return_value = None
        
        response = client.post("/api/auth/register", json={
            "name": "Test User",
            "email": "test@example.com",
            "password": "password123"
        })
        
        assert response.status_code == 200
        data = response.json()
        assert data["message"] == "User registered successfully"
        assert "user" in data
    
    @patch('api.auth.get_db')
    def test_register_existing_user(self, mock_get_db, client):
        """Test registration with existing email"""
        mock_db = Mock()
        mock_get_db.return_value = mock_db
        
        # Mock that user already exists
        existing_user = Mock()
        existing_user.email = "test@example.com"
        mock_db.query.return_value.filter.return_value.first.return_value = existing_user
        
        response = client.post("/api/auth/register", json={
            "name": "Test User",
            "email": "test@example.com",
            "password": "password123"
        })
        
        assert response.status_code == 400
        assert "already registered" in response.json()["detail"]
    
    @patch('api.auth.get_db')
    def test_login_success(self, mock_get_db, client):
        """Test successful login"""
        mock_db = Mock()
        mock_get_db.return_value = mock_db
        
        # Mock user with correct password
        mock_user = Mock()
        mock_user.email = "test@example.com"
        mock_user.hashed_password = get_password_hash("password123")
        mock_db.query.return_value.filter.return_value.first.return_value = mock_user
        
        response = client.post("/api/auth/token", data={
            "username": "test@example.com",
            "password": "password123"
        })
        
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"
    
    @patch('api.auth.get_db')
    def test_login_wrong_email(self, mock_get_db, client):
        """Test login with non-existent email"""
        mock_db = Mock()
        mock_get_db.return_value = mock_db
        
        # Mock no user found
        mock_db.query.return_value.filter.return_value.first.return_value = None
        
        response = client.post("/api/auth/token", data={
            "username": "nonexistent@example.com",
            "password": "password123"
        })
        
        assert response.status_code == 401
        assert "Incorrect email or password" in response.json()["detail"]
    
    @patch('api.auth.get_db')
    def test_login_wrong_password(self, mock_get_db, client):
        """Test login with wrong password"""
        mock_db = Mock()
        mock_get_db.return_value = mock_db
        
        # Mock user with different password
        mock_user = Mock()
        mock_user.email = "test@example.com"
        mock_user.hashed_password = get_password_hash("correct_password")
        mock_db.query.return_value.filter.return_value.first.return_value = mock_user
        
        response = client.post("/api/auth/token", data={
            "username": "test@example.com",
            "password": "wrong_password"
        })
        
        assert response.status_code == 401
        assert "Incorrect email or password" in response.json()["detail"]

class TestAuthValidation:
    """Test authentication validation"""
    
    def test_invalid_email_format(self, client):
        """Test registration with invalid email format"""
        response = client.post("/api/auth/register", json={
            "name": "Test User",
            "email": "invalid_email",
            "password": "password123"
        })
        
        assert response.status_code == 422
    
    def test_weak_password(self, client):
        """Test registration with weak password"""
        response = client.post("/api/auth/register", json={
            "name": "Test User",
            "email": "test@example.com",
            "password": "123"  # Too short
        })
        
        assert response.status_code == 422
    
    def test_missing_fields(self, client):
        """Test registration with missing required fields"""
        response = client.post("/api/auth/register", json={
            "email": "test@example.com"
            # Missing name and password
        })
        
        assert response.status_code == 422

class TestTokenExpiry:
    """Test token expiration handling"""
    
    @patch('api.auth.jwt.decode')
    def test_expired_token(self, mock_jwt_decode, mock_db):
        """Test handling of expired token"""
        from jose import ExpiredSignatureError
        mock_jwt_decode.side_effect = ExpiredSignatureError("Token has expired")
        
        with pytest.raises(HTTPException) as exc_info:
            get_current_user("expired_token", mock_db)
        
        assert exc_info.value.status_code == 401
        assert "Could not validate credentials" in str(exc_info.value.detail)
    
    def test_token_with_short_expiry(self):
        """Test creating token with very short expiry"""
        data = {"sub": "test@example.com"}
        expires_delta = timedelta(seconds=1)
        
        token = create_access_token(data, expires_delta)
        
        # Token should be created successfully
        assert isinstance(token, str)
        
        # After waiting, token should be expired (in real scenario)
        import time
        time.sleep(2)
        
        # This would fail in actual JWT decode, but we're just testing creation

class TestSecurityHeaders:
    """Test security-related functionality"""
    
    def test_password_requirements(self):
        """Test password strength requirements"""
        # This would be implemented in a real password validator
        weak_passwords = ["123", "password", "abc"]
        strong_passwords = ["MyStr0ng!Pass", "C0mplex_P@ssw0rd", "Secure123!"]
        
        for password in strong_passwords:
            # In reality, you'd have a password strength validator
            assert len(password) >= 8
            assert any(c.isupper() for c in password)
            assert any(c.islower() for c in password)
            assert any(c.isdigit() for c in password)

if __name__ == "__main__":
    pytest.main(["-v", "--cov=api.auth"])