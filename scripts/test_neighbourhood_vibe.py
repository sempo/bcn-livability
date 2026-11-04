"""Unit tests for build_neighbourhood_vibe helpers (review tagging, name matching, ESM scores, frontend export)."""

import unittest

import numpy as np
import pandas as pd

from build_neighbourhood_vibe import (
    PROBLEMS, barri_vibe_json, norm, score_0_10, shrink, tag_reviews, wshare,
)


class TagReviews(unittest.TestCase):
    def tags(self, text):
        row = tag_reviews(pd.Series([text])).iloc[0]
        return {k for k, v in row.items() if v}

    def test_positive_mentions(self):
        self.assertEqual(self.tags("Very quiet street, felt safe at night"), {"quiet", "safe"})
        self.assertEqual(self.tags("Zona muy animada y con vida nocturna"), {"lively", "nightlife"})
        self.assertEqual(self.tags("Sehr ruhige Wohngegend"), {"quiet", "local"})

    def test_negated_mentions_are_dropped(self):
        self.assertEqual(self.tags("No noise at all"), set())
        self.assertEqual(self.tags("sin ruido"), set())
        self.assertEqual(self.tags("kein Lärm"), set())

    def test_negation_does_not_hide_later_mention(self):
        self.assertEqual(self.tags("No noise inside, but the street was loud"), {"noisy"})

    def test_unsafe_is_not_safe(self):
        self.assertEqual(self.tags("We did not feel safe here, pickpockets everywhere"), {"unsafe"})

    def test_german_laut_meaning_according_to_is_ignored(self):
        self.assertEqual(self.tags("Alles laut Beschreibung"), set())


class Helpers(unittest.TestCase):
    def test_norm_matches_esm_and_geometry_names(self):
        self.assertEqual(norm("el Poble-sec"), norm("EL POBLE SEC"))
        self.assertEqual(norm("Sant Gervasi - Galvany"), norm("SANT GERVASI-GALVANY"))
        self.assertEqual(norm("la Vila Olímpica del Poblenou"), norm("LA VILA OLÍMPICA DEL POBLENOU"))

    def test_score_0_10(self):
        s = score_0_10(pd.Series(["0 = GENS SATISFET/A", "7", "10 = MOLT SATISFET/A", "NO HO SAP", None]))
        self.assertEqual(s.tolist()[:3], [0, 7, 10])
        self.assertTrue(s.iloc[3:].isna().all())

    def test_wshare_excludes_dont_know(self):
        s = pd.Series(["UN DELS MILLORS", "UN DELS PITJORS", "NO HO SAP", "UN DELS MILLORS"])
        w = pd.Series([1.0, 1.0, 5.0, 2.0])
        self.assertAlmostEqual(wshare(s, w, {"UN DELS MILLORS"}), 75.0)


class Shrink(unittest.TestCase):
    def test_no_interviews_gives_gran_barri_mean(self):
        self.assertEqual(shrink(6.0, 0, 8.0, k=100), 8.0)

    def test_n_equal_k_is_midpoint(self):
        self.assertEqual(shrink(6.0, 100, 8.0, k=100), 7.0)

    def test_large_sample_stays_close_to_barri_mean(self):
        self.assertAlmostEqual(shrink(6.0, 900, 8.0, k=100), 6.2)


class FrontendExport(unittest.TestCase):
    def test_barri_vibe_json(self):
        probs = {f"esm_prob_{k}_pct": [10.0, 30.0] for k in PROBLEMS}
        vibe = pd.DataFrame({
            "BARRI": ["01", "02"], "NOM": ["el Raval", "la Clota"], "esm_n": [770, 19],
            "esm_satisf": [6.551, 8.0], "esm_satisf_adj": [6.6, 7.9], "esm_stay_pct": [36.1, 70.0],
            "esm_satisf_delta": [-0.62, np.nan], **probs,
        })
        out = barri_vibe_json(vibe)
        self.assertNotIn("hexes", out)
        self.assertEqual(out["city"]["satisf"], 7.28)
        self.assertEqual(out["city"]["problems"]["insecurity"], 20.0)
        self.assertNotIn("none", out["city"]["problems"])
        raval, clota = out["barris"]["01"], out["barris"]["02"]
        self.assertEqual((raval["name"], raval["satisf"], raval["delta"], raval["lowN"]), ("el Raval", 6.55, -0.6, False))
        self.assertTrue(clota["lowN"])
        self.assertIsNone(clota["delta"])


if __name__ == "__main__":
    unittest.main()
