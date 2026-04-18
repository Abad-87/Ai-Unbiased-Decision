import hiring.predictor as hiring_predictor
import loan.predictor as loan_predictor


def test_hiring_thresholds_use_defaults_for_invalid_env(monkeypatch):
    monkeypatch.setenv("HIRING_POSITIVE_THRESHOLD", "bad")
    monkeypatch.setenv("HIRING_NEGATIVE_THRESHOLD", "value")
    positive, negative = hiring_predictor._resolve_thresholds()
    assert positive == hiring_predictor.DEFAULT_POSITIVE_THRESHOLD
    assert negative == hiring_predictor.DEFAULT_NEGATIVE_THRESHOLD


def test_hiring_thresholds_use_defaults_for_inconsistent_values(monkeypatch):
    monkeypatch.setenv("HIRING_POSITIVE_THRESHOLD", "0.3")
    monkeypatch.setenv("HIRING_NEGATIVE_THRESHOLD", "0.6")
    positive, negative = hiring_predictor._resolve_thresholds()
    assert positive == hiring_predictor.DEFAULT_POSITIVE_THRESHOLD
    assert negative == hiring_predictor.DEFAULT_NEGATIVE_THRESHOLD


def test_loan_thresholds_accept_valid_values(monkeypatch):
    monkeypatch.setenv("LOAN_POSITIVE_THRESHOLD", "0.62")
    monkeypatch.setenv("LOAN_NEGATIVE_THRESHOLD", "0.38")
    positive, negative = loan_predictor._resolve_thresholds()
    assert positive == 0.62
    assert negative == 0.38
