"""Writes the downloadable Excel workbooks from the spec that build.mjs exports.

Run by build.mjs automatically when Python and openpyxl are available:
    python3 build/excel.py <spec.json> <out-dir>
Each workbook gets formulas, number formats, conditional formatting
(data bars and colour scales) and native Excel charts.
"""
import json
import sys
from pathlib import Path

from openpyxl import Workbook
from openpyxl.chart import BarChart, LineChart, Reference
from openpyxl.formatting.rule import ColorScaleRule, DataBarRule
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.utils import get_column_letter

IRIS = "5B3FD1"
INK = "22163D"
PANEL = "EFE8FA"
LAV = "C9B8FF"
ORCHID = "B5179E"
WHITE = "FFFFFF"

FMT = {
    "int": "#,##0",
    "eur": "€#,##0",
    "eur2": "€#,##0.00",
    "pct": '0.0"%"',
    "pct0": '0"%"',
    "pct2": '0.00"%"',
    "ratio": "0.0%",
    "pts": '+0.0" pts";-0.0" pts"',
    "n1": "0.0",
}
SERIES_COLORS = [IRIS, ORCHID, "8F7BE8", "D98BCB"]
thin = Side(style="thin", color=LAV)


def write_sheet(ws, sh):
    ws.sheet_view.showGridLines = False
    ncols = len(sh["head"])
    ws["A1"] = sh["title"]
    ws["A1"].font = Font(name="Calibri", size=16, bold=True, color=INK)
    if sh.get("note"):
        ws["A2"] = sh["note"]
        ws["A2"].font = Font(italic=True, color="5E5279")

    for i, k in enumerate(sh["kpis"]):
        col = get_column_letter(i + 1)
        lab, val = ws[f"{col}3"], ws[f"{col}4"]
        lab.value = k["label"]
        lab.font = Font(size=9, bold=True, color="5E5279")
        lab.fill = PatternFill("solid", fgColor=PANEL)
        val.value = k["f"] if k["f"] else k["v"]
        val.number_format = FMT.get(k["fmt"], "General")
        val.font = Font(size=16, bold=True, color=IRIS)
        val.fill = PatternFill("solid", fgColor=PANEL)
        val.border = Border(bottom=Side(style="thick", color=IRIS))

    hdr = sh["hdr"]
    for ci, h in enumerate(sh["head"]):
        cell = ws.cell(row=hdr, column=ci + 1, value=h["label"])
        cell.font = Font(bold=True, color=WHITE)
        cell.fill = PatternFill("solid", fgColor=INK)
        cell.alignment = Alignment(horizontal="center" if ci else "left", vertical="center", wrap_text=True)
    ws.row_dimensions[hdr].height = 30

    for ri, row in enumerate(sh["rows"]):
        r = sh["first"] + ri
        for ci, cell in enumerate(row):
            h = sh["head"][ci]
            value = cell["f"] if cell["f"] else cell["v"]
            c = ws.cell(row=r, column=ci + 1, value=value)
            if h.get("fmt"):
                c.number_format = FMT[h["fmt"]]
            c.border = Border(bottom=thin)
            if ci == 0:
                c.font = Font(bold=True, color=INK)

    first, last = sh["first"], sh["last"]
    # Conditional formatting: one rule per column, or one across the block.
    block = [ci for ci, h in enumerate(sh["head"]) if h.get("cf") == "scale-all"]
    if block:
        rng = f"{get_column_letter(block[0] + 1)}{first}:{get_column_letter(block[-1] + 1)}{last}"
        ws.conditional_formatting.add(rng, ColorScaleRule(start_type="min", start_color=WHITE, end_type="max", end_color=IRIS))
    for ci, h in enumerate(sh["head"]):
        col = get_column_letter(ci + 1)
        rng = f"{col}{first}:{col}{last}"
        if h.get("cf") == "bar":
            ws.conditional_formatting.add(rng, DataBarRule(start_type="min", end_type="max", color=LAV, showValue=True))
        elif h.get("cf") == "scale":
            ws.conditional_formatting.add(rng, ColorScaleRule(start_type="min", start_color=WHITE, end_type="max", end_color=LAV))

    for ci in range(max(ncols, len(sh["kpis"]))):
        ws.column_dimensions[get_column_letter(ci + 1)].width = 22 if ci == 0 else (9 if ncols > 8 else 17)
    ws.freeze_panes = ws.cell(row=hdr + 1, column=2)

    ch = sh.get("chart")
    if ch:
        if ch["type"] == "line":
            chart = LineChart()
        else:
            chart = BarChart()
            chart.type = "bar" if ch["type"] == "bar" else "col"
            chart.gapWidth = 60
        chart.title = ch["title"]
        chart.style = 10
        chart.height, chart.width = 8.5, 16
        chart.legend.position = "b"
        for n, si in enumerate(ch["series"]):
            ref = Reference(ws, min_col=si + 1, min_row=hdr, max_row=last)
            chart.add_data(ref, titles_from_data=True)
            s = chart.series[-1]
            color = SERIES_COLORS[n % len(SERIES_COLORS)]
            if ch["type"] == "line":
                s.graphicalProperties.line.solidFill = color
                s.graphicalProperties.line.width = 28000
                s.smooth = False
            else:
                s.graphicalProperties.solidFill = color
                s.graphicalProperties.line.solidFill = color
        chart.set_categories(Reference(ws, min_col=ch["cat"] + 1, min_row=first, max_row=last))
        if len(ch["series"]) == 1:
            chart.legend = None
        ws.add_chart(chart, f"{get_column_letter(ncols + 2)}{hdr}")


def main():
    spec = json.loads(Path(sys.argv[1]).read_text(encoding="utf-8"))
    out = Path(sys.argv[2])
    out.mkdir(parents=True, exist_ok=True)
    for slug, wb_spec in spec.items():
        wb = Workbook()
        wb.remove(wb.active)
        for sh in wb_spec["sheets"]:
            write_sheet(wb.create_sheet(sh["name"]), sh)
        wb.properties.creator = wb_spec.get("author", "")
        wb.properties.title = wb_spec["sheets"][0]["title"]
        wb.save(out / f"{slug}.xlsx")
    print(f"Wrote {len(spec)} workbooks to {out}")


if __name__ == "__main__":
    main()
