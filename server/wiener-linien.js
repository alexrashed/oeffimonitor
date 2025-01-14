const http = require('http')
const url = require('url')
const settings = require(__dirname + '/settings.js');
const package = require(__dirname + '/../package.json');
let walkcache = []

const errorHandler = (error, cb) => {
	console.error(error);
	cb({
		status: 'error',
		error: error
	});
}

exports.getData = async () => {
    return await new Promise(resolve => {
        http.get(settings.wiener_linien_api_url, (response) => {
            let data = '';
            response.on('data', (chunk) => data += chunk);
            response.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    flatten(json, resolve);
                } catch (e) {
                    errorHandler('API response invalid JSON', resolve);
                }
            });
            response.on('error', (err) => errorHandler('API response failed', resolve));
        }).on('error', (err) => errorHandler('API request failed', resolve));
      });
}

const getOSRM = (coordinates) => {
	if (!settings.osrm_api_url) {
		// no OSRM server defined
		return;
	}

	const findCoordinates = (element) => {
		return element.coordinates[0] === coordinates[0] &&
			element.coordinates[1] === coordinates[1];
	}

	if (walkcache.find(findCoordinates)) {
		return walkcache.find(findCoordinates).duration
	}

	console.log('OSRM: new request for', coordinates)
	const osrm_url = url.parse(settings.osrm_api_url +
		coordinates[0] + ',' +
		coordinates[1] + '?overview=false');

	let duration;

	http.get({
		protocol: osrm_url.protocol,
		host: osrm_url.host,
		path: osrm_url.path,
		headers: {
			'User-Agent': 'Öffimonitor/' + package.version + ' <https://github.com/metalab/oeffimonitor>',
		}
	}, (response) => {
		let data = '';
		response.on('data', (chunk) => data += chunk);
		response.on('end', () => {
			try {
				duration = JSON.parse(data).routes[0].duration;
				if (!walkcache.find(findCoordinates)) {
					walkcache.push({ coordinates: coordinates, duration: duration })
				}
			} catch (e) {
				console.error('OSRM API response invalid JSON', data);
			}
		});
		response.on('error', (err) => console.error(err));
	}).on('error', (err) => console.error(err));

	return duration;
}

const flatten = (json, cb) => {
	let data = [];
	let warnings = [];
	let now = new Date();
	json.data.monitors.map(monitor => {
		monitor.lines.map(line => {

			// filter stuff as defined in settings.filters
			if (settings.filters && !!settings.filters.find(filter => {
				const keys = Object.keys(filter);
				// check if there is a filter with only stop and line defined
				if (keys.length === 2 && !!filter.stop && !!filter.line) {
					// filter if both stop and line match
					return filter.stop.indexOf(monitor.locationStop.properties.title) > -1
						&& filter.line.indexOf(line.name) > -1;
				}
				// else check if there is a filter for the whole line
				return keys.length === 1 && keys[0] === 'line' && filter.line.indexOf(line.name) > -1
			})) {
				return;
			}

			line.departures.departure.map(departure => {
				// calculate most accurate known departure time
				let time;

				if (departure.departureTime.timeReal) {
					// if realtime data is available, use that
					time = new Date(departure.departureTime.timeReal);
				} else if (departure.departureTime.timePlanned) {
					// if not, use scheduled data
					time = new Date(departure.departureTime.timePlanned);
				} else if (line.towards.indexOf('NÄCHSTER ZUG') > -1 &&
						line.towards.indexOf(' MIN') > -1) {
					// if that's not available, try to find departure time elsewhere
					let countdown = line.towards.split(' MIN')[0].substr(-2, 2); // grab last two chars before ' MIN'
					time = new Date();
					time.setMinutes(time.getMinutes() + parseInt(countdown));
				} else {
					console.warn({
						'stop': monitor.locationStop.properties.title,
						'departure': departure
					});
					return; // connection does not have any time information -> log & skip
				}

				let walkDuration = getOSRM(monitor.locationStop.geometry.coordinates);
				let differenceToNow = (time.getTime() - now.getTime()) / 1000;
				let walkStatus;

				if (typeof walkDuration === 'undefined') {
					// no walkDuration, no walkStatus
				} else if (walkDuration * 0.9 > differenceToNow) {
					walkStatus = 'too late';
				} else if (walkDuration + 2 * 60 > differenceToNow) {
					walkStatus = 'hurry';
				} else if (walkDuration + 5 * 60 > differenceToNow) {
					walkStatus = 'soon';
				}

				time = time.toISOString();

				data.push({
					'stop': monitor.locationStop.properties.title,
					'coordinates': monitor.locationStop.geometry.coordinates,
					'line': departure.vehicle && departure.vehicle.name ? departure.vehicle.name : line.name,
					'type': departure.vehicle && departure.vehicle.type ? departure.vehicle.type : line.type,
					'towards': departure.vehicle && departure.vehicle.towards ? departure.vehicle.towards : line.towards,
					'barrierFree': departure.vehicle && departure.vehicle.barrierFree ? departure.vehicle.barrierFree : line.barrierFree,
					'time': time,
					'timePlanned': departure.departureTime.timePlanned,
					'timeReal': departure.departureTime.timeReal,
					'countdown': departure.departureTime.countdown,
					'walkDuration': walkDuration || settings.fallback_walk_duration,
					'walkStatus': walkStatus || settings.fallback_walk_duration
				});
			})
		})
	})

	data.sort((a, b) => {
		return (a.time < b.time) ? -1 : ((a.time > b.time) ? 1 : 0);
	})

	if (json.data.trafficInfos) {
		warnings = json.data.trafficInfos.map(trafficInfo => {
			return { title: trafficInfo.title, description: trafficInfo.description };
		})
	}

	cb({ status: 'ok', departures: data, warnings: warnings });
}