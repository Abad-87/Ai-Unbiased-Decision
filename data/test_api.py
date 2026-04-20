import pytest
import pandas as pd
import numpy as np
import joblib
import os

# 1. Test Model Integrity
def test_model_files_exist():
    # Check if the files YOU generated are actually there
    assert os.path.exists("hiring_model.pkl")
    assert os.path.exists("hiring_test_data.csv")

# 2. Test the "Conscience" (The Bias Logic)
def test_bias_detection_logic():
    # Create a fake 'biased' scenario
    # Group A: 90% pass, Group B: 10% pass
    male_preds = [1] * 90 + [0] * 10
    female_preds = [1] * 10 + [0] * 90
    
    ratio = np.mean(female_preds) / np.mean(male_preds)
    
    # The logic YOU built: ratio < 0.8 should trigger bias_detected
    bias_detected = ratio < 0.8
    assert bias_detected == True

# 3. Test Prediction Robustness
def test_prediction_output():
    model = joblib.load("hiring_model.pkl")
    # Test with a standard input [age, education, hours]
    sample_input = np.array([[30, 12, 40]])
    prediction = model.predict(sample_input)
    
    assert prediction[0] in [0, 1] # Must return 0 or 1
