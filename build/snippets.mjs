// Code excerpts shown on each case-study page. Same in every language.
export default {
  p1: {
    lang: 'SQL + DAX',
    code: `-- Monthly revenue and returns by category (feeds the Power BI model)
SELECT
  date_trunc('month', o.ordered_at)              AS month,
  p.category,
  COUNT(DISTINCT o.order_id)                     AS orders,
  SUM(oi.quantity * oi.unit_price)               AS revenue,
  AVG(CASE WHEN r.order_id IS NOT NULL THEN 1.0 ELSE 0 END) AS return_rate
FROM orders o
JOIN order_items oi USING (order_id)
JOIN products    p  USING (product_id)
LEFT JOIN returns r USING (order_id)
WHERE o.status <> 'cancelled'
GROUP BY 1, 2;

-- DAX measures
Average order value = DIVIDE ( [Revenue], [Orders] )
Revenue vs last year % =
VAR prev = CALCULATE ( [Revenue], SAMEPERIODLASTYEAR ( 'Date'[Date] ) )
RETURN DIVIDE ( [Revenue] - prev, prev )`,
  },
  p2: {
    lang: 'Python',
    code: `import pandas as pd
from statsmodels.stats.proportion import proportions_ztest, proportion_confint

sessions = pd.read_csv("checkout_experiment.csv")   # one row per session

# Guard against a broken split before reading any result
split = sessions["variant"].value_counts(normalize=True)
assert abs(split["A"] - 0.5) < 0.01, "Sample ratio mismatch"

summary = sessions.groupby("variant")["converted"].agg(["sum", "count"])
z, p_value = proportions_ztest(summary["sum"], summary["count"])
low, high = proportion_confint(summary["sum"], summary["count"], method="wilson")

by_device = (sessions.groupby(["device", "variant"])["converted"]
                     .mean().mul(100).round(2).unstack())
print(summary, f"p = {p_value:.4f}", by_device, sep="\\n")`,
  },
  p3: {
    lang: 'PostgreSQL',
    code: `WITH steps AS (
  SELECT
    user_id,
    device,
    MAX(CASE WHEN event = 'landing_view'   THEN 1 ELSE 0 END) AS s1_landing,
    MAX(CASE WHEN event = 'signup_start'   THEN 1 ELSE 0 END) AS s2_start,
    MAX(CASE WHEN event = 'email_entered'  THEN 1 ELSE 0 END) AS s3_email,
    MAX(CASE WHEN event = 'email_verified' THEN 1 ELSE 0 END) AS s4_verified,
    MAX(CASE WHEN event = 'profile_done'   THEN 1 ELSE 0 END) AS s5_profile,
    MAX(CASE WHEN event = 'first_project'  THEN 1 ELSE 0 END) AS s6_first
  FROM events
  WHERE occurred_at >= now() - INTERVAL '30 days'
  GROUP BY user_id, device
)
SELECT
  device,
  SUM(s1_landing)  AS landing,
  SUM(s2_start)    AS started,
  SUM(s4_verified) AS verified,
  SUM(s6_first)    AS activated,
  ROUND(100.0 * SUM(s4_verified) / NULLIF(SUM(s3_email), 0), 1) AS verify_rate_pct
FROM steps
GROUP BY device;`,
  },
  p4: {
    lang: 'Python',
    code: `import pandas as pd

answers = pd.read_csv("sus_answers.csv")   # participant, round, q1..q10 (1 to 5)

odd  = [f"q{i}" for i in (1, 3, 5, 7, 9)]
even = [f"q{i}" for i in (2, 4, 6, 8, 10)]

# System Usability Scale: positive items score x-1, negative items 5-x, then x2.5
answers["sus"] = ((answers[odd] - 1).sum(axis=1)
                  + (5 - answers[even]).sum(axis=1)) * 2.5

tasks = pd.read_csv("task_results.csv")     # participant, round, task, success, seconds
summary = tasks.groupby(["round", "task"]).agg(
    success_rate=("success", "mean"),
    median_time=("seconds", "median"),
)
print(answers.groupby("round")["sus"].mean().round(1))`,
  },
  p5: {
    lang: 'Python',
    code: `import numpy as np
import pandas as pd

weekly = pd.read_csv("orders.csv", parse_dates=["date"]).resample("W", on="date")["order_id"].count()

def seasonal_forecast(history: pd.Series, horizon: int = 12) -> np.ndarray:
    """Same week last year, scaled by recent year-on-year growth."""
    growth = history[-12:].mean() / history[-64:-52].mean()
    return history[-52:-52 + horizon].to_numpy() * growth

# Honest test: hide the last 12 weeks, forecast them, compare
train, test = weekly[:-12], weekly[-12:]
pred = seasonal_forecast(train)
mape = np.mean(np.abs(pred - test.to_numpy()) / test.to_numpy()) * 100
print(f"MAPE on the last 12 weeks: {mape:.1f}%")`,
  },
  p6: {
    lang: 'SQL',
    code: `WITH members AS (
  SELECT member_id,
         date_trunc('month', signup_at) AS cohort,
         saw_onboarding_tour
  FROM memberships
),
activity AS (
  SELECT m.cohort, m.member_id,
         (EXTRACT(YEAR FROM age(a.month, m.cohort)) * 12
          + EXTRACT(MONTH FROM age(a.month, m.cohort)))::int AS month_n
  FROM members m
  JOIN monthly_activity a USING (member_id)
)
SELECT cohort,
       month_n,
       ROUND(100.0 * COUNT(DISTINCT member_id)
             / FIRST_VALUE(COUNT(DISTINCT member_id))
               OVER (PARTITION BY cohort ORDER BY month_n), 1) AS retained_pct
FROM activity
GROUP BY cohort, month_n
ORDER BY cohort, month_n;`,
  },
};
