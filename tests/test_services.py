import unittest

from analysis_engine.services import (
    build_company_snapshot,
    build_investment_analysis,
    build_investment_comparison,
)


class ServiceTests(unittest.TestCase):
    def test_build_investment_comparison(self):
        result = build_investment_comparison(
            "AAPL",
            "MSFT",
            initial_amount=10_000,
            years=5,
        )

        self.assertEqual(result["input"]["first_ticker"], "AAPL")
        self.assertEqual(result["input"]["second_ticker"], "MSFT")
        self.assertIn(result["comparison"]["winner"], {"AAPL", "MSFT"})
        self.assertGreater(result["comparison"]["first"]["final_value"], 0)
        self.assertGreater(result["comparison"]["second"]["final_value"], 0)

    def test_build_company_snapshot(self):
        result = build_company_snapshot("AAPL")

        self.assertEqual(result["ticker"], "AAPL")
        self.assertGreater(result["price"]["latest_adj_close"], 0)
        self.assertGreater(result["fundamentals"]["latest_revenue"], 0)
        self.assertGreater(result["valuation"]["pe_ratio"], 0)

    def test_build_investment_analysis(self):
        result = build_investment_analysis(
            "AAPL",
            benchmark="SPY",
            initial_amount=10_000,
            start_date="2010-01-04",
        )

        self.assertEqual(result["input"]["ticker"], "AAPL")
        self.assertEqual(result["input"]["benchmark"], "SPY")
        self.assertIn("company_snapshot", result)
        self.assertLessEqual(result["risk"]["max_drawdown"]["max_drawdown"], 0)
        self.assertIn("ceo_events", result["events"])


if __name__ == "__main__":
    unittest.main()
