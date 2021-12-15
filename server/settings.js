// add your API key here
// Dev Key!
const wiener_linien_api_key = process.env.WIENER_LINIEN_API_KEY;

// define all RBLs of stops you want to display
const wiener_linien_api_ids = [
  "4904",    // Landstraße - U3 - Ottakring
  "4913",    // Landstraße - U3 - Simmering
  "4412",    // Landstraße - U4 - Hütteldorf
  "4425",    // Landstraße - U4 - Heiligenstadt
];

const wiener_linien_api_url = 'http://www.wienerlinien.at/ogd_realtime/monitor' +
  '?activateTrafficInfo=stoerunglang' +
  `&sender=${wiener_linien_api_key}`+
  '&rbl=' + wiener_linien_api_ids.join("&rbl=");

// define filters to exclude specific departures from the monitor
// currently you can exclude lines as a whole or only at certain stops
const wiener_linien_filters = [
  {
    line: ['VRT'],  // excludes whole line (VRT = tourist line)
  },
  {
    line: ['D', '1', '71'],
    stop: ['Rathausplatz/Burgtheater'], // excludes lines only at given stop
  },
  {
    line: ['2'],
    stop: ['Stadiongasse/Parlament'],
  },
];

const oebb_api_ids = [
  '001290302' // Wien Mitte-Landstraße Bahnhof (U)
]

const oebb_product_filter = "0000110000000000"; // S-Bahn and Trains

// define your current location
// const location_coordinate = 'xx.xxxxxxx,xx.xxxxxxx'

// define OSRM server for routing to stops. Empty string to disable feature
// const osrm_api_url = 'http://router.project-osrm.org/route/v1/foot/' + location_coordinate + ';'
const osrm_api_url = ''

// define a static fallback walk duration
const fallback_walk_duration = 180

module.exports = {
  'wiener_linien_api_url' : wiener_linien_api_url,
  'wiener_linien_filters' : wiener_linien_filters,
  'api_cache_msec'        : 6000,   // cache API responses for this many milliseconds; default: 6s
  'listen_port'           : process.env.PORT || 8080,   // port to listen on
  'osrm_api_url'          : osrm_api_url,
  'oebb_api_ids'          : oebb_api_ids,
  'oebb_product_filter'   : oebb_product_filter,
  'fallback_walk_duration'  : fallback_walk_duration
};
