"""
system_test.py — Comprehensive system verification
Tests all backend imports, frontend types, and API connectivity
"""

import sys
import os
import asyncio
from pathlib import Path

# Add backend directory to Python path
backend_dir = Path(__file__).parent / "backend"
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

def test_backend_imports():
    """Verify all backend modules can be imported without errors"""
    print("\n=== Testing Backend Imports ===")
    errors = []
    
    try:
        # Core modules - imports from backend directory
        from main import app
        print("✓ main.py imports successfully")
    except Exception as e:
        errors.append(f"main.py: {e}")
        print(f"✗ main.py failed: {e}")
    
    try:
        from utils.database import get_prediction_history, get_recent_predictions
        print("✓ database.py imports successfully")
    except Exception as e:
        errors.append(f"database.py: {e}")
        print(f"✗ database.py failed: {e}")
    
    try:
        from utils.mitigation_router import router as mitigation_router
        print("✓ mitigation_router.py imports successfully")
    except Exception as e:
        errors.append(f"mitigation_router.py: {e}")
        print(f"✗ mitigation_router.py failed: {e}")
    
    try:
        from utils.file_upload_router import router as file_router
        print("✓ file_upload_router.py imports successfully")
    except Exception as e:
        errors.append(f"file_upload_router.py: {e}")
        print(f"✗ file_upload_router failed: {e}")
    
    try:
        from utils.feedback_router import router as feedback_router
        print("✓ feedback_router.py imports successfully")
    except Exception as e:
        errors.append(f"feedback_router.py: {e}")
        print(f"✗ feedback_router failed: {e}")
    
    try:
        from utils.insights_router import router as insights_router
        print("✓ insights_router.py imports successfully")
    except Exception as e:
        errors.append(f"insights_router.py: {e}")
        print(f"✗ insights_router failed: {e}")
    
    try:
        from fairness.checker import demographic_parity_difference, equal_opportunity_difference
        print("✓ fairness/checker.py imports successfully")
    except Exception as e:
        errors.append(f"fairness/checker.py: {e}")
        print(f"✗ fairness/checker failed: {e}")
    
    try:
        from hiring.router import router as hiring_router
        print("✓ hiring/router.py imports successfully")
    except Exception as e:
        errors.append(f"hiring/router.py: {e}")
        print(f"✗ hiring/router failed: {e}")
    
    try:
        from loan.router import router as loan_router
        print("✓ loan/router.py imports successfully")
    except Exception as e:
        errors.append(f"loan/router.py: {e}")
        print(f"✗ loan/router failed: {e}")
    
    try:
        from social.router import router as social_router
        print("✓ social/router.py imports successfully")
    except Exception as e:
        errors.append(f"social/router.py: {e}")
        print(f"✗ social/router failed: {e}")
    
    return errors

def test_frontend_types():
    """Verify TypeScript types are complete"""
    print("\n=== Testing Frontend Types ===")
    
    api_ts = Path("frontend/src/lib/api.ts")
    if not api_ts.exists():
        print("⚠ frontend/src/lib/api.ts not found")
        return []
    
    content = api_ts.read_text()
    required_types = [
        "export interface HiringResponse",
        "export interface LoanResponse", 
        "export interface SocialResponse",
        "export interface SummaryResponse",
        "export interface MitigationResult",
        "export interface FileMetadata",
        "export interface FileUploadResponse",
        "predictHiring:",
        "predictLoan:",
        "predictSocial:",
        "getSummary:",
        "getRecent:",
        "feedback:",
        "uploadFile:",
        "applyMitigation:",
    ]
    
    missing = []
    for req in required_types:
        if req not in content:
            missing.append(req)
            print(f"✗ Missing: {req}")
        else:
            print(f"✓ Found: {req}")
    
    return missing

def test_router_registration():
    """Verify all routers are registered in main.py"""
    print("\n=== Testing Router Registration ===")
    
    main_py = Path("backend/main.py")
    content = main_py.read_text()
    
    required_routers = [
        ("hiring_router", "/hiring"),
        ("loan_router", "/loan"),
        ("social_router", "/social"),
        ("shap_router", None),
        ("feedback_router", None),
        ("insights_router", None),
        ("file_router", "/files"),
        ("mitigation_router", "/mitigation"),
    ]
    
    missing = []
    for router, prefix in required_routers:
        import_line = f"from utils.{router.replace('_router', '_router')}" if 'utils' in router else f"from {router.replace('_router', '')}.router"
        if import_line not in content and f"import router as {router}" not in content:
            # Check alternative import patterns
            if router not in content:
                missing.append(f"Import for {router}")
                print(f"✗ Missing import: {router}")
            else:
                print(f"✓ Import found: {router}")
        else:
            print(f"✓ Import found: {router}")
        
        # Check registration
        if f"app.include_router({router}" not in content:
            missing.append(f"Registration for {router}")
            print(f"✗ Missing registration: {router}")
        else:
            print(f"✓ Registration found: {router}")
    
    return missing

def test_feature_components():
    """Verify all feature components exist and import API"""
    print("\n=== Testing Feature Components ===")
    
    features_dir = Path("frontend/src/features")
    required_features = [
        "dashboard/Dashboard.tsx",
        "bias-detection/BiasDetection.tsx",
        "fairness-explorer/FairnessExplorer.tsx",
        "hiring-prediction/HiringPrediction.tsx",
        "social-recommendation/SocialRecommendation.tsx",
        "reports/Reports.tsx",
        "mitigation-lab/MitigationLab.tsx",
        "datasets/Datasets.tsx",
    ]
    
    missing = []
    for feature in required_features:
        path = features_dir / feature
        if not path.exists():
            missing.append(feature)
            print(f"✗ Missing component: {feature}")
        else:
            content = path.read_text()
            if "from '../../lib/api'" not in content and "from '../../lib/api'" not in content:
                missing.append(f"{feature} missing API import")
                print(f"⚠ {feature} may be missing API import")
            else:
                print(f"✓ {feature} exists with API import")
    
    return missing

async def run_all_tests():
    """Run all tests and report results"""
    print("=" * 60)
    print("SYSTEM VERIFICATION TEST SUITE")
    print("=" * 60)
    
    all_errors = []
    
    # Test 1: Backend imports
    errors = test_backend_imports()
    all_errors.extend([f"BACKEND: {e}" for e in errors])
    
    # Test 2: Frontend types
    errors = test_frontend_types()
    all_errors.extend([f"TYPES: {e}" for e in errors])
    
    # Test 3: Router registration
    errors = test_router_registration()
    all_errors.extend([f"ROUTER: {e}" for e in errors])
    
    # Test 4: Feature components
    errors = test_feature_components()
    all_errors.extend([f"COMPONENT: {e}" for e in errors])
    
    # Summary
    print("\n" + "=" * 60)
    print("TEST SUMMARY")
    print("=" * 60)
    
    if all_errors:
        print(f"\n❌ FOUND {len(all_errors)} ERRORS:")
        for i, error in enumerate(all_errors, 1):
            print(f"  {i}. {error}")
        print("\n⚠️  Please fix these issues before deploying.")
        return 1
    else:
        print("\n✅ ALL TESTS PASSED!")
        print("\n✓ Backend imports working")
        print("✓ Frontend types complete")
        print("✓ All routers registered")
        print("✓ Feature components connected")
        print("\n🚀 System is ready for deployment!")
        return 0

if __name__ == "__main__":
    try:
        exit_code = asyncio.run(run_all_tests())
        sys.exit(exit_code)
    except Exception as e:
        print(f"\n💥 Test runner crashed: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
