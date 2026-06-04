// ============================================================================
// City zones — named localities within each supported city.
// ----------------------------------------------------------------------------
// Mirrors ml-service/zones.py so the admin Triggers panel can offer a zone
// dropdown. These coordinates are used as the pin center when the admin
// fires a zone-scoped disruption; the actual H3 cell is computed from them
// at fire time.
// ============================================================================

export interface CityZone {
  zone_id: string;
  name: string;
  lat: number;
  lng: number;
  risk_score: number;        // 0.0–1.0 (informational; used by UBI, not triggers)
  risk_factors: string[];
}

export const CITY_ZONES: Record<string, CityZone[]> = {
  mumbai: [
    { zone_id: 'mum_andheri', name: 'Andheri', lat: 19.1197, lng: 72.8464, risk_score: 0.75, risk_factors: ['waterlogging', 'traffic_congestion'] },
    { zone_id: 'mum_bandra', name: 'Bandra', lat: 19.0596, lng: 72.8295, risk_score: 0.50, risk_factors: ['coastal_flooding'] },
    { zone_id: 'mum_dadar', name: 'Dadar', lat: 19.0178, lng: 72.8478, risk_score: 0.65, risk_factors: ['waterlogging', 'old_drainage'] },
    { zone_id: 'mum_kurla', name: 'Kurla', lat: 19.0726, lng: 72.8794, risk_score: 0.85, risk_factors: ['severe_waterlogging', 'low_lying'] },
    { zone_id: 'mum_malad', name: 'Malad', lat: 19.1870, lng: 72.8484, risk_score: 0.60, risk_factors: ['waterlogging'] },
    { zone_id: 'mum_powai', name: 'Powai', lat: 19.1176, lng: 72.9060, risk_score: 0.40, risk_factors: ['lake_overflow'] },
    { zone_id: 'mum_colaba', name: 'Colaba', lat: 18.9067, lng: 72.8147, risk_score: 0.55, risk_factors: ['coastal', 'storm_surge'] },
    { zone_id: 'mum_bkc', name: 'BKC', lat: 19.0660, lng: 72.8691, risk_score: 0.35, risk_factors: ['modern_drainage'] },
    { zone_id: 'mum_sion', name: 'Sion', lat: 19.0430, lng: 72.8624, risk_score: 0.80, risk_factors: ['severe_waterlogging', 'low_lying'] },
    { zone_id: 'mum_goregaon', name: 'Goregaon', lat: 19.1663, lng: 72.8526, risk_score: 0.55, risk_factors: ['moderate_flooding'] },
  ],
  delhi: [
    { zone_id: 'del_connaught', name: 'Connaught Place', lat: 28.6315, lng: 77.2167, risk_score: 0.50, risk_factors: ['traffic', 'aqi_hotspot'] },
    { zone_id: 'del_anand_vihar', name: 'Anand Vihar', lat: 28.6469, lng: 77.3164, risk_score: 0.90, risk_factors: ['worst_aqi', 'industrial'] },
    { zone_id: 'del_dwarka', name: 'Dwarka', lat: 28.5921, lng: 77.0460, risk_score: 0.45, risk_factors: ['moderate_aqi'] },
    { zone_id: 'del_rohini', name: 'Rohini', lat: 28.7495, lng: 77.0565, risk_score: 0.70, risk_factors: ['aqi_hotspot', 'stubble_burning_exposure'] },
    { zone_id: 'del_ito', name: 'ITO', lat: 28.6289, lng: 77.2406, risk_score: 0.75, risk_factors: ['traffic_congestion', 'yamuna_flooding'] },
    { zone_id: 'del_nehru_place', name: 'Nehru Place', lat: 28.5491, lng: 77.2533, risk_score: 0.55, risk_factors: ['moderate_aqi'] },
    { zone_id: 'del_mundka', name: 'Mundka', lat: 28.6836, lng: 77.0295, risk_score: 0.85, risk_factors: ['industrial_aqi', 'waterlogging'] },
    { zone_id: 'del_saket', name: 'Saket', lat: 28.5244, lng: 77.2066, risk_score: 0.40, risk_factors: ['residential', 'moderate_aqi'] },
  ],
  bangalore: [
    { zone_id: 'blr_whitefield', name: 'Whitefield', lat: 12.9698, lng: 77.7500, risk_score: 0.70, risk_factors: ['waterlogging', 'poor_drainage'] },
    { zone_id: 'blr_koramangala', name: 'Koramangala', lat: 12.9352, lng: 77.6245, risk_score: 0.55, risk_factors: ['lake_overflow'] },
    { zone_id: 'blr_electronic_city', name: 'Electronic City', lat: 12.8399, lng: 77.6770, risk_score: 0.45, risk_factors: ['moderate_flooding'] },
    { zone_id: 'blr_marathahalli', name: 'Marathahalli', lat: 12.9591, lng: 77.7019, risk_score: 0.75, risk_factors: ['severe_waterlogging', 'traffic'] },
    { zone_id: 'blr_hsr_layout', name: 'HSR Layout', lat: 12.9116, lng: 77.6474, risk_score: 0.50, risk_factors: ['moderate_flooding'] },
    { zone_id: 'blr_hebbal', name: 'Hebbal', lat: 13.0358, lng: 77.5970, risk_score: 0.65, risk_factors: ['lake_overflow', 'traffic'] },
    { zone_id: 'blr_mg_road', name: 'MG Road', lat: 12.9716, lng: 77.6074, risk_score: 0.35, risk_factors: ['good_drainage'] },
  ],
  chennai: [
    { zone_id: 'chn_velachery', name: 'Velachery', lat: 12.9815, lng: 80.2180, risk_score: 0.90, risk_factors: ['severe_flooding', 'low_lying'] },
    { zone_id: 'chn_adyar', name: 'Adyar', lat: 13.0012, lng: 80.2565, risk_score: 0.75, risk_factors: ['river_flooding', 'coastal'] },
    { zone_id: 'chn_t_nagar', name: 'T. Nagar', lat: 13.0418, lng: 80.2341, risk_score: 0.60, risk_factors: ['waterlogging'] },
    { zone_id: 'chn_tambaram', name: 'Tambaram', lat: 12.9249, lng: 80.1000, risk_score: 0.70, risk_factors: ['flooding', 'low_lying'] },
    { zone_id: 'chn_marina', name: 'Marina Beach', lat: 13.0500, lng: 80.2824, risk_score: 0.85, risk_factors: ['storm_surge', 'cyclone_direct'] },
    { zone_id: 'chn_anna_nagar', name: 'Anna Nagar', lat: 13.0850, lng: 80.2101, risk_score: 0.45, risk_factors: ['moderate'] },
  ],
  pune: [
    { zone_id: 'pun_kothrud', name: 'Kothrud', lat: 18.5074, lng: 73.8077, risk_score: 0.40, risk_factors: ['elevated_terrain'] },
    { zone_id: 'pun_hadapsar', name: 'Hadapsar', lat: 18.5089, lng: 73.9260, risk_score: 0.65, risk_factors: ['waterlogging'] },
    { zone_id: 'pun_sinhagad_rd', name: 'Sinhagad Road', lat: 18.4780, lng: 73.8170, risk_score: 0.55, risk_factors: ['hill_runoff'] },
    { zone_id: 'pun_pimpri', name: 'Pimpri-Chinchwad', lat: 18.6298, lng: 73.7997, risk_score: 0.60, risk_factors: ['river_proximity', 'industrial'] },
    { zone_id: 'pun_katraj', name: 'Katraj', lat: 18.4575, lng: 73.8685, risk_score: 0.70, risk_factors: ['low_lying', 'dam_overflow_risk'] },
    { zone_id: 'pun_hinjewadi', name: 'Hinjewadi', lat: 18.5912, lng: 73.7390, risk_score: 0.50, risk_factors: ['new_development'] },
  ],
  hyderabad: [
    { zone_id: 'hyd_hitec_city', name: 'HITEC City', lat: 17.4435, lng: 78.3772, risk_score: 0.45, risk_factors: ['moderate_flooding'] },
    { zone_id: 'hyd_lb_nagar', name: 'LB Nagar', lat: 17.3457, lng: 78.5522, risk_score: 0.70, risk_factors: ['waterlogging', 'low_lying'] },
    { zone_id: 'hyd_kukatpally', name: 'Kukatpally', lat: 17.4849, lng: 78.3842, risk_score: 0.60, risk_factors: ['lake_overflow'] },
    { zone_id: 'hyd_old_city', name: 'Old City/Charminar', lat: 17.3616, lng: 78.4747, risk_score: 0.75, risk_factors: ['old_drainage', 'musi_river'] },
    { zone_id: 'hyd_gachibowli', name: 'Gachibowli', lat: 17.4401, lng: 78.3489, risk_score: 0.35, risk_factors: ['modern_infra'] },
  ],
  kolkata: [
    { zone_id: 'kol_salt_lake', name: 'Salt Lake/Bidhannagar', lat: 22.5800, lng: 88.4100, risk_score: 0.55, risk_factors: ['waterlogging'] },
    { zone_id: 'kol_howrah', name: 'Howrah', lat: 22.5958, lng: 88.2636, risk_score: 0.80, risk_factors: ['river_flooding', 'cyclone_exposure'] },
    { zone_id: 'kol_esplanade', name: 'Esplanade', lat: 22.5559, lng: 88.3520, risk_score: 0.60, risk_factors: ['waterlogging', 'traffic'] },
    { zone_id: 'kol_new_town', name: 'New Town/Rajarhat', lat: 22.5950, lng: 88.4843, risk_score: 0.65, risk_factors: ['low_lying', 'marshy'] },
    { zone_id: 'kol_diamond_harbour', name: 'Diamond Harbour Rd', lat: 22.4700, lng: 88.1800, risk_score: 0.85, risk_factors: ['cyclone_direct', 'storm_surge'] },
  ],
  ahmedabad: [
    { zone_id: 'ahm_sg_highway', name: 'SG Highway', lat: 23.0300, lng: 72.5050, risk_score: 0.40, risk_factors: ['moderate'] },
    { zone_id: 'ahm_bapunagar', name: 'Bapunagar', lat: 23.0500, lng: 72.6300, risk_score: 0.70, risk_factors: ['sabarmati_flooding', 'low_lying'] },
    { zone_id: 'ahm_narol', name: 'Narol', lat: 22.9780, lng: 72.6100, risk_score: 0.65, risk_factors: ['industrial', 'flooding'] },
    { zone_id: 'ahm_satellite', name: 'Satellite', lat: 23.0150, lng: 72.5100, risk_score: 0.35, risk_factors: ['good_drainage'] },
    { zone_id: 'ahm_vatva', name: 'Vatva', lat: 22.9700, lng: 72.6400, risk_score: 0.75, risk_factors: ['industrial', 'severe_flooding'] },
  ],
  jaipur: [
    { zone_id: 'jai_mansarovar', name: 'Mansarovar', lat: 26.8648, lng: 75.7603, risk_score: 0.45, risk_factors: ['moderate'] },
    { zone_id: 'jai_malviya_nagar', name: 'Malviya Nagar', lat: 26.8549, lng: 75.8009, risk_score: 0.40, risk_factors: ['residential'] },
    { zone_id: 'jai_sanganer', name: 'Sanganer', lat: 26.8181, lng: 75.7870, risk_score: 0.60, risk_factors: ['low_lying', 'dravyavati_river'] },
    { zone_id: 'jai_walled_city', name: 'Walled City', lat: 26.9239, lng: 75.8267, risk_score: 0.65, risk_factors: ['old_drainage', 'congestion'] },
  ],
  lucknow: [
    { zone_id: 'lko_gomti_nagar', name: 'Gomti Nagar', lat: 26.8500, lng: 81.0100, risk_score: 0.55, risk_factors: ['gomti_river_proximity'] },
    { zone_id: 'lko_aliganj', name: 'Aliganj', lat: 26.8895, lng: 80.9470, risk_score: 0.50, risk_factors: ['moderate'] },
    { zone_id: 'lko_charbagh', name: 'Charbagh', lat: 26.8590, lng: 80.9223, risk_score: 0.70, risk_factors: ['waterlogging', 'old_drainage'] },
    { zone_id: 'lko_indira_nagar', name: 'Indira Nagar', lat: 26.8715, lng: 80.9850, risk_score: 0.45, risk_factors: ['moderate'] },
    { zone_id: 'lko_husainabad', name: 'Husainabad', lat: 26.8720, lng: 80.9120, risk_score: 0.75, risk_factors: ['severe_waterlogging', 'old_city'] },
  ],
};

export function getZonesForCity(citySlug: string): CityZone[] {
  return CITY_ZONES[citySlug] ?? [];
}

export function getZoneById(zoneId: string): CityZone | undefined {
  for (const zones of Object.values(CITY_ZONES)) {
    const found = zones.find((z) => z.zone_id === zoneId);
    if (found) return found;
  }
  return undefined;
}
