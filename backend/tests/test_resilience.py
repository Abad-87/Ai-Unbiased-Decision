from fastapi.testclient import TestClient

import main


def test_validation_error_has_stable_code():
    with TestClient(main.app) as client:
        response = client.post("/hiring/predict", json={})
        assert response.status_code == 422
        payload = response.json()
        assert payload["code"] == "VALIDATION_ERROR"
        assert "details" in payload


def test_rate_limit_triggers_429_with_retry_header():
    original_max = main.RATE_LIMIT_MAX_REQUESTS
    original_window = main.RATE_LIMIT_WINDOW_S
    main.RATE_LIMIT_MAX_REQUESTS = 1
    main.RATE_LIMIT_WINDOW_S = 60
    main._rate_limiter_store.clear()
    try:
        with TestClient(main.app) as client:
            payload = {
                "years_experience": 5,
                "education_level": 2,
                "technical_score": 82,
                "communication_score": 75,
                "num_past_jobs": 3,
                "certifications": 2,
            }
            first = client.post("/hiring/predict", json=payload)
            assert first.status_code == 200
            second = client.post("/hiring/predict", json=payload)
            assert second.status_code == 429
            body = second.json()
            assert body["code"] == "RATE_LIMITED"
            assert "Retry-After" in second.headers
    finally:
        main.RATE_LIMIT_MAX_REQUESTS = original_max
        main.RATE_LIMIT_WINDOW_S = original_window
        main._rate_limiter_store.clear()


def test_rate_limiter_cleanup_removes_expired_and_overflow_keys():
    original_window = main.RATE_LIMIT_WINDOW_S
    original_max_keys = main.RATE_LIMIT_MAX_KEYS
    try:
        main.RATE_LIMIT_WINDOW_S = 10
        main.RATE_LIMIT_MAX_KEYS = 2
        main._rate_limiter_store.clear()

        now = 100.0
        main._rate_limiter_store["k1"].extend([80.0])   # expires
        main._rate_limiter_store["k2"].extend([95.0])   # active
        main._rate_limiter_store["k3"].extend([96.0])   # active
        main._rate_limiter_store["k4"].extend([97.0])   # active newest

        main._cleanup_rate_limiter_store(now)

        assert "k1" not in main._rate_limiter_store
        assert len(main._rate_limiter_store) == 2
        assert "k4" in main._rate_limiter_store
    finally:
        main.RATE_LIMIT_WINDOW_S = original_window
        main.RATE_LIMIT_MAX_KEYS = original_max_keys
        main._rate_limiter_store.clear()
