"""Unit tests for scripts/build_building_tiles.py (TODO-046 stage 4 — map data for the building-level index).

Run (the venv has x86_64 wheels):
  arch -x86_64 .venv-livability/bin/python -m unittest scripts/test_build_building_tiles.py
"""

import os
import sys
import unittest

import geopandas as gpd
import numpy as np
import pandas as pd
import shapely
from shapely.geometry import box

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import build_building_tiles as bt  # noqa: E402


class TestNonResidential(unittest.TestCase):
    def setUp(self):
        self.b = pd.DataFrame([
            # use,                dwellings, area_m2, student
            ("1_residential",       1,  15218, 0),   # Montjuïc castle: one caretaker flat in 15,000 m²
            ("4_3_publicServices",  1,   2000, 0),   # school with a caretaker flat
            ("1_residential",       1,    180, 0),   # a real house in an industrial estate
            ("4_3_publicServices",  0,   5750, 1),   # student residence (0 dwellings in Catastro)
            ("1_residential",      45, 486935, 0),   # university campus with homes
            ("1_residential",      30,   3000, 0),   # ordinary block of flats
            ("1_residential",       2,   1500, 0),   # inside an OSM church
        ], columns=["use", "dwellings", "area_m2", "student"])
        osm = np.array([None, None, None, "dormitory", None, None, "church"], dtype=object)
        self.reason = bt.nonresidential(self.b, osm)

    def test_reasons(self):
        self.assertEqual(self.reason[0], "area_per_dwelling")
        self.assertEqual(self.reason[1], "catastro_use:4_3_publicServices")
        self.assertEqual(self.reason[6], "osm:church")

    def test_kept(self):
        self.assertEqual([self.reason[i] for i in (2, 3, 4, 5)], [None, None, None, None])


class TestJoins(unittest.TestCase):
    def test_osm_tags_at(self):
        objects = gpd.GeoDataFrame({"historic": ["castle", None], "amenity": [None, "school"],
                                    "tourism": [None, None], "building": ["yes", "school"]},
                                   geometry=[box(0, 0, 10, 10), box(20, 0, 30, 10)])
        tags = bt.osm_tags_at(shapely.points([5, 25, 50], [5, 5, 5]), objects)
        self.assertEqual(tags.tolist(), ["castle", "school", None])

    def test_assign_areas_barri_wins_inside_barcelona(self):
        barris = gpd.GeoDataFrame({"code": ["01"], "name": ["el Raval"], "price": [4000.0]},
                                  geometry=[box(0, 0, 10, 10)])
        munis = gpd.GeoDataFrame({"code": ["08019", "08101"], "name": ["Barcelona", "L'Hospitalet"],
                                  "price": [5000.0, 2500.0]}, geometry=[box(0, 0, 20, 10), box(20, 0, 40, 10)])
        idx, table = bt.assign_areas(shapely.points([5, 15, 30, 99], [5, 5, 5, 5]), barris, munis)
        self.assertEqual([table.loc[i, "code"] if i >= 0 else None for i in idx], ["01", "08019", "08101", None])
        self.assertEqual(table.loc[idx[0], "kind"], "barri")


class TestColumns(unittest.TestCase):
    def test_pack_round_trip_with_sentinels(self):
        blob, meta = bt.pack([
            ("lng", "f32", 1, [2.17, np.nan]),
            ("lden_avg", "u16", 10, [62.4, None]),
            ("walk_park", "u8", 1, [87, np.nan]),
            ("cc_sagrada", "u8", 1, [12, 300]),  # clipped below the sentinel
        ])
        cols = {c["name"]: c for c in meta}
        self.assertTrue(all(c["offset"] % 4 == 0 for c in meta))
        read = lambda name, dt: np.frombuffer(blob, dtype=dt, count=2, offset=cols[name]["offset"])  # noqa: E731
        self.assertAlmostEqual(float(read("lng", "<f4")[0]), 2.17, places=5)
        self.assertTrue(np.isnan(read("lng", "<f4")[1]))
        self.assertEqual(read("lden_avg", "<u2").tolist(), [624, 65535])
        self.assertEqual(read("walk_park", "<u1").tolist(), [87, 255])
        self.assertEqual(read("cc_sagrada", "<u1").tolist(), [12, 254])

    def test_height_from_floors(self):
        self.assertEqual(bt.height_m(pd.Series([5, None])).tolist()[0], 15.0)
        self.assertTrue(pd.isna(bt.height_m(pd.Series([5, None])).tolist()[1]))


@unittest.skipUnless((bt.PUBLIC / "buildings-meta.json").exists(), "map data not built")
class TestGenerated(unittest.TestCase):
    def test_meta_matches_bin(self):
        import gzip
        import json
        meta = json.loads((bt.PUBLIC / "buildings-meta.json").read_text())
        blob = gzip.decompress((bt.PUBLIC / "buildings-scores.bin.gz").read_bytes())
        last = meta["columns"][-1]
        self.assertGreaterEqual(len(blob), last["offset"] + meta["count"])
        self.assertGreater(meta["count"], 170_000)
        self.assertLess(meta["price_bounds"]["p5"], meta["price_bounds"]["p95"])

    def test_year_built_column(self):
        """Building age (TODO-047) is scored in the browser from the year of construction."""
        import gzip
        import json
        meta = json.loads((bt.PUBLIC / "buildings-meta.json").read_text())
        col = next(c for c in meta["columns"] if c["name"] == "year_built")
        self.assertEqual((col["type"], col["scale"], col["sentinel"]), ("u16", 1, 65535))
        blob = gzip.decompress((bt.PUBLIC / "buildings-scores.bin.gz").read_bytes())
        years = np.frombuffer(blob, "<u2", meta["count"], col["offset"])
        known = years[years != 65535]
        self.assertGreater(len(known), 0.99 * meta["count"])
        self.assertGreater(np.median(known), 1940)
        self.assertLessEqual(known.max(), 2030)

    def test_walk_minutes_columns(self):
        """The walkability condition (049) uses walking minutes per service, not the old sub-scores."""
        import json
        meta = json.loads((bt.PUBLIC / "buildings-meta.json").read_text())
        names = {c["name"] for c in meta["columns"]}
        self.assertEqual({f"min_{c}" for c in meta["categories"]} - names, set())
        self.assertFalse(any(n.startswith("walk_") for n in names))

    def test_castle_out_dorms_in(self):
        out = gpd.read_file(bt.NONRES_GPKG)
        self.assertIn("0195201DF3709E", set(out["id"]))  # Montjuïc castle
        self.assertNotIn("5049611DF2954G", set(out["id"]))  # UAB campus, 45 dwellings


if __name__ == "__main__":
    unittest.main()
