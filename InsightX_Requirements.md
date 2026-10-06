# InsightX

## AI Demand Intelligence for Online Businesses

### Tagline

Detect demand before it becomes a business problem.

---

## Business

**Company:** GlowMuse
**Industry:** Online Beauty / E-commerce

GlowMuse is a fictional online beauty brand selling skincare and beauty products.

---

## Problem

Online businesses often discover rising product demand only after sales have already increased significantly.

A product may suddenly become popular because of:

* A viral social media post
* Increased website traffic
* A creator/influencer mention
* A promotion
* Seasonal demand
* A festival or event
* Changing customer interest

If the business detects these signals too late, popular products may run out of stock and potential sales may be lost.

---

## Solution

InsightX continuously analyzes business signals and detects unusual changes in product interest and demand.

It connects signals from social media, website activity, sales, inventory, pricing, promotions, and contextual events.

InsightX should answer:

> **"What is happening, why is it happening, what could happen next, and what should the business look at?"**

---

## Core Workflow

### 1. Monitor

Track signals such as:

* Social media views
* Shares
* Saves
* Clicks
* Website visitors
* Product-page views
* Add-to-carts
* Checkouts
* Orders
* Revenue
* Inventory
* Product price
* Discounts
* Promotions
* Traffic sources

### 2. Detect

Identify unusual changes such as:

* Sudden increase in product interest
* Rapid increase in orders
* Viral social media content
* Unusual website traffic
* Abnormal conversion rate
* Rapid inventory depletion

### 3. Investigate

Connect different signals to understand what may be driving the change.

Example:

Social media spike
→ Website traffic increase
→ Product-page views increase
→ Add-to-carts increase
→ Orders increase
→ Inventory decreases

### 4. Anticipate

Estimate potential business outcomes using current demand trends.

Examples:

* Potential stockout
* Continued demand increase
* Demand returning to normal
* Potential missed sales

### 5. Alert & Recommend

Notify the business owner when an important demand signal is detected.

Provide:

* What happened
* Which product is affected
* Why it appears to be happening
* Evidence supporting the finding
* Potential business impact
* Suggested action

---

## Example Investigation

### Product

GlowBoost Vitamin C Serum

### Previous Day

* Reel views: 12,000
* Product-page views: 1,100
* Add-to-carts: 80
* Orders: 25
* Inventory: 420

### Current Day

* Reel views: 180,000
* Product-page views: 14,500
* Add-to-carts: 1,420
* Orders: 310
* Inventory: 110

### InsightX Output

**Demand Spike Detected**

Demand signals for GlowBoost Vitamin C Serum are significantly above the historical baseline.

**Primary signal:** Social media

**Supporting signals:**

* Social media views increased significantly
* Product-page traffic increased
* Add-to-carts increased
* Orders accelerated
* Inventory is declining rapidly

**Potential Risk:** High inventory depletion risk

**Potential Action:** Review replenishment capacity and closely monitor demand.

---

## Data Sources

### Social Media

* Reel views
* Likes
* Shares
* Saves
* Comments
* Link clicks
* Post date

### Website Analytics

* Visitors
* Product-page views
* Add-to-carts
* Checkout starts
* Purchases
* Conversion rate
* Traffic source
* Device

### Business Data

* Orders
* Revenue
* Product
* Price
* Discounts
* Inventory
* Promotion

### Context

* Historical demand
* Seasonality
* Festivals
* Campaigns
* Product launches

---

## Initial Scope

For the first version:

* 5–10 products
* Synthetic data
* Online beauty business
* Simulated social media data
* Simulated website analytics
* Simulated sales data
* Simulated inventory data
* Basic seasonality/context data

No real social media API integrations are required for the first version.

---

## AI Responsibilities

Gemini should help InsightX:

1. Understand the business question
2. Interpret available signals
3. Investigate relationships between signals
4. Explain detected patterns
5. Summarize supporting evidence
6. Explain potential risks
7. Generate business recommendations

Calculations such as percentage changes, demand velocity, conversion rates, and stockout estimates should be performed using deterministic code rather than asking the AI to calculate them.

---

## Initial User Question

> "Is there any product showing unusual demand right now, and why?"

---

## Initial Dashboard

The application should eventually show:

* Overall demand health
* Products with unusual demand
* Demand spike alerts
* Inventory risk
* Social media signals
* Website signals
* Investigation timeline
* Root-cause/evidence view
* AI explanation
* Recommended actions
* What-if analysis
