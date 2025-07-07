# This file contains the WSGI configuration required to serve up your
# web application at http://yourusername.pythonanywhere.com/
import sys
import os

# Add your project directory to the sys.path
project_home = '/home/yourusername/meta-ads-platform/backend'
if project_home not in sys.path:
    sys.path.insert(0, project_home)

# Import your FastAPI app
from main import app

# PythonAnywhere needs the application object
application = app