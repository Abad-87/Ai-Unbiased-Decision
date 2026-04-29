"""
loan/predictor.py  —  Phase 3: async SHAP

Critical-path changes: SHAP removed.  See hiring/predictor.py for full notes.
"""

from __future__ import annotations

import logging
import os
from typing import Any, Dict, Optional

from fairness.checker import compute_bias_risk_score

logger = logging.getLogger("loan.predictor")

FEATURE_NAMES = [
    "credit_score",
    "annual_income",
    "loan_amount",
    "loan_term_months",
    "employment_years",
    "existing_debt",
    "num_credit_lines",
]

DEFAULT_POSITIVE_THRESHOLD = 0.55
DEFAULT_NEGATIVE_THRESHOLD = 0.45


def predict(
    model,
    features:       Dict[str, Any],
    sensitive_attr: Optional[str] = None,
    domain:         str = "loan",
) -> dict:
    """Fast synchronous prediction — SHAP computed asynchronously."""
    input_row = _build_input_row(features)
    if hasattr(model, "n_features_in_"):
        expected = int(getattr(model, "n_features_in_", len(input_row[0])))
        actual = len(input_row[0])
        if expected != actual:
            if expected < actual:
                input_row = [input_row[0][:expected]]
            else:
                input_row = [input_row[0] + [0.0] * (expected - actual)]

    prediction = int(model.predict(input_row)[0])

    confidence = 0.5
    if hasattr(model, "predict_proba"):
        proba      = model.predict_proba(input_row)[0]
        confidence = round(float(proba[1]), 4)

    bias_risk = compute_bias_risk_score(
        confidence     = confidence,
        shap_values    = None,
        sensitive_attr = sensitive_attr,
        domain         = domain,
    )

    explanation = _plain_language_explanation(features, prediction)

    return {
        "prediction":     prediction,
        "confidence":     confidence,
        "shap_values":    {},
        "shap_available": False,
        "shap_status":    "pending",
        "explanation":    explanation,
        "bias_risk":      bias_risk,
        "input_row":      input_row,
        "feature_names":  FEATURE_NAMES,
    }


def _build_input_row(features: dict) -> list:
    return [[
        features["credit_score"],
        features["annual_income"],
        features["loan_amount"],
        features["loan_term_months"],
        features["employment_years"],
        features["existing_debt"],
        features["num_credit_lines"],
    ]]


def _rule_based_explanation(features: dict, prediction: int) -> str:
    credit    = features.get("credit_score", 0)
    income    = features.get("annual_income", 1) or 1
    debt      = features.get("existing_debt", 0)
    loan_amt  = features.get("loan_amount", 0)
    emp_years = features.get("employment_years", 0)

    dti = round(debt / income, 3)
    lti = round(loan_amt / income, 3)

    if prediction == 1:
        factors = []
        if credit    >= 700: factors.append(f"good credit score ({credit})")
        if dti        < 0.4: factors.append(f"manageable debt-to-income ratio ({dti:.0%})")
        if emp_years  >= 2:  factors.append(f"{emp_years} years of stable employment")
        reason = ", ".join(factors) or "meets all lending criteria"
        return f"Loan approved — {reason}. (Full SHAP explanation pending)"

    issues = []
    if credit    < 600: issues.append(f"low credit score ({credit}, minimum 600 recommended)")
    if dti       > 0.5: issues.append(f"high debt-to-income ratio ({dti:.0%})")
    if lti       > 3:   issues.append(f"loan amount too high relative to income ({lti:.1f}x income)")
    if emp_years  < 1:  issues.append("less than 1 year of employment history")
    reason = "; ".join(issues) or "does not meet lending criteria"
    return f"Loan rejected — {reason}. (Full SHAP explanation pending)"


def _plain_language_explanation(features: dict, prediction: int) -> str:
    credit    = features.get("credit_score", 0)
    income    = features.get("annual_income", 1) or 1
    debt      = features.get("existing_debt", 0)
    loan_amt  = features.get("loan_amount", 0)
    emp_years = features.get("employment_years", 0)

    dti = round(debt / income, 3)
    lti = round(loan_amt / income, 3)

    if prediction == 1:
        factors = []
        if credit >= 700:
            factors.append(f"a strong credit score ({credit})")
        if dti < 0.4:
            factors.append(f"a manageable debt-to-income ratio ({dti:.0%})")
        if emp_years >= 2:
            factors.append(f"{emp_years} years of steady employment")
        reason = ", ".join(factors) or "the profile meeting the main lending checks"
        return f"This loan was approved mainly because of {reason}."

    issues = []
    if credit < 600:
        issues.append(f"a low credit score ({credit}; 600+ is usually safer)")
    if dti > 0.5:
        issues.append(f"a high debt-to-income ratio ({dti:.0%})")
    if lti > 3:
        issues.append(f"a large loan request compared with income ({lti:.1f}x income)")
    if emp_years < 1:
        issues.append("very limited employment history")
    reason = "; ".join(issues) or "the application missing the minimum lending signals"
    return f"This loan was not approved mainly because of {reason}."


def _balanced_binary_decision(
    positive_confidence: float,
    model_prediction: int,
    positive_threshold: float,
    negative_threshold: float,
) -> int:
    if positive_confidence >= positive_threshold:
        return 1
    if positive_confidence <= negative_threshold:
        return 0
    return int(model_prediction)


def _resolve_thresholds() -> tuple[float, float]:
    try:
        positive = float(os.getenv("LOAN_POSITIVE_THRESHOLD", str(DEFAULT_POSITIVE_THRESHOLD)))
        negative = float(os.getenv("LOAN_NEGATIVE_THRESHOLD", str(DEFAULT_NEGATIVE_THRESHOLD)))
    except ValueError:
        logger.warning(
            "Invalid loan threshold env vars; using defaults "
            "(LOAN_POSITIVE_THRESHOLD=0.55, LOAN_NEGATIVE_THRESHOLD=0.45)."
        )
        return DEFAULT_POSITIVE_THRESHOLD, DEFAULT_NEGATIVE_THRESHOLD

    if not (0.0 <= negative <= positive <= 1.0):
        logger.warning(
            "Inconsistent loan thresholds detected; using defaults. "
            "Expected: 0.0 <= negative <= positive <= 1.0."
        )
        return DEFAULT_POSITIVE_THRESHOLD, DEFAULT_NEGATIVE_THRESHOLD

    return positive, negative
