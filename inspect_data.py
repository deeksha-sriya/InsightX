import pandas as pd
from dotenv import load_dotenv
import os

load_dotenv()

metrics = pd.read_csv("data/daily_product_metrics.csv")

all_products = metrics.copy()

all_products["date"] = pd.to_datetime(all_products["date"])

all_products = all_products.sort_values(["product_id", "date"])

product_days = all_products.groupby("product_id")["date"].nunique()

eligible_products = product_days[product_days >= 30].index

all_products = all_products[
    all_products["product_id"].isin(eligible_products)
].copy()

all_products = (
    all_products
    .set_index("date")
    .groupby("product_id")
    .resample("D")
    .asfreq()
    .fillna(0)
    .reset_index()
)

all_products["purchase_7day_avg"] = (
    all_products
    .groupby("product_id")["purchase"]
    .transform(
        lambda x: x.rolling(7, min_periods=3).mean().shift(1)
    )
)

all_products["purchase_7day_std"] = (
    all_products
    .groupby("product_id")["purchase"]
    .transform(
        lambda x: x.rolling(7, min_periods=3).std().shift(1)
    )
)

all_products["purchase_zscore"] = (
    (all_products["purchase"] - all_products["purchase_7day_avg"])
    / all_products["purchase_7day_std"].replace(0, pd.NA)
)

all_products["purchase_change_pct"] = (
    (all_products["purchase"] - all_products["purchase_7day_avg"])
    / all_products["purchase_7day_avg"].replace(0, pd.NA)
) * 100

all_products["view_7day_avg"] = (
    all_products
    .groupby("product_id")["view"]
    .transform(
        lambda x: x.rolling(7, min_periods=3).mean().shift(1)
    )
)

all_products["view_7day_std"] = (
    all_products
    .groupby("product_id")["view"]
    .transform(
        lambda x: x.rolling(7, min_periods=3).std().shift(1)
    )
)

all_products["view_zscore"] = (
    (all_products["view"] - all_products["view_7day_avg"])
    / all_products["view_7day_std"].replace(0, pd.NA)
)

all_products["cart_7day_avg"] = (
    all_products
    .groupby("product_id")["cart"]
    .transform(
        lambda x: x.rolling(7, min_periods=3).mean().shift(1)
    )
)

all_products["cart_7day_std"] = (
    all_products
    .groupby("product_id")["cart"]
    .transform(
        lambda x: x.rolling(7, min_periods=3).std().shift(1)
    )
)

all_products["cart_zscore"] = (
    (all_products["cart"] - all_products["cart_7day_avg"])
    / all_products["cart_7day_std"].replace(0, pd.NA)
)

all_products["cart_anomaly"] = (
    (all_products["cart_zscore"] >= 2)
    & (all_products["cart"] >= 10)
)

all_products["demand_anomaly"] = (
    (all_products["purchase_zscore"] >= 2)
    & (all_products["purchase"] >= 10)
)

all_products["interest_anomaly"] = (
    (all_products["view_zscore"] >= 2)
    & (all_products["view"] >= 10)
)

all_products["purchase_to_view_ratio"] = (
    all_products["purchase"]
    / all_products["view"].replace(0, pd.NA)
) * 100

all_products["combined_demand_signal"] = (
    all_products["demand_anomaly"]
    & all_products["interest_anomaly"]
)

all_products["full_funnel_signal"] = (
    all_products["interest_anomaly"]
    & all_products["cart_anomaly"]
    & all_products["demand_anomaly"]
)

top_events = (
    all_products[
        all_products["full_funnel_signal"]
    ]
    .sort_values("purchase_zscore", ascending=False)
)

insight_events = all_products[
    all_products["full_funnel_signal"]
].copy()

insight_events = insight_events[
    [
        "product_id",
        "date",
        "view",
        "cart",
        "purchase",
        "view_7day_avg",
        "cart_7day_avg",
        "purchase_7day_avg",
        "view_zscore",
        "cart_zscore",
        "purchase_zscore"
    ]
].copy()

insight_events.to_csv(
    "data/insight_events.csv",
    index=False
)

event = insight_events.iloc[0].to_dict()

# Calculate average daily purchases for each product
product_demand = (
    all_products
    .groupby("product_id")["purchase"]
    .mean()
    .reset_index(name="avg_daily_purchase")
)

product_demand["simulated_inventory"] = (
    product_demand["avg_daily_purchase"] * 14
).clip(lower=10).round().astype(int)

simulated_inventory = product_demand.loc[
    product_demand["product_id"] == event["product_id"],
    "simulated_inventory"
].iloc[0]

def generate_insight(event, simulated_inventory, normal_days_of_stock=14):

    current_purchase_rate = event["purchase"]

    days_of_stock = (
        simulated_inventory / current_purchase_rate
        if current_purchase_rate > 0
        else float("inf")
    )

    stockout_risk = days_of_stock < 7

    view_change_pct = (
        (event["view"] - event["view_7day_avg"])
        / event["view_7day_avg"]
        * 100
        if event["view_7day_avg"] > 0
        else 0
    )

    cart_change_pct = (
        (event["cart"] - event["cart_7day_avg"])
        / event["cart_7day_avg"]
        * 100
        if event["cart_7day_avg"] > 0
        else 0
    )

    purchase_change_pct = (
        (event["purchase"] - event["purchase_7day_avg"])
        / event["purchase_7day_avg"]
        * 100
        if event["purchase_7day_avg"] > 0
        else 0
    )

    if stockout_risk:
        recommendation = "Review inventory and consider replenishment."
    else:
        recommendation = "Inventory coverage appears healthy."

    insight = {
        "product_id": event["product_id"],
        "date": event["date"],

        "views": event["view"],
        "view_baseline": round(event["view_7day_avg"], 2),
        "view_change_pct": round(view_change_pct, 1),

        "cart_events": event["cart"],
        "cart_baseline": round(event["cart_7day_avg"], 2),
        "cart_change_pct": round(cart_change_pct, 1),

        "purchase_events": event["purchase"],
        "purchase_baseline": round(event["purchase_7day_avg"], 2),
        "purchase_change_pct": round(purchase_change_pct, 1),

        "normal_stock_days": normal_days_of_stock,
        "current_stock_days": round(days_of_stock, 2),
        "stockout_risk": stockout_risk,

        "recommendation": recommendation
    }

    return insight

insight = generate_insight(
    event,
    simulated_inventory
)

all_insights = []

for _, row in insight_events.iterrows():

    event = row.to_dict()

    simulated_inventory = product_demand.loc[
        product_demand["product_id"] == event["product_id"],
        "simulated_inventory"
    ].iloc[0]

    insight = generate_insight(
        event,
        simulated_inventory
    )

    all_insights.append(insight)

insights_df = pd.DataFrame(all_insights)

insights_df.to_csv(
    "data/insights.csv",
    index=False
)

print(insights_df.iloc[0])

# event_for_ai = insights_df.iloc[0]

# def create_investigation_input(insight):

#     return f"""
# Product {int(insight['product_id'])} showed unusual demand on {insight['date'].date()}.

# Observed demand:
# - Views: {int(insight['views'])} ({insight['view_change_pct']:.1f}% above baseline)
# - Cart events: {int(insight['cart_events'])} ({insight['cart_change_pct']:.1f}% above baseline)
# - Purchase events: {int(insight['purchase_events'])} ({insight['purchase_change_pct']:.1f}% above baseline)

# Inventory:
# - Normal simulated coverage: {insight['normal_stock_days']} days
# - Current estimated coverage: {insight['current_stock_days']:.2f} days
# - Potential stockout risk: {insight['stockout_risk']}
# """
# def create_ai_prompt(insight):

#     investigation_input = create_investigation_input(insight)

#     return f"""
# You are the business intelligence analyst for InsightX.

# Analyze the following detected demand event.

# {investigation_input}

# Important rules:
# 1. Only make claims supported by the provided data.
# 2. Do not claim that a marketing campaign, social media post, advertisement, or other external event caused the demand increase unless evidence is provided.
# 3. Do not call event ratios customer conversion rates.
# 4. Clearly distinguish observed facts from possible explanations.
# 5. Do not invent missing data.
# 6. Provide practical business actions.

# Explain:
# - What changed?
# - What signals indicate unusual demand?
# - What possible explanations should the business investigate?
# - What action should the business consider?
# """
# test_prompt = create_ai_prompt(insights_df.iloc[0])

# insights_df["ai_analysis"] = None

# insights_df.to_csv(
#     "data/insights.csv",
#     index=False
# )

# print(insights_df["current_stock_days"].describe())
# print(product_demand.head())

# from google import genai

# client = genai.Client(
#     api_key=os.getenv("GEMINI_API_KEY")
# )

# interaction = client.interactions.create(
#     model="gemini-3.6-flash",
#     input=f"""
# You are the business intelligence analyst for InsightX.

# Analyze the following detected demand event.

# Event data:
# {event}

# Important rules:
# 1. Only make claims directly supported by the provided data.
# 2. Do not claim that a specific marketing campaign, social media post, advertisement, or other external event caused the spike unless that evidence is provided.
# 3. Do not call event ratios "customer conversion rates" because these are event counts, not unique-user funnel data.
# 4. Clearly distinguish observed facts from possible explanations.
# 5. Give practical business actions based on the observed signals.

# Explain:
# - What changed?
# - How unusual was the change?
# - What does the combination of views, carts, and purchases suggest?
# - What should the business investigate next?
# """
# )

# print(interaction.output_text)