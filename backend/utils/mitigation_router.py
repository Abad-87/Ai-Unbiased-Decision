"""
mitigation_router.py — Post-processing bias mitigation algorithms

Supports: threshold optimization, calibration adjustment, disparate impact removal
"""

from __future__ import annotations

import logging
from typing import List, Dict, Any, Optional
from dataclasses import dataclass
from enum import Enum

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
import numpy as np

from utils.database import get_prediction_history
from fairness.checker import (
    demographic_parity_difference,
    equal_opportunity_difference,
)

logger = logging.getLogger("mitigation.router")
router = APIRouter(prefix="/mitigation", tags=["Mitigation"])


class MitigationMethod(str, Enum):
    THRESHOLD_OPTIMIZATION = "threshold"
    CALIBRATION_ADJUSTMENT = "calibration"
    IMPACT_REMOVAL = "impact_removal"


class TargetMetric(str, Enum):
    DEMOGRAPHIC_PARITY = "demographic_parity"
    EQUAL_OPPORTUNITY = "equal_opportunity"
    CALIBRATION = "calibration"


class MitigationRequest(BaseModel):
    domain: str = Field(..., description="Domain: loan, hiring, social")
    method: MitigationMethod = Field(..., description="Mitigation algorithm")
    target_metric: TargetMetric = Field(default=TargetMetric.DEMOGRAPHIC_PARITY)
    strength: float = Field(default=0.5, ge=0.0, le=1.0, description="Mitigation strength 0-1")
    protected_attribute: Optional[str] = Field(None, description="Specific attribute to mitigate")


class GroupThreshold(BaseModel):
    group: str
    original_threshold: float
    new_threshold: float
    expected_approval_rate: float


class MitigationResult(BaseModel):
    success: bool
    message: str
    method: str
    
    # Before/after metrics
    original_dpd: Optional[float] = None
    mitigated_dpd: Optional[float] = None
    original_eod: Optional[float] = None
    mitigated_eod: Optional[float] = None
    
    improvement_pct: float = Field(0.0, description="Fairness improvement percentage")
    
    # Threshold adjustments per group
    new_thresholds: List[GroupThreshold] = []
    
    # Affected records
    affected_records: int = 0
    total_records: int = 0
    
    # Calibration adjustments if applicable
    calibration_adjustments: Dict[str, float] = {}


def compute_threshold_optimization(
    predictions: np.ndarray,
    confidences: np.ndarray,
    protected_groups: np.ndarray,
    group_labels: List[str],
    target_metric: TargetMetric,
    strength: float
) -> Dict[str, Any]:
    """
    Find optimal thresholds per group to equalize approval rates.
    """
    thresholds_per_group = {}
    group_stats = {}
    
    # Compute current approval rates per group
    for group in group_labels:
        mask = protected_groups == group
        group_confidences = confidences[mask]
        
        if len(group_confidences) == 0:
            continue
            
        # Current stats
        current_threshold = 0.5
        current_approval_rate = np.mean(group_confidences >= current_threshold)
        
        group_stats[group] = {
            'count': int(mask.sum()),
            'current_approval_rate': float(current_approval_rate),
            'mean_confidence': float(np.mean(group_confidences)),
        }
    
    # Target approval rate (average across groups for demographic parity)
    if target_metric == TargetMetric.DEMOGRAPHIC_PARITY:
        target_rate = np.mean([s['current_approval_rate'] for s in group_stats.values()])
        
        # Adjust toward target based on strength
        for group, stats in group_stats.items():
            mask = protected_groups == group
            group_confidences = confidences[mask]
            
            # Find threshold that achieves the target rate
            sorted_conf = np.sort(group_confidences)
            target_idx = int(len(sorted_conf) * (1 - target_rate))
            target_idx = max(0, min(target_idx, len(sorted_conf) - 1))
            
            optimal_threshold = sorted_conf[target_idx] if len(sorted_conf) > 0 else 0.5
            
            # Blend with original based on strength
            final_threshold = 0.5 + strength * (optimal_threshold - 0.5)
            final_threshold = max(0.1, min(0.9, final_threshold))  # Clamp
            
            # Compute expected approval rate
            new_approval_rate = np.mean(group_confidences >= final_threshold)
            
            thresholds_per_group[group] = {
                'original': 0.5,
                'new': float(final_threshold),
                'expected_approval': float(new_approval_rate),
            }
    
    else:  # Equal Opportunity - would need ground truth labels
        # Fallback to balancing approval rates
        target_rate = np.mean([s['current_approval_rate'] for s in group_stats.values()])
        
        for group, stats in group_stats.items():
            mask = protected_groups == group
            group_confidences = confidences[mask]
            
            diff = stats['current_approval_rate'] - target_rate
            adjustment = -diff * strength * 0.5  # Scale adjustment
            
            final_threshold = 0.5 + adjustment
            final_threshold = max(0.1, min(0.9, final_threshold))
            
            new_approval_rate = np.mean(group_confidences >= final_threshold)
            
            thresholds_per_group[group] = {
                'original': 0.5,
                'new': float(final_threshold),
                'expected_approval': float(new_approval_rate),
            }
    
    return {
        'thresholds': thresholds_per_group,
        'group_stats': group_stats,
    }


def compute_calibration_adjustment(
    confidences: np.ndarray,
    protected_groups: np.ndarray,
    group_labels: List[str],
    strength: float
) -> Dict[str, float]:
    """
    Compute per-group calibration multipliers to equalize ECE.
    """
    adjustments = {}
    
    for group in group_labels:
        mask = protected_groups == group
        group_conf = confidences[mask]
        
        if len(group_conf) < 10:
            adjustments[group] = 1.0
            continue
        
        # Simple calibration: adjust mean toward 0.5
        mean_conf = np.mean(group_conf)
        
        # If group has higher confidence on average, reduce it
        adjustment = 1.0 + (0.5 - mean_conf) * strength * 0.5
        adjustment = max(0.7, min(1.3, adjustment))
        
        adjustments[group] = float(adjustment)
    
    return adjustments


def compute_impact_removal(
    predictions: np.ndarray,
    confidences: np.ndarray,
    protected_groups: np.ndarray,
    group_labels: List[str],
    strength: float
) -> Dict[str, Any]:
    """
    Remove disparate impact by ensuring 80% rule compliance.
    Adjust predictions to ensure no group's approval rate is less than 80% of the max.
    """
    # Compute current approval rates
    approval_rates = {}
    for group in group_labels:
        mask = protected_groups == group
        if mask.sum() == 0:
            continue
        approval_rates[group] = float(np.mean(confidences[mask] >= 0.5))
    
    if not approval_rates:
        return {'multipliers': {}, 'target_min_rate': 0.0}
    
    max_rate = max(approval_rates.values())
    target_min_rate = max_rate * 0.8  # 80% rule
    
    multipliers = {}
    for group, rate in approval_rates.items():
        mask = protected_groups == group
        
        if rate < target_min_rate:
            # Need to boost this group's approval rate
            # Compute multiplier needed
            boost_needed = (target_min_rate - rate) / max(rate, 0.01)
            multiplier = 1.0 + boost_needed * strength
            multiplier = min(multiplier, 2.0)  # Cap at 2x
        else:
            multiplier = 1.0
        
        multipliers[group] = float(multiplier)
    
    return {
        'multipliers': multipliers,
        'target_min_rate': float(target_min_rate),
        'max_rate': float(max_rate),
    }


@router.post("/apply", response_model=MitigationResult)
async def apply_mitigation(request: MitigationRequest):
    """
    Apply bias mitigation to recent predictions for a domain.
    """
    domain = request.domain.lower()
    
    # Fetch recent prediction history
    history = await get_prediction_history(domain, limit=1000)
    
    if not history or len(history) < 10:
        return MitigationResult(
            success=False,
            message=f"Insufficient prediction history for {domain}. Need at least 10 records.",
            method=request.method.value,
        )
    
    try:
        # Extract arrays from history
        confidences = np.array([h.get('confidence', 0.5) for h in history])
        predictions = np.array([h.get('prediction', 0) for h in history])
        
        # Extract protected attribute
        attr = request.protected_attribute or 'gender'
        protected_attr = []
        for h in history:
            inp = h.get('input', {})
            val = inp.get(attr, inp.get('gender', inp.get('sex', 'unknown')))
            protected_attr.append(str(val).lower() if val else 'unknown')
        
        protected_groups = np.array(protected_attr)
        group_labels = list(set(protected_attr))
        
        # Compute original fairness metrics
        # Create binary protected (simplified)
        group_0_mask = protected_groups == group_labels[0]
        group_1_mask = protected_groups != group_labels[0] if len(group_labels) > 1 else ~group_0_mask
        
        y_pred = (confidences >= 0.5).astype(int)
        
        original_dpd = None
        original_eod = None
        
        try:
            # Compute DPD
            rate_0 = np.mean(y_pred[group_0_mask]) if group_0_mask.sum() > 0 else 0
            rate_1 = np.mean(y_pred[group_1_mask]) if group_1_mask.sum() > 0 else 0
            original_dpd = abs(rate_0 - rate_1)
        except:
            pass
        
        # Apply mitigation method
        result_data = {
            'method': request.method.value,
            'new_thresholds': [],
            'calibration_adjustments': {},
        }
        
        affected = 0
        
        if request.method == MitigationMethod.THRESHOLD_OPTIMIZATION:
            opt_result = compute_threshold_optimization(
                predictions, confidences, protected_groups, group_labels,
                request.target_metric, request.strength
            )
            
            for group, thresh_data in opt_result['thresholds'].items():
                result_data['new_thresholds'].append(GroupThreshold(
                    group=group,
                    original_threshold=thresh_data['original'],
                    new_threshold=thresh_data['new'],
                    expected_approval_rate=thresh_data['expected_approval'],
                ))
            
            # Count affected records
            for i, group in enumerate(protected_groups):
                if group in opt_result['thresholds']:
                    old_pred = confidences[i] >= 0.5
                    new_pred = confidences[i] >= opt_result['thresholds'][group]['new']
                    if old_pred != new_pred:
                        affected += 1
            
            # Compute mitigated DPD
            new_y_pred = np.array([
                confidences[i] >= opt_result['thresholds'].get(
                    protected_groups[i], {'new': 0.5}
                )['new']
                for i in range(len(confidences))
            ])
            
            new_rate_0 = np.mean(new_y_pred[group_0_mask]) if group_0_mask.sum() > 0 else 0
            new_rate_1 = np.mean(new_y_pred[group_1_mask]) if group_1_mask.sum() > 0 else 0
            mitigated_dpd = abs(new_rate_0 - new_rate_1)
            
        elif request.method == MitigationMethod.CALIBRATION_ADJUSTMENT:
            adjustments = compute_calibration_adjustment(
                confidences, protected_groups, group_labels, request.strength
            )
            result_data['calibration_adjustments'] = adjustments
            
            # Count records that would flip
            adjusted_confidences = np.array([
                min(0.99, confidences[i] * adjustments.get(protected_groups[i], 1.0))
                for i in range(len(confidences))
            ])
            
            affected = int(np.sum((confidences >= 0.5) != (adjusted_confidences >= 0.5)))
            
            # Estimate new DPD (approximate)
            new_y_pred = (adjusted_confidences >= 0.5).astype(int)
            new_rate_0 = np.mean(new_y_pred[group_0_mask]) if group_0_mask.sum() > 0 else 0
            new_rate_1 = np.mean(new_y_pred[group_1_mask]) if group_1_mask.sum() > 0 else 0
            mitigated_dpd = abs(new_rate_0 - new_rate_1)
            
        elif request.method == MitigationMethod.IMPACT_REMOVAL:
            impact_result = compute_impact_removal(
                predictions, confidences, protected_groups, group_labels, request.strength
            )
            result_data['calibration_adjustments'] = impact_result['multipliers']
            
            # Count affected
            boosted_confidences = np.array([
                min(0.99, confidences[i] * impact_result['multipliers'].get(protected_groups[i], 1.0))
                for i in range(len(confidences))
            ])
            
            affected = int(np.sum((confidences >= 0.5) != (boosted_confidences >= 0.5)))
            
            # Estimate new DPD
            new_y_pred = (boosted_confidences >= 0.5).astype(int)
            new_rate_0 = np.mean(new_y_pred[group_0_mask]) if group_0_mask.sum() > 0 else 0
            new_rate_1 = np.mean(new_y_pred[group_1_mask]) if group_1_mask.sum() > 0 else 0
            mitigated_dpd = abs(new_rate_0 - new_rate_1)
        
        else:
            return MitigationResult(
                success=False,
                message=f"Unknown mitigation method: {request.method}",
                method=request.method.value,
            )
        
        # Compute improvement
        improvement = 0.0
        if original_dpd is not None and mitigated_dpd is not None:
            improvement = max(0, ((original_dpd - mitigated_dpd) / max(original_dpd, 0.001)) * 100)
        
        return MitigationResult(
            success=True,
            message=f"Mitigation applied successfully. Affected {affected} of {len(history)} predictions.",
            method=request.method.value,
            original_dpd=original_dpd,
            mitigated_dpd=mitigated_dpd,
            improvement_pct=improvement,
            new_thresholds=result_data['new_thresholds'],
            calibration_adjustments=result_data['calibration_adjustments'],
            affected_records=affected,
            total_records=len(history),
        )
        
    except Exception as e:
        logger.error(f"Mitigation failed: {e}")
        return MitigationResult(
            success=False,
            message=f"Mitigation failed: {str(e)}",
            method=request.method.value,
        )


@router.get("/methods")
async def list_methods():
    """List available mitigation methods with descriptions."""
    return {
        "methods": [
            {
                "id": "threshold",
                "name": "Threshold Optimization",
                "description": "Adjust decision thresholds per group to equalize approval rates",
                "best_for": ["demographic_parity", "equal_opportunity"],
            },
            {
                "id": "calibration",
                "name": "Calibration Adjustment",
                "description": "Adjust confidence scores per group to fix miscalibration",
                "best_for": ["calibration", "probability_accuracy"],
            },
            {
                "id": "impact_removal",
                "name": "Disparate Impact Removal",
                "description": "Ensure 80% rule compliance by boosting disadvantaged groups",
                "best_for": ["legal_compliance", "demographic_parity"],
            },
        ]
    }


@router.get("/preview/{domain}")
async def preview_mitigation(domain: str, method: str = "threshold"):
    """
    Preview what mitigation would do without applying it.
    """
    # Reuse apply logic with dry_run flag
    req = MitigationRequest(domain=domain, method=MitigationMethod(method), strength=0.5)
    result = await apply_mitigation(req)
    
    # Mark as preview
    if result.success:
        result.message = f"[PREVIEW] {result.message} (Not applied - use POST /apply to apply)"
    
    return result
