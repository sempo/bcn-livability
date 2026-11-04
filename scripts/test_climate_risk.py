"""Unit tests for scripts/climate_risk.py (036, 037 — hazard helpers and view-layer classes).

Run: arch -x86_64 .venv-livability/bin/python -m unittest scripts/test_climate_risk.py
"""

import math
import os
import sys
import unittest

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import climate_risk as cr  # noqa: E402

# A point in central Barcelona, EPSG:25831 metres.
CX, CY = 428_700.0, 4_582_300.0


class TestPixelHazard(unittest.TestCase):
    def test_pixel_at_point_gives_class_over_ten(self):
        forest = cr.make_forest([(CX, CY)], [10])
        value, cls, dist = cr.pixel_hazard(CX, CY, forest, radius_m=500, decay_m=150)
        self.assertAlmostEqual(value, 1.0)
        self.assertEqual(cls, 10)
        self.assertAlmostEqual(dist, 0.0)

    def test_exponential_decay(self):
        forest = cr.make_forest([(CX + 150, CY)], [10])
        value, _, dist = cr.pixel_hazard(CX, CY, forest, radius_m=500, decay_m=150)
        self.assertAlmostEqual(value, math.exp(-1), places=6)
        self.assertAlmostEqual(dist, 150.0)

    def test_beyond_radius_is_zero(self):
        forest = cr.make_forest([(CX + 600, CY)], [10])
        self.assertEqual(cr.pixel_hazard(CX, CY, forest, radius_m=500, decay_m=150), (0.0, None, None))

    def test_picks_largest_contribution(self):
        # Class 3 right here (0.3) vs class 10 at 100 m (1.0·e^(−100/150) ≈ 0.51) → class 10 wins.
        forest = cr.make_forest([(CX, CY), (CX + 100, CY)], [3, 10])
        value, cls, dist = cr.pixel_hazard(CX, CY, forest, radius_m=500, decay_m=150)
        self.assertEqual(cls, 10)
        self.assertAlmostEqual(dist, 100.0)
        self.assertAlmostEqual(value, math.exp(-100 / 150), places=6)

    def test_empty_forest(self):
        forest = cr.make_forest([], [])
        self.assertEqual(cr.pixel_hazard(CX, CY, forest, radius_m=500, decay_m=150), (0.0, None, None))


class TestForestPolygons(unittest.TestCase):
    def test_adjacent_pixels_of_same_class_merge(self):
        forest = cr.make_forest([(CX, CY), (CX + 100, CY), (CX, CY + 500)], [7, 7, 3])
        polys = dict(cr.forest_polygons(forest, pixel_m=100))
        self.assertEqual(sorted(polys), [3, 7])
        self.assertAlmostEqual(polys[7].area, 20000, places=3)
        self.assertEqual(polys[7].geom_type, "Polygon")
        self.assertAlmostEqual(polys[3].area, 10000, places=3)

    def test_empty_forest(self):
        self.assertEqual(cr.forest_polygons(cr.make_forest([], []), pixel_m=100), [])


class TestStreetFloodingClasses(unittest.TestCase):
    def test_depth_classes(self):
        self.assertEqual(list(cr.depth_class([0.05, 0.2, 0.4, 0.7])), [0, 1, 2, 3])


if __name__ == "__main__":
    unittest.main()
