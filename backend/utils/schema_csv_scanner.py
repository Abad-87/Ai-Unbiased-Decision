from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, List, Optional

import pandas as pd


@dataclass(frozen=True)
class SchemaDefinition:
    schema_name: str
    file_path: str
    expected_fields: List[str]


DEFAULT_SCHEMAS: List[SchemaDefinition] = [
    SchemaDefinition(
        schema_name="SocialMediaCreator",
        file_path="/path/to/social_media.csv",
        expected_fields=["username", "platform", "followersCount", "engagementRate"],
    ),
    SchemaDefinition(
        schema_name="LoanApproval",
        file_path="/path/to/loan_approval.csv",
        expected_fields=["applicantId", "income", "loanAmount", "creditScore", "approvalStatus"],
    ),
    SchemaDefinition(
        schema_name="HiringJobApplicant",
        file_path="/path/to/job_applicant.csv",
        expected_fields=["applicantId", "name", "experienceLevel", "skills", "applicationStatus"],
    ),
]


def _normalize_col(name: str) -> str:
    return str(name).strip().lower().replace(" ", "")


def _to_numeric(series: pd.Series) -> pd.Series:
    return pd.to_numeric(series, errors="coerce")


def _missing_mask(series: pd.Series) -> pd.Series:
    return series.isna() | series.astype(str).str.strip().eq("")


def _safe_div(n: float, d: float) -> float:
    return 0.0 if d == 0 else float(n / d)


def _validate_chunk(schema_name: str, chunk: pd.DataFrame, format_issues: Dict[str, int]) -> Dict[str, int]:
    invalid_row_mask = pd.Series([False] * len(chunk), index=chunk.index)
    business_anomalies: Dict[str, int] = {}

    if schema_name == "SocialMediaCreator":
        followers = _to_numeric(chunk["followersCount"])
        engagement = _to_numeric(chunk["engagementRate"])
        normalized_engagement = engagement.copy()
        normalized_engagement = normalized_engagement.where(normalized_engagement <= 1.0, normalized_engagement / 100.0)

        issue_followers = followers.isna() | (followers < 0)
        issue_engagement = engagement.isna() | (engagement < 0) | (engagement > 100)
        format_issues["followersCount"] += int(issue_followers.sum())
        format_issues["engagementRate"] += int(issue_engagement.sum())
        invalid_row_mask = invalid_row_mask | issue_followers | issue_engagement

        suspicious = (followers > 10000) & (normalized_engagement < 0.005)
        engagement_outlier = normalized_engagement > 0.30
        business_anomalies["high_followers_low_engagement"] = int(suspicious.fillna(False).sum())
        business_anomalies["engagement_outlier"] = int(engagement_outlier.fillna(False).sum())

    elif schema_name == "LoanApproval":
        income = _to_numeric(chunk["income"])
        loan = _to_numeric(chunk["loanAmount"])
        credit = _to_numeric(chunk["creditScore"])
        approval = chunk["approvalStatus"].astype(str).str.strip().str.lower()

        issue_income = income.isna() | (income <= 0)
        issue_loan = loan.isna() | (loan <= 0)
        issue_credit = credit.isna() | (credit < 300) | (credit > 850)
        issue_approval = ~approval.isin({"approved", "rejected", "pending"})
        format_issues["income"] += int(issue_income.sum())
        format_issues["loanAmount"] += int(issue_loan.sum())
        format_issues["creditScore"] += int(issue_credit.sum())
        format_issues["approvalStatus"] += int(issue_approval.sum())
        invalid_row_mask = invalid_row_mask | issue_income | issue_loan | issue_credit | issue_approval

        ratio = loan / income.replace(0, pd.NA)
        high_lti = ratio > 1.0
        inconsistent = ((credit < 580) & (approval == "approved")) | ((credit > 750) & (approval == "rejected"))
        business_anomalies["loan_to_income_outlier"] = int(high_lti.fillna(False).sum())
        business_anomalies["approval_credit_inconsistency"] = int(inconsistent.fillna(False).sum())

    elif schema_name == "HiringJobApplicant":
        experience = chunk["experienceLevel"].astype(str).str.strip().str.lower()
        skills = chunk["skills"].astype(str).fillna("").str.strip()
        status = chunk["applicationStatus"].astype(str).str.strip().str.lower()

        issue_experience = ~(experience.isin({"entry", "mid", "senior"}) | _to_numeric(chunk["experienceLevel"]).notna())
        issue_skills = skills.eq("")
        issue_status = ~status.isin({"shortlisted", "rejected", "pending", "in_review", "in review"})
        format_issues["experienceLevel"] += int(issue_experience.sum())
        format_issues["skills"] += int(issue_skills.sum())
        format_issues["applicationStatus"] += int(issue_status.sum())
        invalid_row_mask = invalid_row_mask | issue_experience | issue_skills | issue_status

        sparse_skills = skills.str.count(r"[;,|]") <= 0
        questionable_shortlist = status.eq("shortlisted") & issue_skills
        business_anomalies["sparse_skills_profile"] = int(sparse_skills.fillna(False).sum())
        business_anomalies["shortlisted_without_skills"] = int(questionable_shortlist.fillna(False).sum())

    return {
        "invalid_rows": int(invalid_row_mask.sum()),
        **business_anomalies,
    }


def _build_insights(schema_name: str, frame: pd.DataFrame) -> List[str]:
    if frame.empty:
        return ["No rows available for insight generation."]

    if schema_name == "SocialMediaCreator":
        platform_counts = frame["platform"].astype(str).str.strip().value_counts().head(3).to_dict()
        median_followers = _to_numeric(frame["followersCount"]).median()
        avg_engagement = _to_numeric(frame["engagementRate"]).mean()
        return [
            f"Top platforms by creator count: {platform_counts}.",
            f"Median followers count is {0 if pd.isna(median_followers) else round(float(median_followers), 2)}.",
            f"Average engagement rate is {0 if pd.isna(avg_engagement) else round(float(avg_engagement), 2)}.",
        ]

    if schema_name == "LoanApproval":
        approval = frame["approvalStatus"].astype(str).str.strip().str.lower()
        approval_rate = (approval == "approved").mean() * 100
        credit = _to_numeric(frame["creditScore"])
        mean_credit = credit.mean()
        return [
            f"Approval rate is {round(float(approval_rate), 2)}%.",
            f"Average credit score is {0 if pd.isna(mean_credit) else round(float(mean_credit), 2)}.",
            "Loan-to-income outliers should be prioritized for manual risk review.",
        ]

    exp_counts = frame["experienceLevel"].astype(str).str.strip().str.lower().value_counts().head(3).to_dict()
    top_skills = (
        frame["skills"]
        .astype(str)
        .str.lower()
        .str.split(r"[;,|]")
        .explode()
        .str.strip()
        .replace("", pd.NA)
        .dropna()
        .value_counts()
        .head(5)
        .to_dict()
    )
    shortlist_rate = (frame["applicationStatus"].astype(str).str.strip().str.lower() == "shortlisted").mean() * 100
    return [
        f"Experience distribution (top): {exp_counts}.",
        f"Top extracted skills: {top_skills}.",
        f"Shortlist rate is {round(float(shortlist_rate), 2)}%.",
    ]


def _build_recommendations(schema_name: str) -> List[str]:
    if schema_name == "SocialMediaCreator":
        return [
            "Standardize engagement rate units to either 0-1 or 0-100 before ingestion.",
            "Flag accounts with high followers and very low engagement for authenticity review.",
            "Deduplicate creator records by username+platform before model usage.",
        ]
    if schema_name == "LoanApproval":
        return [
            "Reject or quarantine rows with invalid credit score or non-positive income values.",
            "Review cases with extreme loan-to-income ratio using manual underwriting checks.",
            "Audit approval inconsistencies against policy thresholds for fairness and compliance.",
        ]
    return [
        "Enforce a controlled vocabulary for experience levels and application statuses.",
        "Require minimum skill detail before candidates enter automated screening.",
        "Deduplicate applicant IDs to avoid repeated applicant scoring.",
    ]


def scan_schema_csv(defn: SchemaDefinition, chunk_size: int = 5000) -> Dict[str, Any]:
    file_path = Path(defn.file_path)
    if not file_path.exists():
        return {
            "schemaName": defn.schema_name,
            "filePath": defn.file_path,
            "error": f"File not found: {defn.file_path}",
            "overview": {"totalRows": 0, "validRows": 0, "invalidRows": 0},
            "fieldValidation": {
                "missingRequiredFields": list(defn.expected_fields),
                "fieldFormatIssues": {field: 0 for field in defn.expected_fields},
            },
            "anomalies": {"missingValues": {"count": 0, "percent": 0.0}, "duplicates": 0, "businessRuleAnomalies": {}},
            "insights": ["File could not be read."],
            "recommendations": ["Provide a valid CSV path and re-run scanning."],
        }

    try:
        header = pd.read_csv(file_path, nrows=0)
    except Exception as exc:
        return {
            "schemaName": defn.schema_name,
            "filePath": defn.file_path,
            "error": f"Failed to read CSV header: {exc}",
            "overview": {"totalRows": 0, "validRows": 0, "invalidRows": 0},
            "fieldValidation": {
                "missingRequiredFields": list(defn.expected_fields),
                "fieldFormatIssues": {field: 0 for field in defn.expected_fields},
            },
            "anomalies": {"missingValues": {"count": 0, "percent": 0.0}, "duplicates": 0, "businessRuleAnomalies": {}},
            "insights": ["File could not be parsed."],
            "recommendations": ["Ensure the file is a valid CSV with UTF-8-compatible encoding."],
        }

    source_columns = list(header.columns)
    normalized_lookup = {_normalize_col(col): col for col in source_columns}
    missing_required = [field for field in defn.expected_fields if _normalize_col(field) not in normalized_lookup]
    if missing_required:
        return {
            "schemaName": defn.schema_name,
            "filePath": defn.file_path,
            "overview": {"totalRows": 0, "validRows": 0, "invalidRows": 0},
            "fieldValidation": {
                "missingRequiredFields": missing_required,
                "fieldFormatIssues": {field: 0 for field in defn.expected_fields},
            },
            "anomalies": {"missingValues": {"count": 0, "percent": 0.0}, "duplicates": 0, "businessRuleAnomalies": {}},
            "insights": ["Schema validation failed due to missing required columns."],
            "recommendations": ["Align CSV headers with expected schema field names before scanning."],
        }

    usecols = [normalized_lookup[_normalize_col(field)] for field in defn.expected_fields]
    rename_map = {normalized_lookup[_normalize_col(field)]: field for field in defn.expected_fields}

    total_rows = 0
    invalid_rows = 0
    total_missing = 0
    missing_by_field = {field: 0 for field in defn.expected_fields}
    format_issues = {field: 0 for field in defn.expected_fields}
    business_anomaly_totals: Dict[str, int] = {}
    dedupe_keys: set[str] = set()
    duplicate_count = 0
    collected_frames: List[pd.DataFrame] = []

    for chunk in pd.read_csv(file_path, usecols=usecols, chunksize=chunk_size):
        chunk = chunk.rename(columns=rename_map)
        total_rows += len(chunk)
        collected_frames.append(chunk.copy())

        for field in defn.expected_fields:
            missing_mask = _missing_mask(chunk[field])
            missing_count = int(missing_mask.sum())
            missing_by_field[field] += missing_count
            total_missing += missing_count

        chunk_metrics = _validate_chunk(defn.schema_name, chunk, format_issues)
        invalid_rows += int(chunk_metrics.get("invalid_rows", 0))
        for key, value in chunk_metrics.items():
            if key == "invalid_rows":
                continue
            business_anomaly_totals[key] = business_anomaly_totals.get(key, 0) + int(value)

        if defn.schema_name == "SocialMediaCreator":
            keys = (
                chunk["username"].astype(str).str.strip().str.lower() + "||" + chunk["platform"].astype(str).str.strip().str.lower()
            )
        else:
            id_col = "applicantId"
            keys = chunk[id_col].astype(str).str.strip().str.lower()

        for key in keys.tolist():
            if key in dedupe_keys:
                duplicate_count += 1
            else:
                dedupe_keys.add(key)

    merged = pd.concat(collected_frames, ignore_index=True) if collected_frames else pd.DataFrame(columns=defn.expected_fields)
    valid_rows = max(0, total_rows - invalid_rows)
    missing_percent = round(_safe_div(total_missing, max(1, total_rows * max(1, len(defn.expected_fields)))) * 100.0, 2)
    insights = _build_insights(defn.schema_name, merged)
    recommendations = _build_recommendations(defn.schema_name)

    return {
        "schemaName": defn.schema_name,
        "filePath": defn.file_path,
        "overview": {
            "totalRows": int(total_rows),
            "validRows": int(valid_rows),
            "invalidRows": int(invalid_rows),
        },
        "fieldValidation": {
            "missingRequiredFields": [],
            "fieldFormatIssues": format_issues,
        },
        "anomalies": {
            "missingValues": {"count": int(total_missing), "percent": missing_percent, "byField": missing_by_field},
            "duplicates": int(duplicate_count),
            "businessRuleAnomalies": business_anomaly_totals,
        },
        "insights": insights,
        "recommendations": recommendations,
    }


def render_markdown_report(results: List[Dict[str, Any]]) -> str:
    blocks: List[str] = []
    for result in results:
        schema_name = result["schemaName"]
        overview = result.get("overview", {})
        validation = result.get("fieldValidation", {})
        anomalies = result.get("anomalies", {})
        missing = anomalies.get("missingValues", {})
        business = anomalies.get("businessRuleAnomalies", {})
        insights = result.get("insights", [])
        recommendations = result.get("recommendations", [])
        missing_required = validation.get("missingRequiredFields", [])
        format_issues = validation.get("fieldFormatIssues", {})

        lines = [
            f"## {schema_name} Report",
            "",
            "### Overview",
            f"- File: {result.get('filePath', '')}",
            f"- Total Rows: {overview.get('totalRows', 0)}",
            f"- Valid Rows: {overview.get('validRows', 0)}",
            f"- Invalid Rows: {overview.get('invalidRows', 0)}",
            "",
            "### Field Validation",
            f"- Missing required fields: {missing_required if missing_required else 'None'}",
            "- Field format issues:",
        ]
        for field, count in format_issues.items():
            lines.append(f"  - {field}: {count}")

        lines.extend(
            [
                "",
                "### Anomalies Detected",
                f"- Missing values: {missing.get('count', 0)} / {missing.get('percent', 0)}%",
                f"- Duplicates: {anomalies.get('duplicates', 0)}",
                "- Business-rule anomalies:",
            ]
        )
        for name, count in business.items():
            lines.append(f"  - {name}: {count}")

        lines.append("")
        lines.append("### Key Insights")
        for insight in insights:
            lines.append(f"- {insight}")

        lines.append("")
        lines.append("### Recommendations")
        for recommendation in recommendations:
            lines.append(f"- {recommendation}")

        blocks.append("\n".join(lines))

    return "\n\n".join(blocks)


def scan_all_schemas(
    overrides: Optional[Dict[str, str]] = None,
    chunk_size: int = 5000,
) -> Dict[str, Any]:
    override_map = overrides or {}
    schema_list = [
        SchemaDefinition(
            schema_name=item.schema_name,
            file_path=override_map.get(item.schema_name, item.file_path),
            expected_fields=item.expected_fields,
        )
        for item in DEFAULT_SCHEMAS
    ]

    results = [scan_schema_csv(schema, chunk_size=chunk_size) for schema in schema_list]
    markdown_report = render_markdown_report(results)
    return {
        "results": results,
        "markdown_report": markdown_report,
    }
