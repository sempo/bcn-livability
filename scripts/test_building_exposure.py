"""Unit tests for scripts/building_exposure.py (TODO-046 stage 2 — noise by facade, flooding, wildfire per building).

Run (the venv has x86_64 wheels):
  arch -x86_64 .venv-livability/bin/python -m unittest scripts/test_building_exposure.py
"""

import os
import sys
import unittest

import geopandas as gpd
import numpy as np
import pandas as pd
from shapely.geometry import MultiPolygon, Point, Polygon, box

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import building_exposure as be  # noqa: E402

CRS = "EPSG:25831"
SQUARE = box(0, 0, 10, 10)


class TestRingPoints(unittest.TestCase):
    def setUp(self):
        self.idx, self.xs, self.ys = be.ring_points(np.array([SQUARE, box(100, 0, 110, 10)]), 3, 2)

    def test_spacing_and_owner(self):
        # 16 × 16 m mitred ring → 64 m → 32 points per building
        self.assertEqual(np.bincount(self.idx).tolist(), [32, 32])

    def test_points_sit_on_the_ring(self):
        first = self.idx == 0
        d = [SQUARE.exterior.distance(Point(x, y)) for x, y in zip(self.xs[first], self.ys[first])]
        self.assertTrue(all(3 - 1e-6 <= v <= 3 * 2 ** 0.5 + 1e-6 for v in d))

    def test_courtyard_ring_included(self):
        courtyard = box(0, 0, 40, 40).difference(box(10, 10, 30, 30))
        idx, xs, ys = be.ring_points(np.array([courtyard]), 3, 2)
        inside = [(10 < x < 30) and (10 < y < 30) for x, y in zip(xs, ys)]
        self.assertTrue(any(inside))


class TestCompass(unittest.TestCase):
    def test_eight_sectors(self):
        dx = np.array([0, 1, 1, 1, 0, -1, -1, -1, 0.3])
        dy = np.array([1, 1, 0, -1, -1, -1, 0, 1, 1])
        self.assertEqual(be.compass8(dx, dy).tolist(), ["N", "NE", "E", "SE", "S", "SW", "W", "NW", "N"])


class TestSampleGrid(unittest.TestCase):
    def test_pixels_and_invalid_values(self):
        grid = np.array([[50.0, 0.0], [70.0, -3.4e38]], dtype=np.float32)  # 2 × 2 pixels of 2 m, top-left (0, 4)
        xs = np.array([1, 3, 1, 3, 9])
        ys = np.array([3, 3, 1, 1, 1])
        v = be.sample_grid(xs, ys, grid, x0=0, y0=4, pixel=2)
        self.assertEqual(v[0], 50)
        self.assertEqual(v[2], 70)
        self.assertTrue(np.isnan(v[[1, 3, 4]]).all())  # building (0), nodata, outside


class TestBandMid(unittest.TestCase):
    def test_all_label_variants(self):
        cases = {"Lden5559": 57.5, "Lden4044": 42.5, "LdenGreaterThan75": 77.5, "LdenThan75": 77.5,
                 "LdenLowerThan40": 37.5, "Lnight6064": 62.5, "LnightGreaterThan70": 72.5, "LnightLowerThan40": 37.5}
        for label, mid in cases.items():
            self.assertEqual(be.band_mid(label), mid, label)


class TestValidPolygons(unittest.TestCase):
    def test_invalid_and_multi_parts_keep_their_area(self):
        two_squares = MultiPolygon([box(0, 0, 1, 1), box(5, 5, 6, 6)])
        bow_tie = Polygon([(0, 0), (2, 2), (2, 0), (0, 2)])  # self-intersecting
        parts, idx = be.valid_polygons([two_squares, bow_tie])
        self.assertTrue(all(p.geom_type == "Polygon" and p.is_valid for p in parts))
        self.assertAlmostEqual(sum(p.area for p, i in zip(parts, idx) if i == 0), 2)
        self.assertGreater(sum(p.area for p, i in zip(parts, idx) if i == 1), 0)


class TestFillBelowLowestBand(unittest.TestCase):
    def test_only_quiet_sica_samples(self):
        p = pd.DataFrame({"lden": [42.5, 57.5, 42.5], "ld": [np.nan] * 3, "le": [37.5] * 3, "ln": [np.nan] * 3})
        sica = np.array([True, True, False])  # quiet SICA, loud SICA, Barcelona raster
        out = be.fill_below_lowest_band(p, sica, quiet_lden_max=47.5)
        self.assertEqual(out.loc[0, ["ld", "ln"]].tolist(), [37.5, 37.5])
        self.assertTrue(out.loc[[1, 2], ["ld", "ln"]].isna().all().all())


class TestClassifyPoints(unittest.TestCase):
    def test_walls_dropped_and_sides(self):
        walls = np.array([box(0, 0, 10, 10), box(20, 0, 30, 10)])  # own building + neighbour
        blocks = np.array([box(0, 0, 40, 40)])  # street outside the block, courtyard inside
        xs = np.array([25, 5, 50])
        ys = np.array([5, 20, 5])
        keep, inner = be.classify_points(xs, ys, walls, blocks)
        self.assertEqual(keep.tolist(), [False, True, True])
        self.assertEqual(inner[keep].tolist(), [True, False])  # courtyard, street


def points(rows):
    """rows: (id, side, dir, x, y, lden, ln)."""
    df = pd.DataFrame(rows, columns=["id", "side", "dir", "x", "y", "lden", "ln"])
    df["ld"], df["le"] = df["lden"] - 2, df["lden"] - 3
    return df


class TestFacades(unittest.TestCase):
    def setUp(self):
        self.pts = points(
            [("A", "street", "S", x, -3, 72, 64) for x in (1, 3, 5, 7, 9)]       # 10 m loud street facade
            + [("A", "inner", "N", x, 13, 48, 40) for x in (1, 3, 5)]            # 6 m quiet courtyard facade
            + [("A", "street", "SW", -2, -2, 90, 80)]                            # 2 m corner artefact
        )
        self.groups = be.facade_groups(self.pts, spacing_m=2, min_length_m=4)
        self.b = be.building_noise(self.pts, self.groups).loc["A"]

    def test_groups(self):
        g = self.groups.set_index("dir")
        self.assertEqual(sorted(g.index), ["N", "S"])  # the 2 m corner group is dropped
        self.assertEqual(g.loc["S", "length_m"], 10)
        self.assertAlmostEqual(g.loc["S", "lden"], 72)
        self.assertEqual((g.loc["S", "x"], g.loc["S", "y"]), (5, -3))  # measurement point: the middle one

    def test_building_summary(self):
        self.assertAlmostEqual(self.b["lden_avg"], (72 * 5 + 48 * 3 + 90) / 9)  # every point counts, by length
        self.assertAlmostEqual(self.b["lden_street"], (72 * 5 + 90) / 6)
        self.assertAlmostEqual(self.b["lden_inner"], 48)
        self.assertAlmostEqual(self.b["ln_inner"], 40)
        self.assertEqual((self.b["lden_max"], self.b["lden_min"]), (72, 48))  # over facade groups
        self.assertEqual((self.b["ln_max"], self.b["ln_min"]), (64, 40))

    def test_missing_side_is_null(self):
        only_street = self.pts[self.pts["side"] == "street"]
        b = be.building_noise(only_street, be.facade_groups(only_street, 2, 4)).loc["A"]
        self.assertTrue(pd.isna(b["lden_inner"]))


class TestRiverZone(unittest.TestCase):
    def test_most_frequent_zone_wins(self):
        zones = {"t10": box(0, 0, 5, 5), "t100": box(0, 0, 20, 20), "t500": box(0, 0, 50, 50)}
        fps = np.array([box(4, 4, 6, 6), box(15, 15, 16, 16), box(40, 40, 41, 41), box(90, 90, 91, 91)])
        self.assertEqual(be.river_zone(fps, zones).tolist(), [10, 100, 500, None])

    def test_missing_layer(self):
        self.assertEqual(be.river_zone(np.array([SQUARE]), {"t10": None, "t100": None, "t500": None}).tolist(),
                         [None])


class TestStreetFlooding(unittest.TestCase):
    def setUp(self):
        self.buildings = gpd.GeoDataFrame({"id": ["DOOR", "NODOOR"]},
                                          geometry=[box(0, 0, 10, 10), box(100, 0, 110, 10)], crs=CRS)
        self.entrances = gpd.GeoDataFrame({"id": ["DOOR"]}, geometry=[Point(5, 0)], crs=CRS)

    def test_probes(self):
        p = be.door_probes(self.buildings, self.entrances, 5).set_index("id")
        self.assertAlmostEqual(p.loc["DOOR"].geometry.area, np.pi * 25, delta=2)  # buffer around the door
        self.assertTrue(p.loc["NODOOR"].geometry.contains(Point(100, -4)))  # ring around the footprint

    def test_courtyard_water_is_not_street_water(self):
        water = gpd.GeoDataFrame({"depth2d": [0.2, 3.0]}, geometry=[box(0, -3, 2, -1), box(20, 20, 22, 22)], crs=CRS)
        kept = be.street_elements(water, np.array([box(10, 10, 40, 40)]))
        self.assertEqual(kept["depth2d"].tolist(), [0.2])

    def test_max_depth(self):
        probes = be.door_probes(self.buildings, self.entrances, 5)
        water = gpd.GeoDataFrame({"depth2d": [0.12, 0.43, 0.9]},
                                 geometry=[box(4, -3, 6, -1), box(6, -3, 8, -1), box(50, 50, 51, 51)], crs=CRS)
        d = be.max_depth_cm(probes, water, self.buildings["id"])
        self.assertEqual(d.to_dict(), {"DOOR": 43, "NODOOR": 0})


@unittest.skipUnless(be.OUT_GPKG.exists(), "exposure.gpkg not generated")
class TestGeneratedExposure(unittest.TestCase):
    """Happy path on the real output."""

    @classmethod
    def setUpClass(cls):
        b = gpd.read_file(be.BUILDINGS_GPKG, layer="buildings", columns=["id", "muni"])
        e = gpd.read_file(be.OUT_GPKG, layer="exposure")
        cls.x = b.merge(e, on="id")

    def at(self, lat, lng, radius_m):
        p = gpd.GeoSeries([Point(lng, lat)], crs=4326).to_crs(CRS).iloc[0]
        return self.x[self.x.distance(p) <= radius_m]

    def test_noise_coverage(self):
        covered = self.x[self.x["muni"].isin(be.NOISE_MUNIS)]
        self.assertGreaterEqual(covered["lden_avg"].notna().mean(), 0.95)
        self.assertTrue(self.x.loc[self.x["muni"] == "08204", "lden_avg"].isna().all())  # Sant Cugat
        self.assertEqual(set(self.x.loc[self.x["muni"] == "08900", "noise_src"].dropna()), {"bcn_raster_2022"})
        self.assertEqual(set(self.x.loc[self.x["muni"] == "08100", "noise_src"].dropna()), {"sica_2022"})

    def test_noise_consistency(self):
        n = self.x.dropna(subset=["lden_avg", "ln_avg", "lden_max", "lden_min"])
        # ≤, not <: in SICA bands a building can be '< 40 dB' (37.5) for every period
        self.assertTrue((n["ln_avg"] <= n["lden_avg"]).all())
        self.assertTrue((n["lden_min"] <= n["lden_max"]).all())

    def test_eixample_street_louder_than_courtyard(self):
        eix = self.at(41.3925, 2.1640, 600).dropna(subset=["lden_street", "lden_inner"])
        self.assertGreater(len(eix), 200)
        self.assertGreaterEqual(((eix["lden_street"] - eix["lden_inner"]) >= 10).mean(), 0.8)

    def test_street_flooding_only_in_barcelona(self):
        self.assertTrue(self.x.loc[self.x["muni"] != "08900", "street_t10_cm"].isna().all())
        self.assertTrue(self.x.loc[self.x["muni"] == "08900", "street_t10_cm"].notna().all())


if __name__ == "__main__":
    unittest.main()
