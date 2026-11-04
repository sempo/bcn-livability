#!/usr/bin/env python3
"""
Residential buildings from Catastro INSPIRE for Barcelona + AMB (TODO-046, stage 1).

Sources: Dirección General del Catastro, INSPIRE ATOM download services, province 08 —
         Buildings (building.gml + buildingpart.gml) and Addresses. Metadata: "No conditions apply".
         Attribution: © Dirección General del Catastro.

Output: data/buildings/buildings.gpkg (gitignored), EPSG:25831
  buildings  — footprints of buildings with ≥ BUILDINGS_MIN_DWELLINGS dwellings, plus student residences
               (touching an OSM dormitory / student accommodation, whatever Catastro says):
               id (cadastral ref), muni, use, dwellings, units, year_built, year_renov,
               floors, floors_below, area_m2, condition, student, address
  entrances  — entrance points of those buildings: id, address

Run (the venv has x86_64 wheels; zips are cached in data/buildings/raw/):
  arch -x86_64 .venv-livability/bin/python scripts/prepare_buildings.py [--force]
"""

import argparse
import os
import re
import sys
import zipfile
from pathlib import Path

import geopandas as gpd
import pandas as pd
import pyogrio
import shapely

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from fetch_climate_risk import TIMEOUT, download, session  # noqa: E402

ROOT = Path(__file__).parent.parent
OUT_DIR = ROOT / "data" / "buildings"
RAW_DIR = OUT_DIR / "raw"
OUT_GPKG = OUT_DIR / "buildings.gpkg"
OSM_PBF = ROOT / "backend" / "otp" / "data" / "barcelona.osm.pbf"
CRS = "EPSG:25831"

STUDENT_WHERE = ("building = 'dormitory' OR amenity = 'student_accommodation' "
                 "OR other_tags LIKE '%\"residential\"=>\"student\"%' OR other_tags LIKE '%student_accommodation%'")
STUDENT_POINTS_WHERE = "other_tags LIKE '%student_accommodation%' OR other_tags LIKE '%dormitory%'"

# A building is residential when it has at least this many dwellings (mixed-use buildings included).
MIN_DWELLINGS = int(os.environ.get("BUILDINGS_MIN_DWELLINGS", "1"))

FEEDS = {
    "BU": "http://www.catastro.hacienda.gob.es/INSPIRE/buildings/08/ES.SDGC.bu.atom_08.xml",
    "AD": "http://www.catastro.hacienda.gob.es/INSPIRE/addresses/08/ES.SDGC.ad.atom_08.xml",
}

# Catastro municipality codes (≠ INE; Barcelona = 08900) of the coverage in public/data/areas.geojson.
# Matched by code only: names in the feed are mangled ("SANT VICEN DELS HORTS").
MUNICIPALITIES = [
    "08015", "08020", "08053", "08055", "08067", "08071", "08072", "08076", "08088", "08100", "08122", "08124",
    "08125", "08156", "08157", "08168", "08179", "08193", "08195", "08199", "08203", "08204", "08210", "08216",
    "08219", "08244", "08245", "08252", "08263", "08266", "08282", "08289", "08302", "08312", "08313", "08900",
]


def parse_year(s):
    """'1966-01-01T00:00:00' → 1966; Catastro's blank date '--01-01T00:00:00' or a missing value → None."""
    m = re.match(r"(\d{4})-", s) if isinstance(s, str) else None
    return int(m.group(1)) if m else None


def part_floors(parts):
    """Max floors above / below ground per building, indexed by id. Part ids are '<ref>_partN'."""
    return (
        parts.assign(id=parts["localId"].str.replace(r"_part\d+$", "", regex=True))
        .groupby("id")
        .agg(floors=("numberOfFloorsAboveGround", "max"), floors_below=("numberOfFloorsBelowGround", "max"))
    )


def parse_address_id(local_id):
    """'08.282.1.11.8927606DF3982F' → ('1', '11', '8927606DF3982F'): street id, number, building ref."""
    *_, street, number, ref = local_id.split(".")
    return street, number, ref


def address_points(addresses, streets):
    """Address points with the building ref they belong to and 'STREET NUMBER', entrances first.

    `specification` is 'Entrance' (a mapped door) or 'Parcel' (parcel point, where no door is mapped).
    """
    a = addresses.sort_values("specification", kind="stable")
    names = dict(zip(streets["gml_id"].str.rsplit(".", n=1).str[1], streets["text"]))
    parsed = [parse_address_id(i) for i in a["localId"]]
    return gpd.GeoDataFrame(
        {"id": [ref for _, _, ref in parsed],
         "address": [f"{names.get(street, '')} {number}".strip() for street, number, _ in parsed],
         "specification": a["specification"].values},
        geometry=a.geometry.values, crs=a.crs,
    )


def student_housing():
    """OSM student residences (polygons and points), EPSG:25831.

    Catastro files most of them as public services or retail with 0 dwellings, so the dwellings filter alone
    would drop places where people do live.
    """
    polys = pyogrio.read_dataframe(OSM_PBF, layer="multipolygons", where=STUDENT_WHERE, columns=["name"])
    pts = pyogrio.read_dataframe(OSM_PBF, layer="points", where=STUDENT_POINTS_WHERE, columns=["name"])
    return pd.concat([polys, pts], ignore_index=True).to_crs(CRS).geometry.values


def touching(b, geoms):
    """Ids of buildings whose footprint touches any of geoms."""
    if len(geoms) == 0:
        return set()
    hit = shapely.STRtree(b.geometry.values).query(geoms, predicate="intersects")[1]
    return set(b["localId"].values[hit])


def to_buildings(b, floors, points, code, student=frozenset()):
    """Residential buildings — with dwellings, or student residences — with floors and addresses."""
    b = b[(b["numberOfDwellings"] >= MIN_DWELLINGS) | b["localId"].isin(student)]
    built = pd.to_numeric(b["beginning"].map(parse_year)).astype("Int64")
    renov = pd.to_numeric(b["end"].map(parse_year)).astype("Int64")
    address = points.groupby("id")["address"].agg(lambda s: "; ".join(dict.fromkeys(s)))
    out = gpd.GeoDataFrame(
        {
            "id": b["localId"].values,
            "muni": code,
            "use": b["currentUse"].values,
            "dwellings": b["numberOfDwellings"].values,
            "units": b["numberOfBuildingUnits"].values,
            "year_built": built.values,
            "year_renov": renov.where(renov > built).values,
            "area_m2": b["value"].values,
            "condition": b["conditionOfConstruction"].values,
            "student": b["localId"].isin(student).astype(int).values,
        },
        geometry=b.geometry.values, crs=b.crs,
    )
    return out.join(floors, on="id").join(address, on="id")


def feed_urls(feed):
    """{catastro code: zip url} from a province ATOM feed."""
    xml = session.get(feed, timeout=TIMEOUT).text
    return {code: url for url, code in re.findall(r'href="([^"]+\.(\d{5})\.zip)"', xml)}


def read(zip_path, suffix, **kwargs):
    with zipfile.ZipFile(zip_path) as z:
        name = next(n for n in z.namelist() if n.endswith(suffix))
    return pyogrio.read_dataframe(f"/vsizip/{zip_path}/{name}", **kwargs)


def load(code, urls, force, students):
    bu = download(urls["BU"][code], RAW_DIR / f"BU.{code}.zip", force)
    ad = download(urls["AD"][code], RAW_DIR / f"AD.{code}.zip", force)
    points = address_points(
        read(ad, f"AD.{code}.gml", layer="Address", columns=["localId", "specification"]),
        read(ad, f"AD.{code}.gml", layer="ThoroughfareName", columns=["gml_id", "text"], read_geometry=False),
    )
    parts = read(bu, "buildingpart.gml", read_geometry=False,
                 columns=["localId", "numberOfFloorsAboveGround", "numberOfFloorsBelowGround"])
    b = read(bu, "building.gml", columns=["localId", "currentUse", "numberOfDwellings", "numberOfBuildingUnits",
                                          "beginning", "end", "value", "conditionOfConstruction"])
    out = to_buildings(b, part_floors(parts), points, code, touching(b.to_crs(CRS), students)).to_crs(CRS)
    doors = points[(points["specification"] == "Entrance") & points["id"].isin(out["id"])]
    return out, doors[["id", "address", "geometry"]].to_crs(CRS)


def main():
    ap = argparse.ArgumentParser(description="Residential buildings from Catastro INSPIRE (TODO-046).")
    ap.add_argument("--force", action="store_true", help="re-download the Catastro zips")
    args = ap.parse_args()

    urls = {k: feed_urls(url) for k, url in FEEDS.items()}
    students = student_housing()
    print(f"OSM student residences: {len(students)}")
    buildings, ents = [], []
    print(f"{'muni':6} {'buildings':>9} {'dwellings':>9} {'no year':>8} {'no floors':>9} {'no address':>10}")
    for code in MUNICIPALITIES:
        b, e = load(code, urls, args.force, students)
        buildings.append(b)
        ents.append(e)
        print(f"{code:6} {len(b):9,} {b['dwellings'].sum():9,} {b['year_built'].isna().mean():8.1%} "
              f"{b['floors'].isna().mean():9.1%} {b['address'].isna().mean():10.1%}")

    b = pd.concat(buildings, ignore_index=True)
    e = pd.concat(ents, ignore_index=True)
    print(f"{'total':6} {len(b):9,} {b['dwellings'].sum():9,} {b['year_built'].isna().mean():8.1%} "
          f"{b['floors'].isna().mean():9.1%} {b['address'].isna().mean():10.1%}")
    print("condition:", b["condition"].value_counts(dropna=False).to_dict())
    print(f"student residences: {b['student'].sum():,} buildings, {(b['student'] & (b['dwellings'] == 0)).sum():,} "
          f"of them with 0 dwellings")

    OUT_GPKG.unlink(missing_ok=True)
    b.to_file(OUT_GPKG, layer="buildings", driver="GPKG")
    e.to_file(OUT_GPKG, layer="entrances", driver="GPKG")
    print(f"→ {OUT_GPKG.relative_to(ROOT)}: {len(b):,} buildings, {len(e):,} entrances")


if __name__ == "__main__":
    main()
