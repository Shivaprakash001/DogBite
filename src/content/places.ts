// City → area list for the hostel picker (§7.2). Free text is only stored when an
// area is missing from this list. TODO(content): extend with Stayo's operating areas.

export const CITIES: Record<string, string[]> = {
  Hyderabad: [
    'Ameerpet',
    'Dilsukhnagar',
    'Gachibowli',
    'Ghatkesar',
    'Hitech City',
    'Himayatnagar',
    'Kompally',
    'Kondapur',
    'Kukatpally',
    'LB Nagar',
    'Madhapur',
    'Maisammaguda',
    'Miyapur',
    'Narayanaguda',
    'Secunderabad',
    'SR Nagar',
    'Tarnaka',
    'Uppal',
  ],
  Bengaluru: ['BTM Layout', 'Electronic City', 'HSR Layout', 'Koramangala', 'Marathahalli', 'Whitefield'],
  Chennai: ['Guindy', 'Tambaram', 'Velachery', 'Vadapalani'],
  Pune: ['Hinjewadi', 'Kothrud', 'Viman Nagar', 'Wakad'],
  Delhi: ['Kamla Nagar', 'Laxmi Nagar', 'Mukherjee Nagar', 'Rajinder Nagar'],
  Kota: ['Landmark City', 'Rajeev Gandhi Nagar', 'Talwandi'],
};

export const DEFAULT_CITY = 'Hyderabad';

// TODO(content): starter colleges; real list should come from Stayo.
export const COLLEGES: { name: string; city: string }[] = [
  { name: 'Malla Reddy Engineering College', city: 'Hyderabad' },
  { name: 'MLR Institute of Technology', city: 'Hyderabad' },
  { name: 'Narsimha Reddy Engineering College', city: 'Hyderabad' },
  { name: 'CMR College of Engineering', city: 'Hyderabad' },
  { name: 'JNTU Hyderabad', city: 'Hyderabad' },
  { name: 'Osmania University', city: 'Hyderabad' },
  { name: 'VNR VJIET', city: 'Hyderabad' },
  { name: 'CBIT', city: 'Hyderabad' },
  { name: 'IIIT Hyderabad', city: 'Hyderabad' },
  { name: 'Christ University', city: 'Bengaluru' },
  { name: 'Anna University', city: 'Chennai' },
  { name: 'Delhi University (North Campus)', city: 'Delhi' },
];

export function slugifyArea(area: string): string {
  return area
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}
