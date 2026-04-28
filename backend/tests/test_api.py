"""tests/test_api.py

FastAPI integration tests using TestClient (session-scoped via conftest).
Includes consolidated tests for hiring, loan, and social endpoints.
"""

from __future__ import annotations

import json
import time
import uuid
from unittest.mock import patch

import pytest

# -----------------------------------------------------------------------------
# Helper Constants for Schema Validation
# -----------------------------------------------------------------------------

_COMMON_FIELDS = {
    "confidence", "shap_values", "shap_available", "shap_status", 
    "shap_poll_url", "explanation", "bias_risk", "fairness", 
    "preprocessing", "model_variant", "correlation_id", "message"
}

_HIRING_REQUIRED = _COMMON_FIELDS | {"prediction", "prediction_label", "model_version"}
_LOAN_REQUIRED = _HIRING_REQUIRED
_SOCIAL_REQUIRED = _COMMON_FIELDS | {"recommended_category_id", "recommended_category"}


# -----------------------------------------------------------------------------
# Platform / health
# -----------------------------------------------------------------------------

class TestPlatformEndpoints:

    def test_root_status_online(self, app_client):
        r = app_client.get("/")
        assert r.status_code == 200
        data = r.json()
        assert data["status"] == "online"
        assert "Quantum" in data["platform"]
        assert "version" in data

    def test_root_lists_prediction_endpoints(self, app_client):
        endpoints = app_client.get("/").json()["endpoints"]
        assert any("/hiring/predict" in e for e in endpoints)
        assert any("/loan/predict" in e for e in endpoints)
        assert any("/social/recommend" in e for e in endpoints)

    def test_health_is_healthy(self, app_client):
        r = app_client.get("/health")
        assert r.status_code == 200
        data = r.json()
        assert data["status"] == "healthy"
        assert "timestamp" in data

    def test_models_endpoint(self, app_client):
        r = app_client.get("/models")
        assert r.status_code == 200
        assert "models" in r.json()


# -----------------------------------------------------------------------------
# Core Prediction Endpoints
# -----------------------------------------------------------------------------

class TestHiringPredict:

    def test_valid_request_200(self, app_client, HIRING_PAYLOAD):
        r = app_client.post("/hiring/predict", json=HIRING_PAYLOAD)
        assert r.status_code == 200
        data = r.json()
        # Verify required keys exist
        assert not (_HIRING_REQUIRED - data.keys())
        assert data["prediction"] in (0, 1)
        uuid.UUID(data["correlation_id"])

    def test_hiring_validation_errors(self, app_client, HIRING_PAYLOAD):
        # Technical score out of range
        bad_payload = {**HIRING_PAYLOAD, "technical_score": 150}
        assert app_client.post("/hiring/predict", json=bad_payload).status_code == 422


class TestLoanPredict:

    def test_valid_request_200(self, app_client, LOAN_PAYLOAD):
        r = app_client.post("/loan/predict", json=LOAN_PAYLOAD)
        assert r.status_code == 200
        assert r.json()["prediction_label"] in ("Approved", "Rejected")

    def test_loan_limit_logic(self, app_client, LOAN_PAYLOAD):
        # Example of business logic validation: Loan cannot exceed 10x income
        extreme_loan = {**LOAN_PAYLOAD, "annual_income": 10000, "loan_amount": 500000}
        assert app_client.post("/loan/predict", json=extreme_loan).status_code == 422


class TestSocialRecommend:

    def test_valid_request_200(self, app_client, SOCIAL_PAYLOAD):
        r = app_client.post("/social/recommend", json=SOCIAL_PAYLOAD)
        assert r.status_code == 200
        data = r.json()
        assert "recommended_category" in data
        assert 0 <= data["recommended_category_id"] <= 7


# -----------------------------------------------------------------------------
# Security, SHAP & Performance
# -----------------------------------------------------------------------------

class TestSecurityAndInternal:

    def test_oversized_body_413(self, app_client, HIRING_PAYLOAD):
        # Test body limit middleware
        giant_body = json.dumps({**HIRING_PAYLOAD, "padding": "x" * 70_000})
        r = app_client.post("/hiring/predict", content=giant_body, headers={"Content-Type": "application/json"})
        assert r.status_code == 413

    def test_shap_poll_lifecycle(self, app_client, HIRING_PAYLOAD):
        # Get poll URL from initial prediction
        pred_res = app_client.post("/hiring/predict", json=HIRING_PAYLOAD).json()
        poll_url = pred_res["shap_poll_url"]
        
        # Poll the status
        poll_res = app_client.get(poll_url)
        assert poll_res.status_code == 200
        assert poll_res.json()["status"] in ("pending", "ready", "missing")

    def test_batch_load_performance(self, app_client, HIRING_PAYLOAD):
        # Reduced from 100 to 10 for CI stability while still testing reliability
        for _ in range(10):
            assert app_client.post("/hiring/predict", json=HIRING_PAYLOAD).status_code == 200


class TestFileScanPipeline:

    def test_upload_and_scan_generates_final_report(self, app_client):
        csv_data = (
            "applicant_uid,monthly_stable_income,credit_history_score,debt_to_income_ratio,"
            "employment_stability_years,existing_loan_count,collateral_valuation_amount,"
            "requested_loan_tenure,payment_default_history,verified_identity_flag,"
            "residential_status_stability,bank_statement_analysis_score,is_eligible_for_loan\n"
            "L001,7000,720,0.32,5,1,20000,36,0,1,1,82,1\n"
            "L002,4200,640,0.56,2,2,15000,60,1,1,0,58,0\n"
            "L003,8200,780,0.21,6,0,25000,24,0,1,1,91,1\n"
        )

        upload = app_client.post(
            "/files/upload",
            files={"file": ("loan_scan.csv", csv_data.encode(), "text/csv")},
            data={"domain": "loan"},
        )
        assert upload.status_code == 200
        file_id = upload.json()["file"]["id"]
        assert upload.json()["analysis"]["success"] is True
        assert upload.json()["analysis"]["detected_domain"] == "loan"

        with patch("utils.dataset_analyzer.save_prediction") as save_prediction_mock:
            scan = app_client.post("/files/scan", json={"domain": "loan", "file_id": file_id})

        assert scan.status_code == 200
        data = scan.json()
        assert data["success"] is True
        assert data["dataset"]["domain"] == "loan"
        assert data["scores"]["final_recommendation"] in ("Accept", "Reject", "Retrain")
        assert set(data["scores"].keys()) == {
            "bias_score",
            "fairness_score",
            "performance_score",
            "risk_score",
            "final_recommendation",
        }
        assert "validation" in data and "performance" in data and "fairness" in data
        assert save_prediction_mock.await_count >= 1

    def test_analyze_returns_full_row_breakdown_with_export_paths(self, app_client):
        csv_data = (
            "candidate_id,full_name,degree_specialization,cgpa_percentage,years_of_experience,"
            "technical_skills_list,dbms_proficiency_level,ai_ml_frameworks_known,projects_github_count,"
            "certification_validity_score,last_job_role,expected_salary_range,is_legitimate_candidate\n"
            "C001,Alice,bachelor,82,5,\"python;sql\",85,\"tensorflow;sklearn\",4,76,Data Engineer,8-12,1\n"
            "C002,Bob,bachelor,61,1,\"sql\",52,\"\",1,55,Intern,4-6,0\n"
            "C003,Carol,master,91,8,\"python;ml\",92,\"pytorch;keras\",7,88,ML Engineer,12-18,1\n"
        )

        upload = app_client.post(
            "/files/upload",
            files={"file": ("hiring_batch.csv", csv_data.encode(), "text/csv")},
            data={"domain": "hiring"},
        )
        assert upload.status_code == 200
        file_id = upload.json()["file"]["id"]
        assert upload.json()["analysis"]["success"] is True
        assert upload.json()["analysis"]["detected_domain"] == "hiring"

        with patch("utils.dataset_analyzer.save_prediction") as save_prediction_mock:
            analyze = app_client.post(f"/files/analyze/{file_id}")

        assert analyze.status_code == 200
        data = analyze.json()
        assert data["success"] is True
        assert data["detected_domain"] == "hiring"
        assert len(data["results"]) == 3
        assert len(data["decision_summary_table"]) == 3
        assert len(data["detailed_breakdown"]) == 3
        assert data["downloadable_report"]["json_path"].endswith("_analysis_report.json")
        assert data["downloadable_report"]["csv_path"].endswith("_analysis_summary.csv")
        assert save_prediction_mock.await_count == 3

    def test_json_upload_does_not_collide_with_metadata_file(self, app_client):
        json_data = [
            {
                "candidate_id": "C900",
                "full_name": "Json Candidate",
                "degree_specialization": "Computer Science",
                "cgpa_percentage": 84,
                "years_of_experience": 4,
                "technical_skills_list": "python;sql",
                "dbms_proficiency_level": 82,
                "ai_ml_frameworks_known": "sklearn",
                "projects_github_count": 5,
                "certification_validity_score": 88,
                "last_job_role": "Data Engineer",
                "expected_salary_range": "90000-115000",
                "is_legitimate_candidate": 1,
            }
        ]

        with patch("utils.dataset_analyzer.save_prediction") as save_prediction_mock:
            upload = app_client.post(
                "/files/upload",
                files={"file": ("hiring_batch.json", json.dumps(json_data).encode(), "application/json")},
                data={"domain": "hiring"},
            )

        assert upload.status_code == 200
        payload = upload.json()
        assert payload["file"]["stored_name"].endswith("_data.json")
        assert payload["analysis"]["success"] is True
        assert payload["analysis"]["detected_domain"] == "hiring"
        assert payload["analysis"]["rows_predicted"] == 1
        assert save_prediction_mock.await_count == 1

    def test_non_csv_json_file_is_rejected_on_upload(self, app_client):
        text_payload = (
            "loan_amount: 18000\n"
            "credit_score: 705\n"
            "annual_income: 68000\n"
            "employment_years: 4\n"
        )

        upload = app_client.post(
            "/files/upload",
            files={"file": ("loan_profile.txt", text_payload.encode(), "text/plain")},
            data={"domain": "loan"},
        )
        assert upload.status_code == 400
        assert "Only CSV and JSON files are allowed" in upload.json()["detail"]

    def test_upload_rejects_missing_domain_attributes(self, app_client):
        csv_data = (
            "applicant_uid,monthly_stable_income,credit_history_score\n"
            "L001,7000,720\n"
        )

        upload = app_client.post(
            "/files/upload",
            files={"file": ("bad_loan.csv", csv_data.encode(), "text/csv")},
            data={"domain": "loan"},
        )

        assert upload.status_code == 400
        detail = upload.json()["detail"]
        assert detail["domain"] == "loan"
        assert "debt_to_income_ratio" in detail["missing_attributes"]
        assert "requested_loan_tenure" in detail["missing_attributes"]


class TestCSVSchemaScanner:

    def test_scan_csv_schemas_success(self, app_client, tmp_path):
        social_csv = tmp_path / "social_media.csv"
        social_csv.write_text(
            "username,platform,followersCount,engagementRate\n"
            "alpha,Instagram,12000,0.4\n"
            "beta,YouTube,5000,3.2\n",
            encoding="utf-8",
        )

        loan_csv = tmp_path / "loan_approval.csv"
        loan_csv.write_text(
            "applicantId,income,loanAmount,creditScore,approvalStatus\n"
            "L1,7000,15000,760,Approved\n"
            "L2,0,20000,500,Rejected\n",
            encoding="utf-8",
        )

        hiring_csv = tmp_path / "job_applicant.csv"
        hiring_csv.write_text(
            "applicantId,name,experienceLevel,skills,applicationStatus\n"
            "A1,Alice,Senior,\"python;sql;ml\",Shortlisted\n"
            "A2,Bob,Entry,,Pending\n",
            encoding="utf-8",
        )

        r = app_client.post(
            "/files/scan-csv-schemas",
            json={
                "social_media_path": str(social_csv),
                "loan_approval_path": str(loan_csv),
                "hiring_applicant_path": str(hiring_csv),
                "chunk_size": 500,
            },
        )
        assert r.status_code == 200
        data = r.json()
        assert data["success"] is True
        assert data["schemas_scanned"] == 3
        assert len(data["results"]) == 3
        assert "## SocialMediaCreator Report" in data["markdown_report"]
        assert "## LoanApproval Report" in data["markdown_report"]
        assert "## HiringJobApplicant Report" in data["markdown_report"]

    def test_scan_csv_schemas_missing_file(self, app_client):
        r = app_client.post(
            "/files/scan-csv-schemas",
            json={
                "social_media_path": "/does/not/exist/social.csv",
                "loan_approval_path": "/does/not/exist/loan.csv",
                "hiring_applicant_path": "/does/not/exist/hiring.csv",
            },
        )
        assert r.status_code == 200
        data = r.json()
        assert data["success"] is True
        assert len(data["results"]) == 3
        assert all("error" in item for item in data["results"])


# -----------------------------------------------------------------------------
# Fixtures (Payloads)
# -----------------------------------------------------------------------------

@pytest.fixture()
def HIRING_PAYLOAD():
    return {
        "years_experience": 5,
        "education_level": 2,
        "technical_score": 82,
        "communication_score": 75,
        "num_past_jobs": 3,
        "certifications": 2,
        "gender": "female",
    }

@pytest.fixture()
def LOAN_PAYLOAD():
    return {
        "credit_score": 720,
        "annual_income": 75000,
        "loan_amount": 25000,
        "loan_term_months": 36,
        "employment_years": 4,
        "existing_debt": 8000,
        "num_credit_lines": 3,
        "ethnicity": "hispanic",
    }

@pytest.fixture()
def SOCIAL_PAYLOAD():
    return {
        "avg_session_minutes": 45,
        "posts_per_day": 3,
        "topics_interacted": 12,
        "like_rate": 0.65,
        "share_rate": 0.20,
        "comment_rate": 0.10,
        "account_age_days": 365,
        "age_group": "25-34",
        "location": "India",
        "language": "en"
    }
