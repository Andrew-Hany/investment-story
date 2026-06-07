import unittest

import pandas as pd

from analysis_engine.data_access import annual_statement_rows
from analysis_engine.utils import ceo_events, compact_money, money, pct, row_on_or_after, row_on_or_before


class DateHelperTests(unittest.TestCase):
    def test_row_selection_helpers(self):
        frame = pd.DataFrame(
            {
                "date": pd.to_datetime(["2020-01-02", "2020-01-06", "2020-01-07"]),
                "value": [1, 2, 3],
            }
        )

        self.assertEqual(row_on_or_after(frame, "2020-01-03")["value"], 2)
        self.assertEqual(row_on_or_before(frame, "2020-01-03")["value"], 1)


class EventHelperTests(unittest.TestCase):
    def test_ceo_events_filters_only_ceo_rows(self):
        events = {
            "timeline_events": [
                {
                    "date": "2020-01-01",
                    "event_type": "Corporate Milestone",
                    "description": "Jane Doe appointed as Chief Executive Officer.",
                    "details": {
                        "executive_name": "Jane Doe",
                        "role": "Chief Executive Officer",
                        "action": "appointed",
                    },
                },
                {
                    "date": "2020-02-01",
                    "event_type": "Corporate Milestone",
                    "description": "John Doe appointed as Chief Financial Officer.",
                    "details": {
                        "executive_name": "John Doe",
                        "role": "Chief Financial Officer",
                        "action": "appointed",
                    },
                },
            ]
        }

        result = ceo_events(events, "2019-01-01", "2021-01-01")

        self.assertEqual(len(result), 1)
        self.assertEqual(result.iloc[0]["executive_name"], "Jane Doe")


class FormattingHelperTests(unittest.TestCase):
    def test_money_formatters(self):
        self.assertEqual(money(1234.4), "$1,234")
        self.assertEqual(compact_money(2_500_000_000), "$2.5B")
        self.assertEqual(compact_money(3_200_000), "$3.2M")
        self.assertEqual(pct(0.1234), "12.3%")
        self.assertEqual(pct(None), "n/a")


class DataAccessHelperTests(unittest.TestCase):
    def test_annual_statement_rows_flattens_values(self):
        fundamentals = {
            "annual": {
                "income_statement": [
                    {"period_end": "2021-12-31", "values": {"total_revenue": 120}},
                    {"period_end": "2020-12-31", "values": {"total_revenue": 100}},
                ]
            }
        }

        result = annual_statement_rows(fundamentals, "income_statement")

        self.assertEqual(result.iloc[0]["period_end"], "2020-12-31")
        self.assertEqual(result.iloc[1]["total_revenue"], 120)


if __name__ == "__main__":
    unittest.main()
