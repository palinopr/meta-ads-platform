"""
Pytest configuration and shared fixtures
"""

import pytest
import os
import sys
from pathlib import Path

# Add the backend directory to the Python path
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

def pytest_configure(config):
    """Configure pytest with custom markers"""
    config.addinivalue_line(
        "markers", "integration: mark test as integration test"
    )
    config.addinivalue_line(
        "markers", "benchmark: mark test as performance benchmark"
    )
    config.addinivalue_line(
        "markers", "slow: mark test as slow running"
    )

def pytest_addoption(parser):
    """Add custom command line options"""
    parser.addoption(
        "--integration",
        action="store_true",
        default=False,
        help="run integration tests"
    )
    parser.addoption(
        "--benchmark",
        action="store_true", 
        default=False,
        help="run benchmark tests"
    )

def pytest_collection_modifyitems(config, items):
    """Modify test collection based on command line options"""
    if not config.getoption("--integration"):
        skip_integration = pytest.mark.skip(reason="need --integration option to run")
        for item in items:
            if "integration" in item.keywords:
                item.add_marker(skip_integration)
    
    if not config.getoption("--benchmark"):
        skip_benchmark = pytest.mark.skip(reason="need --benchmark option to run")
        for item in items:
            if "benchmark" in item.keywords:
                item.add_marker(skip_benchmark)

@pytest.fixture(scope="session")
def test_environment():
    """Set up test environment variables"""
    os.environ.update({
        "TESTING": "true",
        "META_APP_ID": "test_app_id",
        "META_APP_SECRET": "test_app_secret",
        "DATABASE_URL": "sqlite:///test.db"
    })
    yield
    # Cleanup
    for key in ["TESTING", "META_APP_ID", "META_APP_SECRET", "DATABASE_URL"]:
        os.environ.pop(key, None)