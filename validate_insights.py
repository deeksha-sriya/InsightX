from pathlib import Path
import pandas as pd

df = pd.read_csv("data/insights.csv")

required = [
    "product_id",
    "date",
    "purchase_events",
    "priority_score",
    "stockout_risk",
]

missing = [col for col in required if col not in df.columns]
if missing:
    raise ValueError(f"Missing columns: {missing}")

df["priority_score"] = pd.to_numeric(
    df["priority_score"], errors="coerce"
)

df["stockout_risk_bool"] = (
    df["stockout_risk"]
    .astype(str)
    .str.strip()
    .str.lower()
    .isin(["true", "1", "yes"])
)

critical = df["priority_score"] >= 75
high = (
    (df["priority_score"] >= 50)
    & (df["priority_score"] < 75)
)
moderate = (
    (df["priority_score"] >= 25)
    & (df["priority_score"] < 50)
)
low = df["priority_score"] < 25

print("\n=== INSIGHTX DATA-INTEGRITY REPORT ===")
print(f"Total events: {len(df):,}")
print(f"Unique products: {df['product_id'].nunique():,}")
print(f"Critical events: {critical.sum():,}")
print(f"High-priority events: {high.sum():,}")
print(f"Moderate-priority events: {moderate.sum():,}")
print(f"Low-priority events: {low.sum():,}")
print(f"Potential stockout-risk events: {df['stockout_risk_bool'].sum():,}")

print("\n=== DATA QUALITY ===")
print(f"Missing product IDs: {df['product_id'].isna().sum():,}")
print(f"Missing dates: {df['date'].isna().sum():,}")
print(f"Missing priority scores: {df['priority_score'].isna().sum():,}")
print(
    "Duplicate product/date rows:",
    df.duplicated(["product_id", "date"]).sum()
)

print("\n=== TOP 5 PRIORITY EVENTS ===")
columns = [
    col for col in [
        "product_id",
        "date",
        "purchase_events",
        "purchase_change_pct",
        "current_stock_days",
        "priority_score",
        "stockout_risk",
    ]
    if col in df.columns
]

print(
    df.sort_values("priority_score", ascending=False)[columns]
    .head(5)
    .to_string(index=False)
)