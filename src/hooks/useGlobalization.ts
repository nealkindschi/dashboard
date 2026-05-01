import { useState, useEffect } from 'react';
import { getGroups, getGscData } from '../lib/api';
import { AREA_COUNTRIES } from '../lib/constants';

interface Group {
  id: number;
  name: string;
  patterns: string;
  area: string | null;
  language: string | null;
  members?: string[];
}

interface AreaData {
  name: string;
  countries: Array<{ country: string; clicks: number; impressions: number }>;
  totalClicks: number;
  totalImpressions: number;
}

export function useGlobalization() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [areas, setAreas] = useState<AreaData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      getGroups(),
      getGscData(30, 'country'),
    ]).then(([g, gscData]) => {
      setGroups(g);

      const countryData = (gscData.items || []).filter(
        (item: any) => item.name && item.name.length === 3
      );

      const areaResults: AreaData[] = Object.entries(AREA_COUNTRIES).map(([name, countryCodes]) => {
        const countryMatches = countryData
          .filter((d: any) => countryCodes.includes(d.name))
          .slice(0, 5)
          .map((d: any) => ({
            country: d.name,
            clicks: d.clicks || 0,
            impressions: d.impressions || 0,
          }))
          .sort((a: any, b: any) => b.clicks - a.clicks);

        return {
          name,
          countries: countryMatches,
          totalClicks: countryMatches.reduce((s: number, c: any) => s + c.clicks, 0),
          totalImpressions: countryMatches.reduce((s: number, c: any) => s + c.impressions, 0),
        };
      });

      setAreas(areaResults);
    })
    .catch(console.error)
    .finally(() => setLoading(false));
  }, []);

  return { groups, areas, loading };
}
