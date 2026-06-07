import unittest

from analysis_engine.calculations import (
    calculate_annualized_return,
    calculate_best_period_return,
    calculate_debt_to_cash,
    calculate_eps_growth,
    calculate_event_return,
    calculate_final_value,
    calculate_gross_margin,
    calculate_max_drawdown,
    calculate_net_margin,
    calculate_pe_ratio,
    calculate_revenue_growth,
    calculate_total_return,
    calculate_worst_period_return,
    classify_growth_rate,
    classify_margin,
    classify_pe_level,
    compare_investments,
)


class ReturnCalculationTests(unittest.TestCase):
    def test_compare_investments_identifies_winner_and_gap(self):
        result = compare_investments(
            "AAA",
            10,
            30,
            "BBB",
            20,
            30,
            initial_amount=1_000,
            years=5,
        )

        self.assertEqual(result.winner, "AAA")
        self.assertEqual(result.loser, "BBB")
        self.assertAlmostEqual(result.first.final_value, 3_000)
        self.assertAlmostEqual(result.second.final_value, 1_500)
        self.assertAlmostEqual(result.final_value_difference, 1_500)
        self.assertAlmostEqual(result.return_difference, 1.5)
        self.assertAlmostEqual(result.winner_multiple, 2.0)

    def test_basic_return_functions(self):
        self.assertAlmostEqual(calculate_final_value(1_000, 10, 15), 1_500)
        self.assertAlmostEqual(calculate_total_return(1_000, 1_500), 0.5)
        self.assertAlmostEqual(calculate_annualized_return(1_000, 2_000, 10), 2 ** 0.1 - 1)


class DrawdownCalculationTests(unittest.TestCase):
    def test_max_drawdown_tracks_peak_trough_and_recovery(self):
        result = calculate_max_drawdown([100, 120, 90, 80, 125])

        self.assertAlmostEqual(result.max_drawdown, 80 / 120 - 1)
        self.assertEqual(result.peak_index, 1)
        self.assertEqual(result.trough_index, 3)
        self.assertEqual(result.recovery_index, 4)

    def test_best_and_worst_period_returns(self):
        values = [100, 110, 90, 120]

        self.assertAlmostEqual(calculate_best_period_return(values, 1), 120 / 90 - 1)
        self.assertAlmostEqual(calculate_worst_period_return(values, 1), 90 / 110 - 1)


class FundamentalCalculationTests(unittest.TestCase):
    def test_company_health_functions(self):
        self.assertAlmostEqual(calculate_revenue_growth(120, 100), 0.2)
        self.assertAlmostEqual(calculate_gross_margin(40, 100), 0.4)
        self.assertAlmostEqual(calculate_net_margin(15, 100), 0.15)
        self.assertAlmostEqual(calculate_debt_to_cash(50, 100), 0.5)

    def test_company_health_classifiers(self):
        self.assertEqual(classify_growth_rate(-0.01), "shrinking")
        self.assertEqual(classify_growth_rate(0.20), "fast")
        self.assertEqual(classify_margin(-0.01), "negative")
        self.assertEqual(classify_margin(0.35), "exceptional")


class ValuationCalculationTests(unittest.TestCase):
    def test_valuation_functions(self):
        self.assertAlmostEqual(calculate_pe_ratio(100, 5), 20)
        self.assertAlmostEqual(calculate_eps_growth(6, 5), 0.2)
        self.assertEqual(classify_pe_level(20), "normal")
        self.assertEqual(classify_pe_level(45), "extreme")


class EventCalculationTests(unittest.TestCase):
    def test_event_return_handles_before_and_after_windows(self):
        result = calculate_event_return([90, 100, 110, 121], event_index=1, periods_before=1, periods_after=2)

        self.assertEqual(result.before_index, 0)
        self.assertEqual(result.after_index, 3)
        self.assertAlmostEqual(result.before_to_event_return, 100 / 90 - 1)
        self.assertAlmostEqual(result.event_to_after_return, 121 / 100 - 1)

    def test_event_return_marks_unavailable_windows(self):
        result = calculate_event_return([100, 110], event_index=0, periods_before=1, periods_after=2)

        self.assertIsNone(result.before_index)
        self.assertIsNone(result.after_index)
        self.assertIsNone(result.before_to_event_return)
        self.assertIsNone(result.event_to_after_return)


if __name__ == "__main__":
    unittest.main()
