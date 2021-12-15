const settings = require(__dirname + '/settings.js');
const oebb = require('oebb-api');
const moment = require('moment');
const { type } = require('express/lib/response');

exports.getData = async () => {
    return await new Promise(async resolve => {
		let departures = []
		for (let i = 0; i < settings.oebb_api_ids.length; i++) {
			evaId = settings.oebb_api_ids[i];
			const options = oebb.getStationBoardDataOptions();
			options.productsFilter=settings.oebb_product_filter
			options.evaId=evaId
			const results = await oebb.getStationBoardData(options);
			departures = [].concat(departures, convert(results));
		}
		resolve({ status: 'ok', departures: departures, warnings: [] })
      });
}

const convert = (oebbResults) => {
	const stop = oebbResults.stationName;
	return oebbResults.journey.map(x => {
		return {
			'stop': stop,
			'coordinates': '', // TODO
			'line': x.pr.replace(' ', ''),
			'type': "TRAIN",
			'towards': x.lastStop,
			'barrierFree': false, // TODO
			'time': moment(x.ti, "HH:mm").toDate().toISOString(),
			'timePlanned': moment(x.ti, "HH:mm").toDate().toISOString(), // TODO
			'timeReal': moment(x.ti, "HH:mm").toDate().toISOString(), // TODO
			'walkDuration': settings.fallback_walk_duration, // TODO
			'walkStatus': settings.fallback_walk_duration // TODO
		}
	});
}