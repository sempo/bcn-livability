#!/usr/bin/env python3
"""
Neighbourhood "vibe" layers for Barcelona from two open sources:

  ESM  — Enquesta de Serveis Municipals microdata (residents' view), Ajuntament de Barcelona
  IAB  — Inside Airbnb snapshot 2026-09-17 (guests' view), CC BY 4.0

Layers in data/neighbourhood-vibe/neighbourhood_vibe.gpkg:
  vibe_barri        — 73 barris, ESM indicators (esm_*) + Airbnb aggregates (abnb_*)
  esm_granbarri     — 39 grans barris (ESM sample is stratified at this level), ESM indicators
  airbnb_listings   — listing points (location is jittered by Airbnb up to ~150 m)
Plus vibe_barri.csv / esm_granbarri.csv (same attributes, no geometry), and for the frontend
(042, "Locals' opinion"): frontend/public/data/barri-vibe.json — per-barri ESM fields and city medians.
Buildings get their barri code in scripts/build_building_tiles.py.

Env (pipeline; rerun the script after changing):
  VIBE_ESM_YEARS=2022-2026   ESM survey years pooled per barri
  VIBE_ESM_MIN_N=100         barris with fewer interviews are flagged as small samples
  VIBE_ESM_SHRINK_K=100      pull towards the gran barri mean, (n·s + k·s_gb) / (n + k);
                             k ≈ σ²within / τ²between (≈ 93 on 2022–26 microdata)

Run:
  uv run --with geopandas --with pyogrio --with pyarrow --with h3 python scripts/build_neighbourhood_vibe.py
"""

import json
import os
import re
import unicodedata
import urllib.request
import zipfile
from pathlib import Path

import geopandas as gpd
import numpy as np
import pandas as pd

ROOT = Path(__file__).parent.parent
OUT_DIR = ROOT / "data" / "neighbourhood-vibe"
RAW = OUT_DIR / "raw"
BARRIS = ROOT / "data" / "areas" / "barris.geojson"
GPKG = OUT_DIR / "neighbourhood_vibe.gpkg"
FRONTEND_JSON = ROOT / "frontend" / "public" / "data" / "barri-vibe.json"

IAB_SNAPSHOT = "2026-09-17"
IAB_BASE = f"https://data.insideairbnb.com/spain/catalonia/barcelona/{IAB_SNAPSHOT}"
ESM_ZIP_URL = (
    "https://opendata-ajuntament.barcelona.cat/data/dataset/b1cc0c98-9912-4fed-9d75-f577b50a2e9e/"
    "resource/1420991e-fe2e-4c13-9c0d-e8b8a3f6f394/download/"
    "2026_r26001_serveis_municipals_evolucio2026_bd_v1_0.zip"
)
ESM_CSV = "2026_r26001_Serveis_Municipals_Evolucio2026_BD_CSVtext_v1_0.csv"

_y0, _y1 = os.environ.get("VIBE_ESM_YEARS", "2022-2026").split("-")
ESM_YEARS = range(int(_y0), int(_y1) + 1)  # pooled for sample size (~30k interviews, post-COVID)
ESM_BASELINE = range(2015, 2020)     # pre-COVID baseline for the satisfaction trend
ESM_LOW_N = int(os.environ.get("VIBE_ESM_MIN_N", "100"))  # barri estimates below this are flagged as noisy
ESM_SHRINK_K = float(os.environ.get("VIBE_ESM_SHRINK_K", "100"))
REVIEW_YEARS = 3                     # Airbnb reviews window before the snapshot date
ABNB_MIN_REVIEWS = 300               # below this, review-tag shares per barri are left empty
NA_ANSWERS = {"NO HO SAP", "NO CONTESTA"}

# ESM "most serious problem of your barri" (PROB_BARRI_AGR) categories kept as share columns
PROBLEMS = {
    "insecurity": {"INSEGURETAT"},
    "cleanliness": {"NETEJA"},
    "noise": {"SOROLLS"},
    "housing": {"ACCÉS A L'HABITATGE"},
    "tourism": {"TURISME", "MASSIFICACIÓ"},
    "incivility": {"VALORS SOCIALS NEGATIUS / MANCA D'EDUCACIÓ, CIVISME"},
    "drugs_squats": {"DROGUES / NARCOPISOS", "OCUPACIÓ D'HABITATGES"},
    "maintenance": {"MANTENIMENT", "OBRES", "URBANISME"},
    "parking": {"APARCAMENT"},
    "traffic": {"CIRCULACIÓ", "CONGESTIÓ DE TRÀNSIT", "GESTIÓ I ORGANITZACIÓ DEL TRÀNSIT",
                "MASSA VEHICLE PRIVAT A LA CIUTAT", "CIRCULACIÓ DE BICICLETES I PATINETS",
                "ALTRES ASPECTES DE LA CIRCULACIÓ"},
    "none": {"CAP / RES"},
}

# Review keyword lexicon (EN / ES / CA / FR / DE / IT). Matches preceded by a negator
# ("not noisy", "sin ruido", "kein Lärm") are dropped before counting.
# ponytail: regex lexicon can't tell "quiet flat" from "quiet street"; LLM tagging if that matters.
NEG = r"\b(?:no|not|never|without|zero|isn'?t|wasn'?t|sin|nada de|ningún|ni|pas|sans|aucun\w*|kein\w*|ohne|nicht|senza|nessun\w*|non)\b\W+(?:\w+\W+){0,2}?"
TAGS = {
    "quiet": r"\bquiet|peaceful|\bcalm\b|tranquil|silencios|\bcalme\b|silencieu|\bruhig|\bleise\b|silenzios",
    "noisy": r"\bnois[ey]|\bloud\b|\bruido|\bsoroll|\bbruit|bruyant|lärm|\blaut(?:er|e)?\b(?!\s+(?:beschreibung|angabe|gastgeber|host))|rumor",
    "lively": r"\blively|vibrant|buzzing|bustling|animad[oa]|bullicios|\banimé|\bvivant|lebendig|\bbelebt|lebhaft|vivace|animat[oa]|movimentat",
    "safe": r"(?:felt|feel|feels|very|totally|perfectly)\s+safe|safe\s+(?:area|neighbo|place|street|location|and)|zona segura|barrio seguro|muy segur|en sécurité|quartier sûr|sicher(?:e|en)?\s+(?:gegend|viertel|umgebung)|fühlte\s+\w+\s+sicher|zona sicura|quartiere sicuro|molto sicur",
    "unsafe": r"\bunsafe|sketchy|dodgy|\bshady|pickpocket|dangerous|not\s+(?:very\s+|feel\s+)?safe|didn'?t\s+feel\s+safe|insegur|peligros|carterist|dangereux|pas\s+sûr|insécurit|\blouche|unsicher|gefährlich|taschendieb|pericolos|borseggi|insicur|non\s+sicur",
    "touristy": r"touristy|too many tourists|crowded|full of tourists|muy turístic|lleno de turistas|masificad|très touristique|plein de touristes|sehr touristisch|überlaufen|molto turistic|pieno di turisti|affollat",
    "local": r"authentic|like a local|local (?:feel|vibe|neighbo|life|area|atmosphere)|non[- ]touristy|away from (?:the )?(?:tourist|crowds)|residential|auténtic|ambiente local|barrio local|residencial|autèntic|authentique|comme un local|quartier résidentiel|authentisch|wie ein einheimisch|wohngegend|autentic|come un local|quartiere residenziale",
    "nightlife": r"nightlife|night life|\bclubs\b|party|parties|vida nocturna|de fiesta|marcha|vie nocturne|nachtleben|kneipen|vita notturna|movida",
}


def norm(s: str) -> str:
    """'el Poble-sec' and 'EL POBLE SEC' → 'ELPOBLESEC'."""
    s = unicodedata.normalize("NFKD", str(s)).encode("ascii", "ignore").decode()
    return re.sub(r"[^A-Z0-9]", "", s.upper())


def fetch(url: str, dest: Path) -> Path:
    if not dest.exists():
        dest.parent.mkdir(parents=True, exist_ok=True)
        print(f"  downloading {url}")
        urllib.request.urlretrieve(url, dest)
    return dest


def wmean(v: pd.Series, w: pd.Series) -> float:
    m = v.notna()
    return float(np.average(v[m], weights=w[m])) if m.any() else np.nan


def wshare(s: pd.Series, w: pd.Series, values) -> float:
    """Weighted share of `values` among valid (non NS/NC) answers, in %."""
    m = s.notna() & ~s.isin(NA_ANSWERS)
    return float(100 * w[m & s.isin(values)].sum() / w[m].sum()) if m.any() else np.nan


def score_0_10(s: pd.Series) -> pd.Series:
    """'0 = GENS SATISFET/A' → 0, '7' → 7, 'NO HO SAP' → NaN."""
    return pd.to_numeric(s.str.extract(r"^(\d+)", expand=False), errors="coerce")


# ── ESM ───────────────────────────────────────────────────────────────────────

def esm_aggregate(g: pd.DataFrame) -> pd.Series:
    w = g.PES
    prob = g.PROB_BARRI_AGR
    valid_prob = prob[~prob.isin(NA_ANSWERS | {"CAP / RES", "TOT / TOTS"}) & prob.notna()]
    top = valid_prob.groupby(valid_prob).apply(lambda s: w[s.index].sum()).sort_values(ascending=False)
    out = {
        "esm_n": len(g),
        "esm_satisf": wmean(score_0_10(g.SATISF_RES_BARRI_0A10), w),
        "esm_safety": wmean(score_0_10(g.VAL_SEGUR_BARRI), w),
        "esm_noise_mgmt": wmean(score_0_10(g.VAL_SOROLL), w),
        "esm_best_pct": wshare(g.COMPARA_BARRI, w, {"UN DELS MILLORS"}),
        "esm_worst_pct": wshare(g.COMPARA_BARRI, w, {"UN DELS PITJORS"}),
        "esm_stay_pct": wshare(g.CANVI_LLOC_RES_1A3, w, {"ES QUEDARIA A VIURE EN EL SEU BARRI"}),
        "esm_transit_pct": wshare(g.VAL_TRANSP_BARRI_1A5, w, {"MOLT DOTAT", "BASTANT DOTAT"}),
        "esm_last_year_net": wshare(g.EVO1A_BARRI, w, {"HA MILLORAT"}) - wshare(g.EVO1A_BARRI, w, {"HA EMPITJORAT"}),
        "esm_future_net": wshare(g.FUTUR_BARRI, w, {"MILLORARÀ"}) - wshare(g.FUTUR_BARRI, w, {"EMPITJORARÀ"}),
        "esm_top_problem": top.index[0] if len(top) else None,
        "esm_top_problem_pct": 100 * top.iloc[0] / w[prob.notna() & ~prob.isin(NA_ANSWERS)].sum() if len(top) else np.nan,
        "esm_problem_2": top.index[1] if len(top) > 1 else None,
    }
    for key, labels in PROBLEMS.items():
        out[f"esm_prob_{key}_pct"] = wshare(prob, w, labels)
    return pd.Series(out)


def build_esm():
    zpath = fetch(ESM_ZIP_URL, RAW / "esm" / "esm_evo_2026.zip")
    cols = ["ANY", "GRANBARRI", "BARRI", "PES", "SATISF_RES_BARRI_0A10", "EVO1A_BARRI", "FUTUR_BARRI",
            "PROB_BARRI_AGR", "COMPARA_BARRI", "CANVI_LLOC_RES_1A3", "VAL_SEGUR_BARRI",
            "VAL_TRANSP_BARRI_1A5", "VAL_SOROLL"]
    with zipfile.ZipFile(zpath) as z, z.open(ESM_CSV) as f:
        d = pd.read_csv(f, usecols=cols, dtype=str)
    d["ANY"] = d.ANY.astype(int)
    d["PES"] = d.PES.astype(float)

    recent = d[d.ANY.isin(ESM_YEARS)]
    base = d[d.ANY.isin(ESM_BASELINE)]
    out = {}
    for level in ("BARRI", "GRANBARRI"):
        agg = recent.groupby(level).apply(esm_aggregate, include_groups=False)
        before = base.groupby(level).apply(lambda g: wmean(score_0_10(g.SATISF_RES_BARRI_0A10), g.PES),
                                           include_groups=False)
        agg["esm_satisf_delta"] = agg.esm_satisf - before.reindex(agg.index)
        agg.index = agg.index.rename("esm_name")
        out[level] = agg.reset_index()
    return out["BARRI"], out["GRANBARRI"], recent[["BARRI", "GRANBARRI"]].drop_duplicates()


def shrink(mean, n, prior, k=ESM_SHRINK_K):
    """Pulls a barri mean towards its gran barri mean, more so for small samples."""
    return (n * mean + k * prior) / (n + k)


# ── Inside Airbnb ─────────────────────────────────────────────────────────────

def tag_reviews(text: pd.Series) -> pd.DataFrame:
    t = text.fillna("").str.lower()
    return pd.DataFrame({
        k: t.str.replace(NEG + f"(?:{p})", " ", regex=True).str.contains(p, regex=True)
        for k, p in TAGS.items()
    })


def build_airbnb(barris: gpd.GeoDataFrame):
    lst = pd.read_csv(fetch(f"{IAB_BASE}/data/listings.csv.gz", RAW / "airbnb" / "listings.csv.gz"),
                      low_memory=False)
    rev = pd.read_csv(fetch(f"{IAB_BASE}/data/reviews.csv.gz", RAW / "airbnb" / "reviews.csv.gz"),
                      usecols=["listing_id", "date", "comments"], parse_dates=["date"])

    pts = gpd.GeoDataFrame(
        lst[["id", "name", "room_type", "accommodates", "price", "number_of_reviews", "number_of_reviews_ltm",
             "review_scores_rating", "review_scores_location", "license", "listing_url"]],
        geometry=gpd.points_from_xy(lst.longitude, lst.latitude), crs="EPSG:4326",
    )
    pts["price"] = pd.to_numeric(pts.price.astype(str).str.replace(r"[$,]", "", regex=True), errors="coerce")
    pts = gpd.sjoin(pts, barris[["CODI", "NOM", "geometry"]], how="left", predicate="within").drop(columns="index_right")

    since = pd.Timestamp(IAB_SNAPSHOT) - pd.DateOffset(years=REVIEW_YEARS)
    rev = rev[rev.date >= since]
    rev = rev.join(tag_reviews(rev.comments)).merge(pts[["id", "CODI"]], left_on="listing_id", right_on="id")
    by_rev = rev.groupby("CODI").agg(abnb_reviews_3y=("listing_id", "size"),
                                     **{f"abnb_{k}_pct": (k, "mean") for k in TAGS})
    for k in TAGS:
        by_rev[f"abnb_{k}_pct"] *= 100
    by_rev["abnb_quiet_net"] = by_rev.abnb_quiet_pct - by_rev.abnb_noisy_pct
    by_rev.loc[by_rev.abnb_reviews_3y < ABNB_MIN_REVIEWS, by_rev.columns.drop("abnb_reviews_3y")] = np.nan

    scored = pts[pts.number_of_reviews >= 3]
    by_lst = pts.groupby("CODI").agg(abnb_listings=("id", "size"),
                                     abnb_entire_pct=("room_type", lambda s: 100 * (s == "Entire home/apt").mean()),
                                     abnb_median_price=("price", "median"))
    by_lst["abnb_location_score"] = scored.groupby("CODI").apply(
        lambda g: wmean(g.review_scores_location, g.number_of_reviews), include_groups=False)
    return pts, by_lst.join(by_rev)


# ── Frontend export (042) ────────────────────────────────────────────────

def barri_vibe_json(vibe: pd.DataFrame) -> dict:
    """Card + score fields per barri and city medians (over barris)."""
    def r(x, nd=1):
        return None if pd.isna(x) else round(float(x), nd)

    probs = [k for k in PROBLEMS if k != "none"]
    med = vibe.median(numeric_only=True)
    return {
        "years": f"{ESM_YEARS.start}–{ESM_YEARS.stop - 1}",
        "city": {"satisf": r(med.esm_satisf, 2), "stay": r(med.esm_stay_pct),
                 "problems": {k: r(med[f"esm_prob_{k}_pct"]) for k in probs}},
        "barris": {
            row.BARRI: {
                "name": row.NOM, "n": int(row.esm_n), "lowN": bool(row.esm_n < ESM_LOW_N),
                "satisf": r(row.esm_satisf, 2), "satisfAdj": r(row.esm_satisf_adj, 2),
                "stay": r(row.esm_stay_pct), "delta": r(row.esm_satisf_delta),
                "problems": {k: r(getattr(row, f"esm_prob_{k}_pct")) for k in probs},
            }
            for row in vibe.itertuples()
        },
    }


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    barris = gpd.read_file(BARRIS)[["DISTRICTE", "BARRI", "GRANBARRI", "NOM", "geometry"]]
    barris["CODI"] = barris.DISTRICTE + barris.BARRI
    barris["area_km2"] = barris.to_crs(25831).area / 1e6
    barris["key"] = barris.NOM.map(norm)

    print("ESM …")
    esm_b, esm_gb, mapping = build_esm()
    esm_b["key"] = esm_b.esm_name.map(norm)
    missing = set(barris.key) - set(esm_b.key)
    assert not missing, f"ESM barris not matched to geometry: {missing}"

    print("Inside Airbnb …")
    pts, abnb = build_airbnb(barris)

    # ESM barri → gran barri (ESM merges some official codes, e.g. 18+19)
    gb_of = mapping.assign(key=mapping.BARRI.map(norm)).set_index("key").GRANBARRI

    vibe = barris.merge(esm_b, on="key").merge(abnb, left_on="CODI", right_index=True, how="left")
    vibe["esm_low_n"] = vibe.esm_n < ESM_LOW_N
    vibe["esm_satisf_adj"] = shrink(vibe.esm_satisf, vibe.esm_n,
                                    vibe.key.map(gb_of).map(esm_gb.set_index("esm_name").esm_satisf))
    assert vibe.esm_satisf_adj.notna().all(), "barri without gran barri satisfaction"
    vibe["abnb_listings"] = vibe.abnb_listings.fillna(0).astype(int)
    vibe["abnb_per_km2"] = vibe.abnb_listings / vibe.area_km2
    # > 0: guests rank the location higher than residents rank living there
    rated = vibe.abnb_quiet_pct.notna()
    vibe.loc[rated, "gap_guest_vs_resident"] = (vibe[rated].esm_satisf.rank(ascending=False)
                                               - vibe[rated].abnb_location_score.rank(ascending=False))
    vibe = vibe.drop(columns=["key", "esm_name"])

    # gran barri geometry from the ESM barri→granbarri pairs
    gb = barris.assign(esm_name=barris.key.map(gb_of)).dissolve("esm_name", aggfunc="first", as_index=False)
    gb = gb[["esm_name", "DISTRICTE", "geometry"]].merge(esm_gb, on="esm_name", how="left")
    assert gb.esm_n.notna().all(), "unmatched gran barri"

    GPKG.unlink(missing_ok=True)
    vibe.to_file(GPKG, layer="vibe_barri", driver="GPKG")
    gb.to_file(GPKG, layer="esm_granbarri", driver="GPKG")
    pts.to_file(GPKG, layer="airbnb_listings", driver="GPKG")
    vibe.drop(columns="geometry").to_csv(OUT_DIR / "vibe_barri.csv", index=False)
    gb.drop(columns="geometry").to_csv(OUT_DIR / "esm_granbarri.csv", index=False)
    print(f"→ {GPKG}  ({len(vibe)} barris, {len(gb)} grans barris, {len(pts)} listings)")

    FRONTEND_JSON.write_text(json.dumps(barri_vibe_json(vibe), ensure_ascii=False, separators=(",", ":")))
    print(f"→ {FRONTEND_JSON}  ({len(vibe)} barris)")


if __name__ == "__main__":
    main()
