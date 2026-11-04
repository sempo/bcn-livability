"""Unit tests for scripts/prepare_buildings.py (TODO-046 stage 1 — residential buildings from Catastro).

Run (the venv has x86_64 wheels):
  arch -x86_64 .venv-livability/bin/python -m unittest scripts/test_buildings.py
"""

import os
import sys
import unittest

import geopandas as gpd
import numpy as np
import pandas as pd
from shapely.geometry import Point, box

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import prepare_buildings as pb  # noqa: E402

CRS = "EPSG:25831"


def raw_buildings(rows):
    """Catastro building.gml rows: (localId, use, dwellings, units, beginning, end)."""
    df = pd.DataFrame(rows, columns=["localId", "currentUse", "numberOfDwellings", "numberOfBuildingUnits",
                                     "beginning", "end"])
    df["value"] = 500
    df["conditionOfConstruction"] = "functional"
    return gpd.GeoDataFrame(df, geometry=[box(i * 20, 0, i * 20 + 10, 10) for i in range(len(df))], crs=CRS)


class TestParseYear(unittest.TestCase):
    def test_date(self):
        self.assertEqual(pb.parse_year("1966-01-01T00:00:00"), 1966)

    def test_blank_catastro_date(self):
        self.assertIsNone(pb.parse_year("--01-01T00:00:00"))

    def test_missing(self):
        self.assertIsNone(pb.parse_year(None))
        self.assertIsNone(pb.parse_year(float("nan")))


class TestPartFloors(unittest.TestCase):
    def test_max_per_building(self):
        parts = pd.DataFrame({
            "localId": ["A_part1", "A_part2", "B_part1"],
            "numberOfFloorsAboveGround": [3, 7, 2],
            "numberOfFloorsBelowGround": [0, 2, 0],
        })
        f = pb.part_floors(parts)
        self.assertEqual(f.loc["A"].tolist(), [7, 2])
        self.assertEqual(f.loc["B"].tolist(), [2, 0])


class TestAddresses(unittest.TestCase):
    def test_parse_address_id(self):
        self.assertEqual(pb.parse_address_id("08.282.1.11.8927606DF3982F"), ("1", "11", "8927606DF3982F"))

    def test_address_points_entrances_first(self):
        addresses = gpd.GeoDataFrame({
            "localId": ["08.282.2.S-N.REF0000000000B", "08.282.1.11.REF0000000000A"],
            "specification": ["Parcel", "Entrance"],
        }, geometry=[Point(1, 1), Point(0, 0)], crs=CRS)
        streets = pd.DataFrame({"gml_id": ["ES.SDGC.TN.08.282.1", "ES.SDGC.TN.08.282.2"],
                                "text": ["AV ALBENIZ", "CL MAJOR"]})
        p = pb.address_points(addresses, streets)
        self.assertEqual(p["id"].tolist(), ["REF0000000000A", "REF0000000000B"])
        self.assertEqual(p["address"].tolist(), ["AV ALBENIZ 11", "CL MAJOR S-N"])
        self.assertEqual(p["specification"].tolist(), ["Entrance", "Parcel"])


class TestToBuildings(unittest.TestCase):
    def setUp(self):
        self.b = raw_buildings([
            ("HOME", "1_residential", 12, 15, "1900-01-01T00:00:00", "1975-01-01T00:00:00"),
            ("SHOP", "4_2_retail", 0, 1, "1990-01-01T00:00:00", "1990-01-01T00:00:00"),
            ("MIXED", "4_1_office", 3, 20, "1960-01-01T00:00:00", "1960-01-01T00:00:00"),
            ("NOPART", "1_residential", 1, 1, "--01-01T00:00:00", "--01-01T00:00:00"),
        ])
        floors = pd.DataFrame({"floors": [6, 8], "floors_below": [1, 0]},
                              index=pd.Index(["HOME", "MIXED"], name="id"))
        ents = gpd.GeoDataFrame({"id": ["HOME", "HOME", "HOME"],
                                 "address": ["CL ARAGO 255", "RB CATALUNYA 30", "CL ARAGO 255"]},
                                geometry=[Point(0, 0)] * 3, crs=CRS)
        self.out = pb.to_buildings(self.b, floors, ents, "08900").set_index("id")

    def test_only_buildings_with_dwellings(self):
        self.assertEqual(sorted(self.out.index), ["HOME", "MIXED", "NOPART"])

    def test_fields(self):
        home = self.out.loc["HOME"]
        self.assertEqual(home["muni"], "08900")
        self.assertEqual(home["use"], "1_residential")
        self.assertEqual((home["dwellings"], home["units"]), (12, 15))
        self.assertEqual((home["year_built"], home["year_renov"]), (1900, 1975))
        self.assertEqual((home["floors"], home["floors_below"]), (6, 1))
        self.assertEqual(home["area_m2"], 500)
        self.assertEqual(home["condition"], "functional")

    def test_renovation_only_when_later(self):
        self.assertTrue(pd.isna(self.out.loc["MIXED", "year_renov"]))

    def test_missing_year_and_parts(self):
        no_part = self.out.loc["NOPART"]
        self.assertTrue(pd.isna(no_part["year_built"]))
        self.assertTrue(pd.isna(no_part["floors"]))

    def test_addresses_unique_in_order(self):
        self.assertEqual(self.out.loc["HOME", "address"], "CL ARAGO 255; RB CATALUNYA 30")
        self.assertTrue(pd.isna(self.out.loc["MIXED", "address"]))


class TestStudentResidences(unittest.TestCase):
    def setUp(self):
        self.b = raw_buildings([
            ("HOME", "1_residential", 12, 15, "1900-01-01T00:00:00", "1900-01-01T00:00:00"),
            ("DORM", "4_3_publicServices", 0, 1, "2015-01-01T00:00:00", "2015-01-01T00:00:00"),
            ("SHOP", "4_2_retail", 0, 1, "1990-01-01T00:00:00", "1990-01-01T00:00:00"),
        ])

    def test_touching(self):
        # buildings are 10 m boxes at x = 0, 20, 40; an OSM dormitory polygon over the second one
        self.assertEqual(pb.touching(self.b, np.array([box(22, 2, 25, 5)])), {"DORM"})
        self.assertEqual(pb.touching(self.b, np.array([])), set())

    def test_dorm_with_zero_dwellings_is_kept_and_marked(self):
        no_floors = pd.DataFrame(columns=["floors", "floors_below"], index=pd.Index([], name="id"))
        no_doors = gpd.GeoDataFrame({"id": [], "address": []}, geometry=[], crs=CRS)
        out = pb.to_buildings(self.b, no_floors, no_doors, "08900", student={"DORM"}).set_index("id")
        self.assertEqual(sorted(out.index), ["DORM", "HOME"])
        self.assertEqual(out["student"].to_dict(), {"HOME": 0, "DORM": 1})


@unittest.skipUnless(pb.OUT_GPKG.exists(), "buildings.gpkg not generated")
class TestGeneratedBuildings(unittest.TestCase):
    """Happy path on the real output: every municipality, plausible totals, known places."""

    @classmethod
    def setUpClass(cls):
        cls.b = gpd.read_file(pb.OUT_GPKG, layer="buildings")

    def near(self, lat, lng, radius_m):
        p = gpd.GeoSeries([Point(lng, lat)], crs=4326).to_crs(CRS).iloc[0]
        return self.b[self.b.distance(p) <= radius_m]

    def test_all_municipalities(self):
        self.assertEqual(sorted(self.b["muni"].unique()), sorted(pb.MUNICIPALITIES))

    def test_barcelona_dwellings(self):
        total = self.b.loc[self.b["muni"] == "08900", "dwellings"].sum()
        self.assertTrue(700_000 <= total <= 1_000_000, total)

    def test_addresses(self):
        self.assertGreaterEqual(self.b["address"].notna().mean(), 0.95)

    def test_eixample_old_tall_building(self):
        near = self.near(41.3916, 2.1650, 100)  # Passeig de Gràcia
        self.assertTrue(((near["floors"] >= 5) & (near["year_built"] < 1930)).any())

    def test_no_homes_on_industrial_land(self):
        for lat, lng in [(41.3380, 2.1300), (41.2974, 2.0833)]:  # Zona Franca, airport
            self.assertEqual(len(self.near(lat, lng, 200)), 0, (lat, lng))


if __name__ == "__main__":
    unittest.main()
