// Code excerpts shown on each case-study page. Same in every language.
export default {
  p1: {
    lang: 'Python',
    code: `import pandas as pd
import statsmodels.formula.api as smf

contacts = pd.read_csv("contacts_with_survey.csv")

# Data checks before any analysis
contacts = contacts.drop_duplicates("contact_id")
contacts = contacts[contacts["reason"].notna() & contacts["wait_sec"].between(0, 3600)]

contacts["satisfied"] = (contacts["csat"] >= 4).astype(int)
contacts["long_wait"] = (contacts["wait_sec"] > 120).astype(int)

# Does each factor still matter when the others are held constant?
model = smf.logit(
    "satisfied ~ fcr + transfers + long_wait + new_agent"
    " + native_language + C(reason) + C(queue)",
    data=contacts,
).fit()

print(model.summary())`,
  },
  p2: {
    lang: 'SQL + DAX',
    code: `-- One definition of each metric, used by every report
CREATE VIEW agent_month AS
SELECT
  c.agent_id,
  date_trunc('month', c.started_at)           AS month,
  AVG(c.handle_sec)                           AS aht_sec,
  AVG(CASE WHEN r.repeat_7d THEN 0 ELSE 1 END) AS fcr,
  AVG(s.csat_top2)                            AS csat,
  AVG(q.score)                                AS qa_score
FROM contacts c
LEFT JOIN repeats  r ON r.contact_id = c.contact_id
LEFT JOIN surveys  s ON s.contact_id = c.contact_id
LEFT JOIN qa_evals q ON q.contact_id = c.contact_id
GROUP BY 1, 2;

-- DAX: flag a tile only when the target is missed
QA vs target =
VAR qa = AVERAGE ( agent_month[qa_score] )
RETURN IF ( qa < 85, "#B5179E", "#5B3FD1" )`,
  },
  p3: {
    lang: 'PostgreSQL',
    code: `WITH ordered AS (
  SELECT
    contact_id,
    customer_id,
    reason,
    started_at,
    LEAD(started_at) OVER w AS next_at,
    LEAD(reason)     OVER w AS next_reason
  FROM contacts
  WINDOW w AS (PARTITION BY customer_id ORDER BY started_at)
)
SELECT
  reason,
  COUNT(*)                                          AS contacts,
  ROUND(100.0 * AVG(
    CASE WHEN next_reason = reason
          AND next_at < started_at + INTERVAL '7 days'
         THEN 1 ELSE 0 END), 1)                     AS repeat_rate_pct
FROM ordered
GROUP BY reason
ORDER BY repeat_rate_pct DESC;`,
  },
  p4: {
    lang: 'Python',
    code: `from math import exp, factorial

def erlang_c(agents: int, traffic: float) -> float:
    """Probability that a contact has to wait."""
    top = traffic**agents / factorial(agents) * agents / (agents - traffic)
    bottom = sum(traffic**k / factorial(k) for k in range(agents)) + top
    return top / bottom

def agents_needed(contacts_per_hour, aht_sec=380, target_sec=20, level=0.80):
    traffic = contacts_per_hour * aht_sec / 3600      # in Erlangs
    agents = int(traffic) + 1
    while True:
        wait = erlang_c(agents, traffic)
        service = 1 - wait * exp(-(agents - traffic) * target_sec / aht_sec)
        if service >= level:
            return agents, round(service, 3)
        agents += 1

print(agents_needed(137))   # late-morning peak on a Monday`,
  },
  p5: {
    lang: 'Python',
    code: `import pandas as pd

scores = pd.read_csv("calibration_session.csv")   # one row per evaluator x contact

consensus = scores.groupby("contact_id")["total"].median().rename("consensus")
scores = scores.join(consensus, on="contact_id")
scores["diff"] = scores["total"] - scores["consensus"]

by_evaluator = scores.groupby("evaluator")["diff"].mean().round(1)

# Item agreement: share of contacts where every evaluator gave the same pass/fail
items = pd.read_csv("calibration_items.csv")
agreement = (
    items.groupby(["item", "contact_id"])["passed"].nunique().eq(1)
         .groupby("item").mean().mul(100).sort_values()
)`,
  },
  p6: {
    lang: 'SQL',
    code: `WITH members AS (
  SELECT member_id,
         date_trunc('month', signup_at) AS cohort,
         onboarding_channel
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
