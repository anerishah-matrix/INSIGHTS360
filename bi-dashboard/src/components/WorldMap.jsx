import { useEffect, useMemo, useRef, useState } from "react";
import { Chart } from "chart.js/auto";
import { ChoroplethController, GeoFeature, ColorScale, ProjectionScale } from "chartjs-chart-geo";
import { feature } from "topojson-client";

Chart.register(ChoroplethController, GeoFeature, ColorScale, ProjectionScale);

export default function WorldMap({ rawData }) {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);
  const [loading, setLoading] = useState(true);

  // COUNTRY-wise totals (from your file column "COUNTRY")
  const countryTotals = useMemo(() => {
    const acc = {};
    for (const row of rawData) {
      const country = String(row["COUNTRY"] || "").trim();
      if (!country) continue;
      const sales = Number(row["ASSESSABLE VAL INR"] || 0);
      acc[country.toUpperCase()] = (acc[country.toUpperCase()] || 0) + sales;
    }
    return acc;
  }, [rawData]);

  useEffect(() => {
    let isMounted = true;

    async function draw() {
      setLoading(true);

      // Fetch topojson world map
      const res = await fetch("https://unpkg.com/world-atlas@2/countries-110m.json");
      const world = await res.json();

      if (!isMounted) return;

      const countries = feature(world, world.objects.countries).features;

      // Try match by "name" if present (some builds include it), else we keep 0.
      // We'll also allow a small mapping dictionary later if needed.
      const data = countries.map((f) => {
        const name = String(f.properties?.name || "").toUpperCase();
        const value = countryTotals[name] || 0;
        return { feature: f, value };
      });

      // Destroy old chart
      if (chartRef.current) chartRef.current.destroy();

      chartRef.current = new Chart(canvasRef.current, {
        type: "choropleth",
        data: {
          labels: countries.map((d) => d.properties?.name ?? "Country"),
          datasets: [
            {
              label: "Sales (INR)",
              data,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: (ctx) => {
                  const v = ctx.raw?.value ?? 0;
                  return `₹ ${Number(v).toLocaleString("en-IN")}`;
                },
              },
            },
          },
          scales: {
            projection: {
              axis: "x",
              projection: "equalEarth",
            },
            color: {
              axis: "x",
              quantize: 5,
              legend: {
                position: "bottom-right",
                align: "bottom",
              },
            },
          },
        },
      });

      setLoading(false);
    }

    draw();

    return () => {
      isMounted = false;
      if (chartRef.current) chartRef.current.destroy();
    };
  }, [countryTotals]);

  return (
    <div className="bg-white p-4 rounded shadow">
      <h2 className="text-lg font-semibold mb-3">World Map: Country-wise Sales</h2>

      {loading && <p className="text-sm text-gray-500 mb-2">Loading map…</p>}

      <div className="h-[520px] w-full">
        <canvas ref={canvasRef} />
      </div>

      <p className="text-xs text-gray-400 mt-2">
        Map matches by country name. If your COUNTRY values differ (e.g. USA vs UNITED STATES),
        we’ll add a small normalizer mapping.
      </p>
    </div>
  );
}
