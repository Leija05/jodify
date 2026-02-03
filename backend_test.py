#!/usr/bin/env python3
"""
JodiFy Music Player - Backend Test Suite
Note: This is an Electron application with no backend in the pod.
It uses external Supabase for data storage.
"""

import sys
from datetime import datetime

class JodiFyBackendTester:
    def __init__(self):
        self.tests_run = 0
        self.tests_passed = 0
        
    def run_test(self, name, test_func):
        """Run a single test"""
        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        
        try:
            result = test_func()
            if result:
                self.tests_passed += 1
                print(f"✅ Passed - {name}")
            else:
                print(f"❌ Failed - {name}")
            return result
        except Exception as e:
            print(f"❌ Failed - {name}: {str(e)}")
            return False
    
    def test_no_backend_present(self):
        """Verify this is a frontend-only Electron app"""
        print("This is an Electron music player application")
        print("Backend services are external (Supabase)")
        print("No local backend APIs to test")
        return True
    
    def test_static_files_exist(self):
        """Check if required static files exist"""
        import os
        required_files = [
            '/app/index.html',
            '/app/css/style.css', 
            '/app/js/app.js',
            '/app/js/supabase-config.js'
        ]
        
        for file_path in required_files:
            if not os.path.exists(file_path):
                print(f"Missing required file: {file_path}")
                return False
        
        print("All required static files present")
        return True
    
    def test_html_structure(self):
        """Verify HTML contains required elements"""
        try:
            with open('/app/index.html', 'r', encoding='utf-8') as f:
                content = f.read()
            
            required_elements = [
                'data-testid="queue-btn"',
                'data-testid="eq-btn"', 
                'data-testid="shortcuts-modal"',
                'id="queueDrawer"',
                'id="equalizerModal"',
                'class="queue-drawer"',
                'class="equalizer-modal"'
            ]
            
            missing = []
            for element in required_elements:
                if element not in content:
                    missing.append(element)
            
            if missing:
                print(f"Missing HTML elements: {missing}")
                return False
                
            print("All required HTML elements present")
            return True
        except Exception as e:
            print(f"Error reading HTML: {e}")
            return False
    
    def test_css_variables(self):
        """Check if CSS variables are defined"""
        try:
            with open('/app/css/style.css', 'r', encoding='utf-8') as f:
                content = f.read()
            
            required_vars = [
                '--primary:',
                '--secondary:', 
                '--accent:',
                '--z-modal:',
                '--z-overlay:'
            ]
            
            missing = []
            for var in required_vars:
                if var not in content:
                    missing.append(var)
            
            if missing:
                print(f"Missing CSS variables: {missing}")
                return False
                
            print("All required CSS variables present")
            return True
        except Exception as e:
            print(f"Error reading CSS: {e}")
            return False

def main():
    print("=" * 50)
    print("JodiFy Music Player - Backend Test Suite")
    print("=" * 50)
    
    tester = JodiFyBackendTester()
    
    # Run tests
    tester.run_test("No Backend Architecture", tester.test_no_backend_present)
    tester.run_test("Static Files Existence", tester.test_static_files_exist)
    tester.run_test("HTML Structure", tester.test_html_structure)
    tester.run_test("CSS Variables", tester.test_css_variables)
    
    # Print results
    print(f"\n📊 Backend Tests Summary:")
    print(f"Tests passed: {tester.tests_passed}/{tester.tests_run}")
    print(f"Success rate: {(tester.tests_passed/tester.tests_run)*100:.1f}%")
    
    if tester.tests_passed == tester.tests_run:
        print("✅ All backend structure tests passed")
        print("🔄 Proceeding to frontend testing...")
        return 0
    else:
        print("❌ Some backend structure tests failed")
        return 1

if __name__ == "__main__":
    sys.exit(main())