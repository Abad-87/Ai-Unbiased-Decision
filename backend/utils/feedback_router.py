"""
utils/feedback_router.py

Ground-truth feedback endpoint.

Clients call ``POST /feedback`` after the real-world outcome of a previously
returned prediction becomes known (e.g. the candidate was actually hired,
the loan was actually repaid, the user actually engaged with the
recommended category).  The observed label is attached to the prediction
record so the batch post-processing pipeline can compute *real* fairness
metrics (Equalized Odds, Calibration) instead of trivially comparing the
model to itself.

Security / privacy
------------------
* Body size + injection guard are already applied by the security
  middleware in main.py.
* The correlation_id is injection-guarded by the Pydantic schema.
* No PII is accepted or returned.
"""

from __future__ import annotations

import logging
import asyncio

from fastapi import APIRouter, HTTPException, Request

from utils.database import update_ground_truth
from utils.validation import FeedbackRequest, FeedbackResponse

router = APIRouter()
logger = logging.getLogger("feedback.router")


@router.post(
    "/feedback",
    response_model=FeedbackResponse,
    summary="Attach observed ground-truth label to a prediction",
    tags=["Feedback"],
)
async def submit_feedback(request: Request, body: FeedbackRequest) -> FeedbackResponse:
    """
    Record the real-world outcome for a prediction previously returned by
    ``/hiring/predict``, ``/loan/predict`` or ``/social/recommend``.

    Enables Phase-2 post-processing fairness checks (Equalized Odds,
    Calibration) to operate on real labels.
    """
    correlation_id = getattr(request.state, "correlation_id", body.correlation_id)
    updated = await update_ground_truth(body.correlation_id, body.ground_truth)
    for _ in range(5):
        if updated:
            break
        await asyncio.sleep(0.25)
        updated = await update_ground_truth(body.correlation_id, body.ground_truth)

    if not updated:
        logger.warning(
            f"[feedback] correlation_id={body.correlation_id[:8]}\u2026 not found"
        )
        raise HTTPException(
            status_code=404,
            detail=(
                "No prediction found with that correlation_id. "
                "Feedback can only be attached to previously issued predictions."
            ),
        )

    logger.info(
        f"[feedback] ground_truth={body.ground_truth} "
        f"correlation_id={body.correlation_id[:8]}\u2026"
    )
    return FeedbackResponse(
        correlation_id=body.correlation_id,
        updated=True,
        message="Ground-truth label recorded. It will be used for the next "
        "post-processing fairness evaluation.",
    )
